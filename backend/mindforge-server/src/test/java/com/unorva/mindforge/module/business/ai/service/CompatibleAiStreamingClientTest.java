package com.unorva.mindforge.module.business.ai.service;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.client.CompatibleAiClient;
import com.unorva.mindforge.module.business.ai.domain.bo.AiStreamEventBO;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.business.ai.support.AiStreamControl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

class CompatibleAiStreamingClientTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
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
    void forwardsUtf8ReasoningAndContentBeforeTheProviderCompletes() {
        CountDownLatch firstDelta = new CountDownLatch(1);
        AtomicBoolean providerObservedFirstDelta = new AtomicBoolean();
        AtomicBoolean requestedStream = new AtomicBoolean();
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    requestedStream.set(
                            mapper.readTree(exchange.getRequestBody().readAllBytes()).path("stream").asBoolean());
                    exchange.getResponseHeaders().set("Content-Type", "text/event-stream; charset=utf-8");
                    exchange.sendResponseHeaders(200, 0);
                    byte[] first =
                            (": keep alive\r\n\r\ndata: {\"choices\":[{\"delta\":{\"reasoning_content\":\"检查计算\"}}]}\r\n\r\n"
                                            + "data: {\"choices\":[{\"delta\":{\"content\":\"答案\"}}]}\n\n")
                                    .getBytes(StandardCharsets.UTF_8);
                    for (byte value : first) {
                        exchange.getResponseBody().write(value);
                        exchange.getResponseBody().flush();
                    }
                    try {
                        providerObservedFirstDelta.set(firstDelta.await(3, TimeUnit.SECONDS));
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    }
                    exchange.getResponseBody()
                            .write(
                                    ("data: {\"choices\":[\n"
                                                    + "data: {\"delta\":{\"content\":\"是391\"},\"finish_reason\":\"stop\"}]}\n\n"
                                                    + "data: [DONE]\n\n")
                                            .getBytes(StandardCharsets.UTF_8));
                    exchange.close();
                });
        List<AiStreamEventBO> events = new ArrayList<>();
        String reply =
                stream(
                        event -> {
                            events.add(event);
                            if (event.event().equals("content")) firstDelta.countDown();
                        },
                        new AiStreamControl());
        assertTrue(requestedStream.get());
        assertTrue(providerObservedFirstDelta.get(), "The first delta must reach the consumer before the final event");
        assertEquals("答案是391", reply);
        assertEquals(
                List.of("检查计算"),
                events.stream().filter(e -> e.event().equals("reasoning")).map(e -> e.data().get("delta")).toList());
        assertTrue(
                events.stream()
                        .anyMatch(
                                e ->
                                        "thinking".equals(e.data().get("type"))
                                                && "complete".equals(e.data().get("state"))));
    }

    @Test
    void rejectsTruncatedStreamsRatherThanReturningPartialReply() {
        serve(200, "text/event-stream", "data: {\"choices\":[{\"delta\":{\"content\":\"半截回答\"}}]}\n\n");
        BusinessException exception =
                assertThrows(BusinessException.class, () -> stream(unused -> {}, new AiStreamControl()));
        assertTrue(exception.getMessage().contains("中断"));
    }

    @Test
    void neverClaimsThatRequestedToolsExecuted() {
        serve(
                200,
                "text/event-stream",
                "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"name\":\"search\",\"arguments\":\"{}\"}}]},\"finish_reason\":\"tool_calls\"}]}\n\n"
                        + "data: [DONE]\n\n");
        List<AiStreamEventBO> events = new ArrayList<>();
        BusinessException exception =
                assertThrows(BusinessException.class, () -> stream(events::add, new AiStreamControl()));
        assertTrue(exception.getMessage().contains("尚未配置"));
        assertTrue(
                events.stream()
                        .anyMatch(
                                e -> "tool".equals(e.data().get("type")) && "requested".equals(e.data().get("state"))));
        assertFalse(
                events.stream()
                        .anyMatch(
                                e -> "tool".equals(e.data().get("type")) && "complete".equals(e.data().get("state"))));
    }

    @Test
    void combinesFragmentedToolNamesBeforeReportingARequestedTool() {
        serve(
                200,
                "text/event-stream",
                "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"name\":\"sea\"}}]}}]}\n\n"
                        + "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"name\":\"rch\"}}]},\"finish_reason\":\"tool_calls\"}]}\n\n"
                        + "data: [DONE]\n\n");
        List<AiStreamEventBO> events = new ArrayList<>();
        assertThrows(BusinessException.class, () -> stream(events::add, new AiStreamControl()));
        assertEquals(
                List.of("search"),
                events.stream()
                        .filter(event -> "tool".equals(event.data().get("type")))
                        .map(event -> event.data().get("name"))
                        .toList());
    }

    @Test
    void outputLimitDoesNotTurnATruncatedAnswerIntoASuccess() {
        serve(
                200,
                "text/event-stream",
                "data: {\"choices\":[{\"delta\":{\"content\":\"未完成的回答\"},\"finish_reason\":\"length\"}]}\n\n"
                        + "data: [DONE]\n\n");
        List<AiStreamEventBO> events = new ArrayList<>();
        BusinessException exception =
                assertThrows(BusinessException.class, () -> stream(events::add, new AiStreamControl()));
        assertTrue(exception.getMessage().contains("Token 上限"));
        assertEquals("未完成的回答", events.getFirst().data().get("delta"));
    }

    @Test
    void cancellationInterruptsAnIdleProviderBody() throws Exception {
        CountDownLatch firstDelta = new CountDownLatch(1);
        CountDownLatch releaseProvider = new CountDownLatch(1);
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    exchange.getRequestBody().readAllBytes();
                    exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
                    exchange.sendResponseHeaders(200, 0);
                    exchange.getResponseBody()
                            .write(
                                    "data: {\"choices\":[{\"delta\":{\"content\":\"开始\"}}]}\n\n"
                                            .getBytes(StandardCharsets.UTF_8));
                    exchange.getResponseBody().flush();
                    try {
                        releaseProvider.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    } finally {
                        exchange.close();
                    }
                });
        AiStreamControl control = new AiStreamControl();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var result = executor.submit(() -> stream(event -> firstDelta.countDown(), control));
            assertTrue(firstDelta.await(3, TimeUnit.SECONDS));
            control.cancel();
            ExecutionException exception =
                    assertThrows(ExecutionException.class, () -> result.get(3, TimeUnit.SECONDS));
            assertInstanceOf(BusinessException.class, exception.getCause());
            assertTrue(exception.getCause().getMessage().contains("停止"));
        } finally {
            releaseProvider.countDown();
        }
    }

    @Test
    void upstreamErrorsNeverExposeProviderBodiesOrKeys() {
        serve(402, "application/json", "secret-api-key echoed upstream");
        BusinessException exception =
                assertThrows(BusinessException.class, () -> stream(unused -> {}, new AiStreamControl()));
        assertTrue(exception.getMessage().contains("余额不足"));
        assertFalse(exception.getMessage().contains("secret-api-key"));
    }

    @Test
    void rejectsOversizedStreamingBody() {
        serve(200, "text/event-stream", ":" + "x".repeat(8 * 1024 * 1024 + 100));
        assertThrows(BusinessException.class, () -> stream(unused -> {}, new AiStreamControl()));
    }

    @Test
    void accommodatesSseMetadataOverheadWhileBoundingActualReplyText() {
        serve(
                200,
                "text/event-stream",
                ": "
                        + "x".repeat(1024 * 1024 + 100)
                        + "\n\n"
                        + "data: {\"choices\":[{\"delta\":{\"content\":\"完整回答\"}}]}\n\n"
                        + "data: [DONE]\n\n");
        assertEquals("完整回答", stream(unused -> {}, new AiStreamControl()));
    }

    @Test
    void rejectsOversizedReplyEvenWhenRawStreamFitsTheTransportBudget() {
        serve(
                200,
                "text/event-stream",
                "data: {\"choices\":[{\"delta\":{\"content\":\""
                        + "x".repeat(120001)
                        + "\"}}]}\n\n"
                        + "data: [DONE]\n\n");
        BusinessException exception =
                assertThrows(BusinessException.class, () -> stream(unused -> {}, new AiStreamControl()));
        assertTrue(exception.getMessage().contains("最大长度"));
    }

    private void serve(int status, String contentType, String body) {
        server.createContext(
                "/v1/chat/completions",
                exchange -> {
                    exchange.getRequestBody().readAllBytes();
                    exchange.getResponseHeaders().set("Content-Type", contentType);
                    exchange.sendResponseHeaders(status, 0);
                    try {
                        exchange.getResponseBody().write(body.getBytes(StandardCharsets.UTF_8));
                    } catch (IOException ignored) {
                        // The client deliberately closes oversized or failed responses.
                    } finally {
                        exchange.close();
                    }
                });
    }

    private String stream(java.util.function.Consumer<AiStreamEventBO> events, AiStreamControl control) {
        return new CompatibleAiClient(mapper)
                .stream(
                        new ProviderCredentialBO(baseUrl, "secret-api-key"),
                        new AiSettingsVO(
                                "兼容接口",
                                "test-model",
                                new BigDecimal("0.7"),
                                4096,
                                "简体中文",
                                "",
                                new AiFeaturesDTO(false, false, false, false),
                                baseUrl,
                                "",
                                true),
                        List.of(Map.of("role", "user", "content", "你好")),
                        events,
                        control);
    }
}
