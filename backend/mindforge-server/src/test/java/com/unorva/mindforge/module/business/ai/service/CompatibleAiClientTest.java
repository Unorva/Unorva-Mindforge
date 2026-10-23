package com.unorva.mindforge.module.business.ai.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.client.CompatibleAiClient;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/** Protocol tests use a local compatible endpoint and never contact a paid AI service. */
class CompatibleAiClientTest {
    private final JsonMapper objectMapper = JsonMapper.builder().build();
    private HttpServer server;
    private String baseUrl;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void sendsConfiguredDestinationAndReturnsActualProviderText() {
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<JsonNode> payload = new AtomicReference<>();
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
                    payload.set(objectMapper.readTree(exchange.getRequestBody().readAllBytes()));
                    byte[] response =
                            "{\"choices\":[{\"message\":{\"content\":\"真实服务返回内容\"}}]}".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        String reply =
                client().complete(
                                new ProviderCredentialBO(baseUrl, "test-user-supplied-key"),
                                settings(),
                                List.of(Map.of("role", "user", "content", "你好")),
                                false);
        assertEquals("真实服务返回内容", reply);
        assertEquals("Bearer test-user-supplied-key", authorization.get());
        assertEquals("custom-model", payload.get().path("model").asString());
        assertEquals(2048, payload.get().path("max_tokens").asInt());
        assertFalse(payload.get().path("stream").asBoolean());
    }

    @Test
    void connectionTestLimitsOutputTokens() {
        AtomicReference<Integer> maxTokens = new AtomicReference<>();
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    maxTokens.set(
                            objectMapper.readTree(exchange.getRequestBody().readAllBytes()).path("max_tokens").asInt());
                    byte[] response =
                            "{\"choices\":[{\"message\":{\"content\":\"OK\"}}]}".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        client().complete(
                        new ProviderCredentialBO(baseUrl, "test-key"),
                        settings(),
                        List.of(Map.of("role", "user", "content", "OK")),
                        true);
        assertEquals(16, maxTokens.get());
    }

    @Test
    void connectionProbeAcceptsGenuineReasoningButChatStillRequiresAnswerText() {
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    exchange.getRequestBody().readAllBytes();
                    byte[] response =
                            "{\"choices\":[{\"message\":{\"content\":\"\",\"reasoning_content\":\"让我检查连接\"}}]}"
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        ProviderCredentialBO credential = new ProviderCredentialBO(baseUrl, "test-key");
        List<Map<String, String>> messages = List.of(Map.of("role", "user", "content", "OK"));
        assertEquals("让我检查连接", client().complete(credential, settings(), messages, true));
        assertThrows(BusinessException.class, () -> client().complete(credential, settings(), messages, false));
    }

    @Test
    void rejectsOversizedBodyBeforeReturningAReply() {
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    byte[] response = "x".repeat(1024 * 1024 + 100).getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    try {
                        exchange.getResponseBody().write(response);
                    } catch (IOException ignored) {
                        // Client cancellation is expected once the response crosses the size limit.
                    } finally {
                        exchange.close();
                    }
                });
        assertThrows(
                BusinessException.class,
                () ->
                        client().complete(
                                        new ProviderCredentialBO(baseUrl, "test-key"),
                                        settings(),
                                        List.of(Map.of("role", "user", "content", "hello")),
                                        false));
    }

    @Test
    void providerErrorsNeverExposeCredentialOrResponseBody() {
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    byte[] response = "echoed-secret-test-key".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(401, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        BusinessException exception =
                assertThrows(
                        BusinessException.class,
                        () ->
                                client().complete(
                                                new ProviderCredentialBO(baseUrl, "test-key"),
                                                settings(),
                                                List.of(Map.of("role", "user", "content", "hello")),
                                                false));
        assertTrue(exception.getMessage().contains("认证"));
        assertFalse(exception.getMessage().contains("test-key"));
        assertFalse(exception.getMessage().contains("echoed-secret"));
    }

    @Test
    void doesNotFollowRedirectWithProviderCredential() {
        AtomicReference<Boolean> redirected = new AtomicReference<>(false);
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    exchange.getResponseHeaders().set("Location", baseUrl + "/other");
                    exchange.sendResponseHeaders(302, -1);
                    exchange.close();
                });
        server.createContext(
                "/v1/other",
                exchange -> {
                    redirected.set(true);
                    exchange.sendResponseHeaders(200, -1);
                    exchange.close();
                });
        assertThrows(
                BusinessException.class,
                () ->
                        client().complete(
                                        new ProviderCredentialBO(baseUrl, "test-key"),
                                        settings(),
                                        List.of(Map.of("role", "user", "content", "hello")),
                                        false));
        assertFalse(redirected.get());
    }

    @Test
    void rejectsMissingTextRatherThanFabricatingAReply() {
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    byte[] response = "{\"choices\":[]}".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        assertThrows(
                BusinessException.class,
                () ->
                        client().complete(
                                        new ProviderCredentialBO(baseUrl, "test-key"),
                                        settings(),
                                        List.of(Map.of("role", "user", "content", "hello")),
                                        false));
    }

    private CompatibleAiClient client() {
        return new CompatibleAiClient(objectMapper);
    }

    private AiSettingsVO settings() {
        return new AiSettingsVO(
                "兼容接口",
                "custom-model",
                new BigDecimal("0.7"),
                2048,
                "简体中文",
                "",
                new AiFeaturesDTO(false, false, false, false),
                baseUrl,
                "",
                true);
    }
}
