package com.study.controller;

import com.study.config.AIModelConfig;
import com.study.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIModelConfig modelConfig;

    @GetMapping("/models")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getModels() {
        try {
            // Serialize models to plain Maps so Jackson has no trouble with inner classes
            List<Map<String, Object>> modelList = modelConfig.getModels().stream()
                    .map(m -> {
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("id", m.getId());
                        map.put("name", m.getName());
                        map.put("provider", m.getProvider());
                        map.put("description", m.getDescription());
                        map.put("maxTokens", m.getMaxTokens());
                        map.put("supportsStreaming", m.isSupportsStreaming());
                        map.put("supportsThinking", m.isSupportsThinking());
                        map.put("category", m.getCategory());
                        map.put("tags", m.getTags());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("defaultModel", modelConfig.getDefaultModelId());
            result.put("models", modelList);

            log.debug("GET /ai/models — returning {} models, default={}", modelList.size(), modelConfig.getDefaultModelId());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("Failed to fetch AI models", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to load AI models: " + e.getMessage()));
        }
    }
}
