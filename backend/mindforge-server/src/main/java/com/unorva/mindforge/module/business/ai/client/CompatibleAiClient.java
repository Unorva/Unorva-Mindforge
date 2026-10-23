package com.unorva.mindforge.module.business.ai.client;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.AiStreamEventBO;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.business.ai.support.AiStreamControl;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Flow;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;

/** Calls only a user's configured OpenAI-compatible Chat Completions destination. */
@Component
public class CompatibleAiClient {
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    // SSE envelopes repeat provider metadata for every token and are much larger than final JSON.
    private static final int MAX_STREAM_RESPONSE_BYTES = 8 * 1024 * 1024;
    private static final int MAX_REPLY_CHARACTERS = 120000;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(45);
    private static final Duration STREAM_TIMEOUT = Duration.ofSeconds(180);
    private static final ScheduledExecutorService STREAM_DEADLINES =
            Executors.newSingleThreadScheduledExecutor(
                    Thread.ofPlatform().daemon().name("ai-stream-deadline").factory());
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public CompatibleAiClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient =
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build();
    }

    public String complete(
            ProviderCredentialBO credential,
            AiSettingsVO settings,
            List<Map<String, String>> messages,
            boolean connectionTest) {
        if (!StringUtils.hasText(settings.model())) {
            throw new BusinessException("请先在账户设置中填写 AI 模型名称", BusinessErrorCode.NOT_CONFIGURED);
        }
        Map<String, Object> payload =
                Map.of(
                        "model",
                        settings.model(),
                        "messages",
                        messages,
                        "temperature",
                        settings.temperature(),
                        "max_tokens",
                        connectionTest ? 16 : settings.maxTokens(),
                        "stream",
                        false);
        HttpRequest request;
        try {
            request =
                    HttpRequest.newBuilder(URI.create(credential.baseUrl() + "/chat/completions"))
                            .timeout(REQUEST_TIMEOUT)
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json")
                            .header("Authorization", "Bearer " + credential.apiKey())
                            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                            .build();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("AI 接口地址或 API Key 格式无效", BusinessErrorCode.INVALID_INPUT);
        }
        try {
            HttpResponse<byte[]> response =
                    httpClient.send(request, unused -> new LimitedBodySubscriber(MAX_RESPONSE_BYTES));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw providerFailure(response.statusCode());
            }
            JsonNode message = objectMapper.readTree(response.body()).path("choices").path(0).path("message");
            JsonNode content = message.path("content");
            // A small connection probe can finish inside a reasoning model's thinking budget.
            // This verifies its real response without treating reasoning as a final chat answer.
            if (connectionTest && (!content.isString() || !StringUtils.hasText(content.asString()))) {
                content = message.path("reasoning_content");
            }
            if (!content.isString() || !StringUtils.hasText(content.asString())) {
                throw new BusinessException(
                        "AI 接口响应缺少 choices[0].message.content 文本", BusinessErrorCode.PROVIDER_FAILED);
            }
            String reply = content.asString();
            if (reply.length() > MAX_REPLY_CHARACTERS) {
                throw new BusinessException("AI 回复超过最大长度，请减少输出 Token 数", BusinessErrorCode.PROVIDER_FAILED);
            }
            return reply;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException("AI 请求已中断，请重试", BusinessErrorCode.PROVIDER_FAILED);
        } catch (IOException exception) {
            throw new BusinessException("AI 请求超时、网络失败或回复超过 1 MB，请检查接口地址", BusinessErrorCode.PROVIDER_FAILED);
        } catch (BusinessException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            // Never include provider response bodies or exception messages; they may contain credentials.
            throw new BusinessException("AI 接口返回了无效响应，请检查兼容接口配置", BusinessErrorCode.PROVIDER_FAILED);
        }
    }

    /** Reads genuine SSE deltas, preserving UTF-8 and event boundaries across network chunks. */
    public String stream(
            ProviderCredentialBO credential,
            AiSettingsVO settings,
            List<Map<String, String>> messages,
            Consumer<AiStreamEventBO> events,
            AiStreamControl control) {
        control.checkActive();
        if (!StringUtils.hasText(settings.model())) {
            throw new BusinessException("请先在账户设置中填写 AI 模型名称", BusinessErrorCode.NOT_CONFIGURED);
        }
        HttpRequest request;
        try {
            Map<String, Object> payload =
                    Map.of(
                            "model", settings.model(),
                            "messages", messages,
                            "temperature", settings.temperature(),
                            "max_tokens", settings.maxTokens(),
                            "stream", true);
            request =
                    HttpRequest.newBuilder(URI.create(credential.baseUrl() + "/chat/completions"))
                            .timeout(STREAM_TIMEOUT)
                            .header("Content-Type", "application/json")
                            .header("Accept", "text/event-stream")
                            .header("Authorization", "Bearer " + credential.apiKey())
                            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                            .build();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("AI 接口地址或 API Key 格式无效", BusinessErrorCode.INVALID_INPUT);
        }
        var deadline = STREAM_DEADLINES.schedule(control::timeout, STREAM_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        try {
            var future = httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream());
            control.attachFuture(future);
            HttpResponse<InputStream> response = future.get(STREAM_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
            control.attachBody(response.body());
            control.checkActive();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw providerFailure(response.statusCode());
            }
            String mediaType = response.headers().firstValue("Content-Type").orElse("");
            if (!mediaType.toLowerCase(java.util.Locale.ROOT).startsWith("text/event-stream")) {
                throw new BusinessException("AI 接口未返回流式响应，请检查接口兼容性", BusinessErrorCode.PROVIDER_FAILED);
            }
            StreamAccumulator accumulator = new StreamAccumulator(events, control);
            try (BufferedReader reader =
                    new BufferedReader(
                            new InputStreamReader(new BoundedInputStream(response.body()), StandardCharsets.UTF_8))) {
                StringBuilder eventData = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    control.checkActive();
                    if (line.isEmpty()) {
                        if (eventData.length() > 0 && accumulator.accept(eventData.toString())) {
                            return accumulator.reply();
                        }
                        eventData.setLength(0);
                    } else if (line.startsWith("data:")) {
                        if (eventData.length() > 0) eventData.append('\n');
                        String value = line.substring(5);
                        eventData.append(value.startsWith(" ") ? value.substring(1) : value);
                    }
                    // SSE comments and unknown fields carry no assistant content.
                }
                if (eventData.length() > 0 && accumulator.accept(eventData.toString())) return accumulator.reply();
            }
            throw new BusinessException("AI 流式响应意外中断，请重试", BusinessErrorCode.PROVIDER_FAILED);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            control.checkActive();
            throw new BusinessException("AI 请求已中断，请重试", BusinessErrorCode.PROVIDER_FAILED);
        } catch (TimeoutException exception) {
            control.timeout();
            control.checkActive();
            throw new IllegalStateException("Unreachable timeout state");
        } catch (IOException | ExecutionException | CancellationException exception) {
            control.checkActive();
            throw new BusinessException("AI 流式请求失败、超时或响应超过 8 MB，请重试", BusinessErrorCode.PROVIDER_FAILED);
        } catch (BusinessException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            control.checkActive();
            throw new BusinessException("AI 接口返回了无效流式响应，请检查兼容接口配置", BusinessErrorCode.PROVIDER_FAILED);
        } finally {
            deadline.cancel(false);
            control.release();
        }
    }

    private static BusinessException providerFailure(int status) {
        String message =
                switch (status) {
                    case 401, 403 -> "AI 服务拒绝认证，请检查 API Key 和模型权限";
                    case 402 -> "AI 服务余额不足，请在模型服务商账户充值后重试";
                    case 404 -> "AI 接口或模型不存在，请检查基础地址和模型名称";
                    case 429 -> "AI 服务额度不足或请求过于频繁，请稍后重试";
                    default -> "AI 服务返回 HTTP " + status + "，请检查服务状态";
                };
        return new BusinessException(message, BusinessErrorCode.PROVIDER_FAILED);
    }

    private final class StreamAccumulator {
        private final Consumer<AiStreamEventBO> events;
        private final AiStreamControl control;
        private final StringBuilder content = new StringBuilder();
        private final Map<Integer, StringBuilder> toolNames = new HashMap<>();
        private int reasoningCharacters;
        private boolean thinking;
        private boolean toolsRequested;
        private boolean toolsEmitted;

        private StreamAccumulator(Consumer<AiStreamEventBO> events, AiStreamControl control) {
            this.events = events;
            this.control = control;
        }

        private boolean accept(String data) {
            control.checkActive();
            if ("[DONE]".equals(data)) {
                emitToolRequests();
                return true;
            }
            JsonNode chunk = objectMapper.readTree(data);
            if (chunk.has("error")) {
                throw new BusinessException("AI 服务在生成过程中返回错误，请重试", BusinessErrorCode.PROVIDER_FAILED);
            }
            JsonNode choice = chunk.path("choices").path(0);
            JsonNode delta = choice.path("delta");
            String reasoning = text(delta.path("reasoning_content"));
            if (!reasoning.isEmpty()) {
                reasoningCharacters += reasoning.length();
                requireLength();
                if (!thinking) {
                    thinking = true;
                    emit("activity", Map.of("type", "thinking", "state", "running"));
                }
                emit("reasoning", Map.of("delta", reasoning));
            }
            String next = text(delta.path("content"));
            if (!next.isEmpty()) {
                finishThinking();
                content.append(next);
                requireLength();
                emit("content", Map.of("delta", next));
            }
            JsonNode calls = delta.path("tool_calls");
            if (calls.isArray()) {
                for (JsonNode call : calls) {
                    toolsRequested = true;
                    int index = call.path("index").asInt();
                    if (index < 0 || index >= 32) {
                        throw new BusinessException("模型请求的工具数量超过限制", BusinessErrorCode.PROVIDER_FAILED);
                    }
                    StringBuilder name = toolNames.computeIfAbsent(index, unused -> new StringBuilder());
                    String fragment = text(call.path("function").path("name"));
                    if (!fragment.isEmpty()) {
                        if (name.length() + fragment.length() > 200) {
                            throw new BusinessException("模型返回的工具名称超过限制", BusinessErrorCode.PROVIDER_FAILED);
                        }
                        name.append(fragment);
                    }
                }
            }
            if ("tool_calls".equals(text(choice.path("finish_reason")))) {
                toolsRequested = true;
                emitToolRequests();
            }
            if ("length".equals(text(choice.path("finish_reason")))) {
                throw new BusinessException("AI 回复达到输出 Token 上限，未完成的内容未保存，请提高上限后重试", BusinessErrorCode.PROVIDER_FAILED);
            }
            if ("content_filter".equals(text(choice.path("finish_reason")))) {
                throw new BusinessException("AI 服务未能生成完整回答，请调整问题后重试", BusinessErrorCode.PROVIDER_FAILED);
            }
            return false;
        }

        private String reply() {
            finishThinking();
            if (toolsRequested) {
                throw new BusinessException("模型请求了工具调用，当前接口尚未配置可执行工具", BusinessErrorCode.PROVIDER_FAILED);
            }
            if (!StringUtils.hasText(content)) {
                throw new BusinessException("AI 流式响应缺少回答文本，请增加输出 Token 上限后重试", BusinessErrorCode.PROVIDER_FAILED);
            }
            return content.toString();
        }

        private void requireLength() {
            if (content.length() + reasoningCharacters > MAX_REPLY_CHARACTERS) {
                throw new BusinessException("AI 回复超过最大长度，请减少输出 Token 数", BusinessErrorCode.PROVIDER_FAILED);
            }
        }

        private void finishThinking() {
            if (thinking) {
                thinking = false;
                emit("activity", Map.of("type", "thinking", "state", "complete"));
            }
        }

        private void emitToolRequests() {
            if (toolsEmitted || !toolsRequested) return;
            toolsEmitted = true;
            if (toolNames.isEmpty()) {
                emit("activity", Map.of("type", "tool", "state", "requested"));
            } else {
                toolNames
                        .values()
                        .forEach(
                                name ->
                                        emit(
                                                "activity",
                                                Map.of("type", "tool", "state", "requested", "name", name.toString())));
            }
        }

        private void emit(String event, Map<String, String> data) {
            control.checkActive();
            events.accept(new AiStreamEventBO(event, data));
            control.checkActive();
        }
    }

    private static String text(JsonNode node) {
        return node.isString() ? node.asString() : "";
    }

    private static final class BoundedInputStream extends FilterInputStream {
        private int received;

        private BoundedInputStream(InputStream input) {
            super(input);
        }

        @Override
        public int read() throws IOException {
            int value = in.read();
            if (value != -1) count(1);
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            int value = in.read(buffer, offset, length);
            if (value > 0) count(value);
            return value;
        }

        private void count(int amount) throws IOException {
            received += amount;
            if (received > MAX_STREAM_RESPONSE_BYTES) throw new IOException("Response exceeds configured limit");
        }
    }

    /** Cancels oversized responses before the underlying byte array can grow without bound. */
    private static final class LimitedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
        private final long maximumBytes;
        private Flow.Subscription subscription;
        private long receivedBytes;

        private LimitedBodySubscriber(long maximumBytes) {
            this.maximumBytes = maximumBytes;
        }

        @Override
        public CompletionStage<byte[]> getBody() {
            return delegate.getBody();
        }

        @Override
        public void onSubscribe(Flow.Subscription value) {
            subscription = value;
            delegate.onSubscribe(value);
        }

        @Override
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                receivedBytes += buffer.remaining();
            }
            if (receivedBytes > maximumBytes) {
                subscription.cancel();
                delegate.onError(new IOException("Response exceeds configured limit"));
                return;
            }
            delegate.onNext(buffers);
        }

        @Override
        public void onError(Throwable throwable) {
            delegate.onError(throwable);
        }

        @Override
        public void onComplete() {
            delegate.onComplete();
        }
    }
}
