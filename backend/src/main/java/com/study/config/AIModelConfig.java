package com.study.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
public class AIModelConfig {

    private final ObjectMapper objectMapper;
    private String defaultModelId;
    private final List<AIModel> models = new ArrayList<>();

    public AIModelConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("models.json");
            InputStream is = resource.getInputStream();
            JsonNode root = objectMapper.readTree(is);

            this.defaultModelId = root.get("defaultModel").asText();

            JsonNode modelsNode = root.get("models");
            if (modelsNode != null && modelsNode.isArray()) {
                for (JsonNode m : modelsNode) {
                    AIModel model = new AIModel();
                    model.setId(m.get("id").asText());
                    model.setName(m.get("name").asText());
                    model.setProvider(m.has("provider") ? m.get("provider").asText() : "");
                    model.setDescription(m.has("description") ? m.get("description").asText() : "");
                    model.setMaxTokens(m.has("maxTokens") ? m.get("maxTokens").asInt() : 16384);
                    model.setSupportsStreaming(m.has("supportsStreaming") && m.get("supportsStreaming").asBoolean());
                    model.setSupportsThinking(m.has("supportsThinking") && m.get("supportsThinking").asBoolean());
                    model.setCategory(m.has("category") ? m.get("category").asText() : "general");

                    List<String> tags = new ArrayList<>();
                    if (m.has("tags") && m.get("tags").isArray()) {
                        for (JsonNode t : m.get("tags")) {
                            tags.add(t.asText());
                        }
                    }
                    model.setTags(tags);
                    models.add(model);
                }
            }

            log.info("Loaded {} AI models from models.json, default: {}", models.size(), defaultModelId);
        } catch (Exception e) {
            log.error("Failed to load models.json, using fallback defaults", e);
            this.defaultModelId = "minimaxai/minimax-m2.1";
            AIModel fallback = new AIModel();
            fallback.setId(defaultModelId);
            fallback.setName("MiniMax M2.1");
            fallback.setProvider("MiniMax");
            fallback.setDescription("Default model");
            fallback.setMaxTokens(16384);
            fallback.setSupportsStreaming(true);
            fallback.setCategory("general");
            fallback.setTags(List.of("default"));
            models.add(fallback);
        }
    }

    public String getDefaultModelId() {
        return defaultModelId;
    }

    public List<AIModel> getModels() {
        return List.copyOf(models);
    }

    public Optional<AIModel> getModelById(String id) {
        return models.stream().filter(m -> m.getId().equals(id)).findFirst();
    }

    public AIModel getDefaultModel() {
        return getModelById(defaultModelId).orElse(models.get(0));
    }

    /** Resolve a model ID: if null/empty, return default; if invalid, return default */
    public String resolveModelId(String modelId) {
        if (modelId == null || modelId.isBlank()) {
            return defaultModelId;
        }
        return getModelById(modelId).map(AIModel::getId).orElse(defaultModelId);
    }

    public int resolveMaxTokens(String modelId) {
        String resolved = resolveModelId(modelId);
        return getModelById(resolved).map(AIModel::getMaxTokens).orElse(16384);
    }

    @Data
    public static class AIModel {
        private String id;
        private String name;
        private String provider;
        private String description;
        private int maxTokens;
        private boolean supportsStreaming;
        private boolean supportsThinking;
        private String category;
        private List<String> tags;
    }
}
