package com.unorva.mindforge.common.web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Allows the explicitly configured frontend origins to access Bearer-protected APIs. */
@Configuration
public class WebConfiguration implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfiguration(@Value("${mindforge.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins.clone();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type")
                .maxAge(3600);
    }
}
