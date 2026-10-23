package com.unorva.mindforge.module.business.ai.domain.bo;

import java.util.Map;

/** A provider delta or activity that can be forwarded without buffering the full response. */
public record AiStreamEventBO(String event, Map<String, String> data) {}
