package com.unorva.mindforge.module.business.ai.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.ai.client.AiModelsClient;
import com.unorva.mindforge.module.business.ai.manager.AiCredentialManager;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Catalog access never exposes the saved API key to the browser. */
@RestController
@RequiredArgsConstructor
public class AiModelsController {
    private final AiModelsClient client;
    private final AiCredentialManager credentials;

    @GetMapping("/ai/models")
    public Result<List<String>> models() {
        return Result.success(client.list(credentials.requireCredential(CurrentUser.id())));
    }
}
