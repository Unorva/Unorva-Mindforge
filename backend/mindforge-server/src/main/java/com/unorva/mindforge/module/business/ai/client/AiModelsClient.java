package com.unorva.mindforge.module.business.ai.client;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;

/** Fetches a provider's model catalog with the user's server-side credential. */
@Component
public class AiModelsClient {
    private static final int MAX_RESPONSE_BYTES = 1024 * 1024;
    private static final int MAX_MODELS = 200;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();

    public AiModelsClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<String> list(ProviderCredentialBO credential) {
        try {
            HttpRequest request =
                    HttpRequest.newBuilder(URI.create(credential.baseUrl() + "/models"))
                            .timeout(Duration.ofSeconds(25))
                            .header("Authorization", "Bearer " + credential.apiKey())
                            .header("Accept", "application/json")
                            .GET()
                            .build();
            HttpResponse<byte[]> response = httpClient.send(request, unused -> new LimitedBodySubscriber());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message =
                        switch (response.statusCode()) {
                            case 401, 403 -> "获取模型列表认证失败，请检查 API Key 权限";
                            case 404, 405 -> "此服务商不支持获取模型列表，请手动填写模型 ID";
                            case 429 -> "获取模型列表过于频繁，请稍后重试";
                            default -> "获取模型列表失败（HTTP " + response.statusCode() + "）";
                        };
                throw new BusinessException(message, BusinessErrorCode.PROVIDER_FAILED);
            }
            JsonNode data = objectMapper.readTree(response.body()).path("data");
            if (!data.isArray()) {
                throw new BusinessException("服务商未返回兼容的模型列表，请手动填写模型 ID", BusinessErrorCode.PROVIDER_FAILED);
            }
            LinkedHashSet<String> models = new LinkedHashSet<>();
            for (JsonNode entry : data) {
                JsonNode modelId = entry.path("id");
                if (!modelId.isString()) continue;
                String id = modelId.asString().trim();
                if (!id.isBlank() && id.length() <= 120 && id.chars().noneMatch(Character::isISOControl)) {
                    models.add(id);
                    if (models.size() >= MAX_MODELS) break;
                }
            }
            if (models.isEmpty()) {
                throw new BusinessException("此凭据暂无可用模型，请检查服务商模型权限", BusinessErrorCode.PROVIDER_FAILED);
            }
            return List.copyOf(models);
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException("模型列表请求已中断，请重试", BusinessErrorCode.PROVIDER_FAILED);
        } catch (IOException exception) {
            throw new BusinessException("获取模型列表超时、网络失败或响应过大，请检查接口地址", BusinessErrorCode.PROVIDER_FAILED);
        } catch (RuntimeException exception) {
            // Provider bodies and exception messages may contain credentials.
            throw new BusinessException("模型列表响应无效，请检查兼容接口地址", BusinessErrorCode.PROVIDER_FAILED);
        }
    }

    private static final class LimitedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
        private Flow.Subscription subscription;
        private int receivedBytes;

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
            for (ByteBuffer buffer : buffers) receivedBytes += buffer.remaining();
            if (receivedBytes > MAX_RESPONSE_BYTES) {
                subscription.cancel();
                delegate.onError(new IOException("Model catalog exceeds limit"));
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
