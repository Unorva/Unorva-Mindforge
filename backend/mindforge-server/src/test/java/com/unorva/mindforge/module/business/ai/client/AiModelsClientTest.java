package com.unorva.mindforge.module.business.ai.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

class AiModelsClientTest {
    private HttpServer server;
    private String baseUrl;
    private final AiModelsClient client = new AiModelsClient(JsonMapper.builder().build());

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
    void readsProviderModelIdsAndSendsCredentialOnlyInAuthorization() {
        AtomicReference<String> authorization = new AtomicReference<>();
        server.createContext(
                "/v1/models",
                exchange -> {
                    authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
                    assertEquals("GET", exchange.getRequestMethod());
                    byte[] body =
                            "{\"data\":[{\"id\":\"deepseek-chat\"},{\"id\":\"deepseek-reasoner\"},{\"id\":\"deepseek-chat\"},{\"id\":\"\"}]}"
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                    exchange.close();
                });
        assertEquals(
                List.of("deepseek-chat", "deepseek-reasoner"),
                client.list(new ProviderCredentialBO(baseUrl, "test-provider-key")));
        assertEquals("Bearer test-provider-key", authorization.get());
    }

    @Test
    void unsupportedCatalogGivesManualSelectionMessageWithoutLeakingProviderBody() {
        server.createContext(
                "/v1/models",
                exchange -> {
                    byte[] body = "provider-sensitive-token".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(404, body.length);
                    exchange.getResponseBody().write(body);
                    exchange.close();
                });
        BusinessException exception =
                assertThrows(BusinessException.class, () -> client.list(new ProviderCredentialBO(baseUrl, "test-key")));
        assertTrue(exception.getMessage().contains("手动填写"));
        assertFalse(exception.getMessage().contains("provider-sensitive-token"));
    }

    @Test
    void cancelsOversizedCatalog() {
        server.createContext(
                "/v1/models",
                exchange -> {
                    byte[] body = "x".repeat(1024 * 1024 + 100).getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    try {
                        exchange.getResponseBody().write(body);
                    } catch (IOException ignored) {
                        // Client cancellation is expected.
                    } finally {
                        exchange.close();
                    }
                });
        assertThrows(BusinessException.class, () -> client.list(new ProviderCredentialBO(baseUrl, "test-key")));
    }

    @Test
    void ignoresInvalidModelIdsAndCapsTheCatalogSize() {
        server.createContext(
                "/v1/models",
                exchange -> {
                    String ids =
                            IntStream.range(0, 205)
                                    .mapToObj(index -> "{\"id\":\"model-" + index + "\"}")
                                    .collect(Collectors.joining(","));
                    byte[] body =
                            ("{\"data\":[{\"id\":null},{\"id\":17},{\"id\":{}},{\"id\":\"a\\nb\"}," + ids + "]}")
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                    exchange.close();
                });
        List<String> models = client.list(new ProviderCredentialBO(baseUrl, "test-key"));
        assertEquals(200, models.size());
        assertEquals("model-0", models.getFirst());
        assertEquals("model-199", models.getLast());
    }

    @Test
    void rejectsANonCatalogResponseWithoutExposingProviderContent() {
        server.createContext(
                "/v1/models",
                exchange -> {
                    byte[] body = "{\"error\":\"sensitive-provider-diagnostic\"}".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                    exchange.close();
                });
        BusinessException exception =
                assertThrows(BusinessException.class, () -> client.list(new ProviderCredentialBO(baseUrl, "test-key")));
        assertTrue(exception.getMessage().contains("模型列表"));
        assertFalse(exception.getMessage().contains("sensitive-provider-diagnostic"));
    }
}
