package com.unorva.mindforge.module.business.ai.client;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;

/** Calls only a user's configured OpenAI-compatible Chat Completions destination. */
@Component
public class CompatibleAiClient {
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    private static final int MAX_REPLY_CHARACTERS = 120000;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(45);
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
                String message =
                        switch (response.statusCode()) {
                            case 401, 403 -> "AI 服务拒绝认证，请检查 API Key 和模型权限";
                            case 404 -> "AI 接口或模型不存在，请检查基础地址和模型名称";
                            case 429 -> "AI 服务额度不足或请求过于频繁，请稍后重试";
                            default -> "AI 服务返回 HTTP " + response.statusCode() + "，请检查服务状态";
                        };
                throw new BusinessException(message, BusinessErrorCode.PROVIDER_FAILED);
            }
            JsonNode content =
                    objectMapper.readTree(response.body()).path("choices").path(0).path("message").path("content");
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
