package com.study.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.study.config.AIModelConfig;
import com.study.dto.AIRequest;
import com.study.dto.AIResponse;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class NvidiaAIService {

    private WebClient webClient;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final AIModelConfig modelConfig;
    
    @Value("${nvidia.api.key:}")
    private String apiKey;
    
    @Value("${nvidia.api.base-url:https://integrate.api.nvidia.com/v1}")
    private String baseUrl;
    
    @Value("${nvidia.api.timeout:300}")
    private int timeoutSeconds;

    public NvidiaAIService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper, AIModelConfig modelConfig) {
        this.webClientBuilder = webClientBuilder;
        this.objectMapper = objectMapper;
        this.modelConfig = modelConfig;
    }

    @PostConstruct
    public void init() {
        log.info("=== NVIDIA AI Service Initialization ===");
        log.info("Base URL: {}", baseUrl);
        log.info("API Key configured: {}", (apiKey != null && !apiKey.isEmpty()) ? "YES (length=" + apiKey.length() + ")" : "NO - AI features disabled");
        log.info("Default model: {}", modelConfig.getDefaultModelId());
        log.info("Available models: {}", modelConfig.getModels().size());
        log.info("Timeout: {}s", timeoutSeconds);
        
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 30_000)
                .responseTimeout(Duration.ofSeconds(timeoutSeconds))
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(timeoutSeconds, TimeUnit.SECONDS)));

        // Allow large SSE buffers (some models return big chunks)
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
        
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .build();
        
        if (!isAvailable()) {
            log.warn("NVIDIA AI service is NOT available - API key is missing or empty!");
        } else {
            log.info("NVIDIA AI service initialized successfully.");
        }
        log.info("=========================================");
    }

    /**
     * Generate content using NVIDIA AI with a simple prompt
     */
    public AIResponse generate(String prompt) {
        return generate(AIRequest.withPrompt(prompt));
    }

    /**
     * Generate content using NVIDIA AI with full request configuration
     */
    public AIResponse generate(AIRequest request) {
        long startTime = System.currentTimeMillis();
        
        if (!isAvailable()) {
            log.warn("AI generate called but service is not available (no API key)");
            return AIResponse.error("NVIDIA AI service is not configured - API key is missing");
        }
        
        try {
            ObjectNode requestBody = buildRequestBody(request);
            log.info("Calling NVIDIA API: model={}, messages={}", 
                    requestBody.get("model"), 
                    requestBody.get("messages") != null ? requestBody.get("messages").size() + " messages" : "none");
            
            String response = webClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(2))
                            .filter(ex -> !(ex instanceof WebClientResponseException.Unauthorized))
                            .doBeforeRetry(signal -> log.warn("Retrying NVIDIA API call (attempt {}): {}",
                                    signal.totalRetries() + 1, signal.failure().getMessage())))
                    .block();
            
            long responseTime = System.currentTimeMillis() - startTime;
            log.info("NVIDIA API response received in {}ms, length={}", responseTime, 
                    response != null ? response.length() : 0);
            
            return parseResponse(response, responseTime);
            
        } catch (WebClientResponseException e) {
            log.error("NVIDIA API error: Status={}, Body={}", e.getStatusCode(), e.getResponseBodyAsString());
            return AIResponse.error("AI service error: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error calling NVIDIA AI service: {}", e.getMessage(), e);
            return AIResponse.error("Failed to generate content: " + e.getMessage());
        }
    }

    /**
     * Stream content generation for real-time responses.
     * Uses ParameterizedTypeReference<ServerSentEvent<String>> for proper SSE consumption
     * from NVIDIA's text/event-stream endpoint.
     */
    public Flux<String> generateStream(AIRequest request) {
        if (!isAvailable()) {
            log.warn("AI stream called but service is not available (no API key)");
            return Flux.error(new RuntimeException("NVIDIA AI service is not configured"));
        }

        ObjectNode requestBody = buildRequestBody(request);
        requestBody.put("stream", true);
        
        String modelId = requestBody.get("model").asText();
        log.info("Starting SSE stream: model={}, request body size={}bytes", modelId, requestBody.toString().length());

        AtomicLong startTime = new AtomicLong(System.currentTimeMillis());
        AtomicLong chunkCount = new AtomicLong(0);

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.ACCEPT, MediaType.TEXT_EVENT_STREAM_VALUE)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .doOnNext(sse -> {
                    long count = chunkCount.incrementAndGet();
                    if (count == 1) {
                        log.info("SSE first chunk received after {}ms", System.currentTimeMillis() - startTime.get());
                    }
                    if (count % 50 == 0) {
                        log.debug("SSE progress: {} chunks received", count);
                    }
                })
                .map(sse -> {
                    String data = sse.data();
                    if (data == null) return "";
                    return data.trim();
                })
                .filter(data -> !data.isEmpty() && !data.equals("[DONE]"))
                .map(this::extractContentFromChunk)
                .filter(content -> !content.isEmpty())
                .doOnComplete(() -> log.info("SSE stream completed: {} chunks in {}ms", 
                        chunkCount.get(), System.currentTimeMillis() - startTime.get()))
                .doOnError(e -> log.error("SSE stream error after {} chunks, {}ms: {}", 
                        chunkCount.get(), System.currentTimeMillis() - startTime.get(), e.getMessage()))
                .onErrorResume(e -> {
                    log.error("Streaming failed, returning error signal", e);
                    return Flux.just("[ERROR] " + e.getMessage());
                });
    }

    /**
     * Extract text content from a parsed SSE JSON chunk.
     * NVIDIA format: {"id":"...","choices":[{"delta":{"content":"..."}}]}
     *
     * For reasoning models, the API may send thinking in two ways:
     * 1. Inline <think>...</think> tags in delta.content (DeepSeek R1 style)
     * 2. Separate delta.reasoning_content field (OpenAI-compatible reasoning)
     *
     * For case 2, we prefix with a special marker so ChatService can distinguish
     * reasoning chunks from content chunks WITHOUT wrapping each in <think></think>
     * (which would break the stateful parser).
     */
    private String extractContentFromChunk(String jsonChunk) {
        try {
            // Handle raw SSE data that may still have "data: " prefix
            String data = jsonChunk;
            if (data.startsWith("data: ")) {
                data = data.substring(6);
            } else if (data.startsWith("data:")) {
                data = data.substring(5);
            }
            
            if (data.isEmpty() || data.equals("[DONE]")) return "";
            
            JsonNode root = objectMapper.readTree(data);
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode delta = choices.get(0).get("delta");
                if (delta != null) {
                    // Check for reasoning_content FIRST (separate reasoning field)
                    if (delta.has("reasoning_content") && !delta.get("reasoning_content").isNull()) {
                        String reasoning = delta.get("reasoning_content").asText();
                        // Use special marker prefix so ChatService routes this to thinking
                        return REASONING_MARKER + reasoning;
                    }
                    // Primary: delta.content (standard OpenAI-compatible field)
                    // May contain inline <think>...</think> tags for some models
                    if (delta.has("content") && !delta.get("content").isNull()) {
                        return delta.get("content").asText();
                    }
                }
            }
        } catch (Exception e) {
            log.trace("Partial/malformed SSE chunk: {}", jsonChunk);
        }
        return "";
    }

    /** Marker prefix for reasoning_content chunks (not part of actual content) */
    public static final String REASONING_MARKER = "\u0000__REASONING__\u0000";

    /**
     * Generate content with system prompt for better context
     */
    public AIResponse generateWithSystem(String systemPrompt, String userPrompt) {
        return generate(AIRequest.withSystemPrompt(systemPrompt, userPrompt));
    }

    /**
     * Generate content with system prompt and a specific model
     */
    public AIResponse generateWithSystem(String systemPrompt, String userPrompt, String model) {
        AIRequest request = AIRequest.withSystemPrompt(systemPrompt, userPrompt);
        request.setModel(model);
        return generate(request);
    }

    /**
     * Parse raw JSON response into AIResponse object
     */
    private AIResponse parseResponse(String responseBody, long responseTime) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            
            JsonNode choices = root.get("choices");
            if (choices == null || !choices.isArray() || choices.size() == 0) {
                return AIResponse.error("No choices in AI response");
            }
            
            JsonNode firstChoice = choices.get(0);
            JsonNode message = firstChoice.get("message");
            String content = message != null ? message.get("content").asText() : "";
            
            JsonNode usage = root.get("usage");
            int promptTokens = usage != null && usage.has("prompt_tokens") ? 
                    usage.get("prompt_tokens").asInt() : 0;
            int completionTokens = usage != null && usage.has("completion_tokens") ? 
                    usage.get("completion_tokens").asInt() : 0;
            int totalTokens = usage != null && usage.has("total_tokens") ? 
                    usage.get("total_tokens").asInt() : 0;
            
            String resolvedModel = modelConfig.getDefaultModelId();
            if (root.get("model") != null) {
                resolvedModel = root.get("model").asText();
            }

            return AIResponse.builder()
                    .success(true)
                    .content(content)
                    .model(resolvedModel)
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .totalTokens(totalTokens)
                    .responseTimeMs(responseTime)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error parsing AI response", e);
            return AIResponse.error("Failed to parse AI response: " + e.getMessage());
        }
    }

    /**
     * Build request body for NVIDIA API.
     * Resolves model from request or falls back to configured default.
     */
    private ObjectNode buildRequestBody(AIRequest request) {
        ObjectNode requestBody = objectMapper.createObjectNode();
        
        // Resolve model: request model > default from models.json
        String resolvedModel = modelConfig.resolveModelId(request.getModel());
        requestBody.put("model", resolvedModel);
        
        // Resolve max tokens from model config
        int maxTokens = request.getMaxTokens() > 0 
                ? request.getMaxTokens() 
                : modelConfig.resolveMaxTokens(resolvedModel);
        
        // Build messages array
        ArrayNode messages = objectMapper.createArrayNode();
        
        if (request.getMessages() != null && !request.getMessages().isEmpty()) {
            for (AIRequest.Message msg : request.getMessages()) {
                ObjectNode messageNode = objectMapper.createObjectNode();
                messageNode.put("role", msg.getRole());
                messageNode.put("content", msg.getContent());
                messages.add(messageNode);
            }
        } else if (request.getSystemPrompt() != null && !request.getSystemPrompt().isEmpty()) {
            ObjectNode systemMessage = objectMapper.createObjectNode();
            systemMessage.put("role", "system");
            systemMessage.put("content", request.getSystemPrompt());
            messages.add(systemMessage);
            
            ObjectNode userMessage = objectMapper.createObjectNode();
            userMessage.put("role", "user");
            userMessage.put("content", request.getPrompt());
            messages.add(userMessage);
        } else {
            ObjectNode userMessage = objectMapper.createObjectNode();
            userMessage.put("role", "user");
            userMessage.put("content", request.getPrompt());
            messages.add(userMessage);
        }
        
        requestBody.set("messages", messages);
        requestBody.put("temperature", request.getTemperature());
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("stream", request.isStream());
        
        return requestBody;
    }

    /**
     * Check if NVIDIA AI service is properly configured and available
     */
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your-nvidia-api-key-here");
    }

    /**
     * Extract JSON from AI response (handles markdown code blocks)
     */
    public String extractJsonFromResponse(String content) {
        if (content == null || content.isEmpty()) {
            return "{}";
        }
        
        // Try to find JSON between markdown code blocks
        int jsonStart = content.indexOf("```json");
        if (jsonStart != -1) {
            int jsonEnd = content.indexOf("```", jsonStart + 7);
            if (jsonEnd != -1) {
                return content.substring(jsonStart + 7, jsonEnd).trim();
            }
        }
        
        // Try to find JSON between generic code blocks
        jsonStart = content.indexOf("```");
        if (jsonStart != -1) {
            int jsonEnd = content.indexOf("```", jsonStart + 3);
            if (jsonEnd != -1) {
                String potentialJson = content.substring(jsonStart + 3, jsonEnd).trim();
                if (potentialJson.startsWith("{") || potentialJson.startsWith("[")) {
                    return potentialJson;
                }
            }
        }
        
        // Try to find JSON between curly braces
        jsonStart = content.indexOf("{");
        int jsonEnd = content.lastIndexOf("}");
        if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
            return content.substring(jsonStart, jsonEnd + 1);
        }
        
        return content;
    }
}
