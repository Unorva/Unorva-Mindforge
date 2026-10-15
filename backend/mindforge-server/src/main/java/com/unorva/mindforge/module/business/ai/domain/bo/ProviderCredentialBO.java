package com.unorva.mindforge.module.business.ai.domain.bo;

/** Internal transport only; never serialize provider credentials through a controller. */
public record ProviderCredentialBO(String baseUrl, String apiKey) {
    @Override
    public String toString() {
        return "ProviderCredentialBO[baseUrl=" + baseUrl + ", apiKey=REDACTED]";
    }
}
