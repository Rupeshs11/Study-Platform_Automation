package com.study.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.study.config.AIModelConfig;
import com.study.dto.*;
import com.study.model.*;
import com.study.repository.*;
import com.study.util.PromptTemplates;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final ContentRepository contentRepository;
    private final UserRepository userRepository;
    private final NvidiaAIService aiService;
    private final RAGService ragService;
    private final ObjectMapper objectMapper;
    private final AIModelConfig modelConfig;
    private final GamificationService gamificationService;

    public RoadmapService(RoadmapRepository roadmapRepository,
                          TopicRepository topicRepository,
                          ContentRepository contentRepository,
                          UserRepository userRepository,
                          NvidiaAIService aiService,
                          RAGService ragService,
                          ObjectMapper objectMapper,
                          AIModelConfig modelConfig,
                          GamificationService gamificationService) {
        this.roadmapRepository = roadmapRepository;
        this.topicRepository = topicRepository;
        this.contentRepository = contentRepository;
        this.userRepository = userRepository;
        this.aiService = aiService;
        this.ragService = ragService;
        this.objectMapper = objectMapper;
        this.modelConfig = modelConfig;
        this.gamificationService = gamificationService;
    }

    /**
     * Create a roadmap with SSE streaming
     */
    public Flux<ServerSentEvent<String>> createRoadmapStreaming(String userId, RoadmapRequest request) {
        if (!request.isGenerateWithAI() || !aiService.isAvailable()) {
            Roadmap roadmap = createManualRoadmap(userId, request);
            return Flux.just(ServerSentEvent.<String>builder()
                    .event("complete")
                    .data("{\"roadmapId\":\"" + roadmap.getId() + "\",\"totalTopics\":0}")
                    .build());
        }

        String prompt = PromptTemplates.formatRoadmapStreamPrompt(
                request.getGoal(),
                request.getCurrentLevel(),
                request.getDifficulty(),
                request.getEstimatedHoursPerWeek(),
                request.getPreferredLearningStyle()
        );

        String resolvedModel = modelConfig.resolveModelId(request.getModel());

        AIRequest aiRequest = AIRequest.withSystemPrompt(
                PromptTemplates.SYSTEM_PROMPT_ROADMAP_GENERATOR,
                prompt
        );
        aiRequest.setModel(resolvedModel);

        AtomicReference<String> buffer = new AtomicReference<>("");
        AtomicInteger sequenceOrder = new AtomicInteger(1);
        AtomicReference<Roadmap> draftRoadmap = new AtomicReference<>(null);

        return aiService.generateStream(aiRequest)
                .flatMap(chunk -> {
                    String current = buffer.get() + chunk;
                    List<ServerSentEvent<String>> events = new ArrayList<>();

                    // Very simple state machine/parser for THINKING and TOPIC
                    if (current.contains("THINKING:")) {
                        int thinkingStart = current.indexOf("THINKING:") + "THINKING:".length();
                        int topicStart = current.indexOf("TOPIC:", thinkingStart);
                        
                        if (topicStart != -1) {
                            // Thinking section is complete
                            String thinkingContent = current.substring(thinkingStart, topicStart).trim();
                            if (!thinkingContent.isEmpty()) {
                                String escapedThinking = thinkingContent.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
                                events.add(ServerSentEvent.<String>builder()
                                        .event("thinking")
                                        .data("{\"content\":\"" + escapedThinking + "\"}")
                                        .build());
                            }
                            current = current.substring(topicStart);
                        } else {
                            // Still thinking
                            String thinkingContent = current.substring(thinkingStart).trim();
                            if (!thinkingContent.isEmpty()) {
                                String escapedThinking = thinkingContent.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
                                events.add(ServerSentEvent.<String>builder()
                                        .event("thinking")
                                        .data("{\"content\":\"" + escapedThinking + "\"}")
                                        .build());
                                current = "THINKING:\n";
                            }
                        }
                    }

                    // Process TOPICs
                    while (current.contains("TOPIC:")) {
                        int topicStart = current.indexOf("TOPIC:") + "TOPIC:".length();
                        int nextTopicStart = current.indexOf("TOPIC:", topicStart);
                        
                        if (nextTopicStart != -1) {
                            // We have a complete topic
                            String topicJson = current.substring(topicStart, nextTopicStart).trim();
                            topicJson = aiService.extractJsonFromResponse(topicJson);
                            
                            try {
                                JsonNode topicNode = objectMapper.readTree(topicJson);
                                
                                if (draftRoadmap.get() == null) {
                                    Roadmap initial = Roadmap.builder()
                                            .userId(userId)
                                            .title(request.getTitle() != null && !request.getTitle().isEmpty() ? request.getTitle() : "AI Roadmap")
                                            .description(request.getDescription() != null ? request.getDescription() : "")
                                            .goal(request.getGoal())
                                            .difficulty(request.getDifficulty())
                                            .estimatedHours(request.getEstimatedHoursPerWeek() * 4)
                                            .estimatedWeeks(4)
                                            .tags(request.getTags() != null ? request.getTags() : new ArrayList<>())
                                            .status(Roadmap.RoadmapStatus.DRAFT)
                                            .progressPercentage(0.0)
                                            .completedTopics(0)
                                            .totalTopics(0)
                                            .build();
                                    draftRoadmap.set(roadmapRepository.save(initial));
                                }

                                Topic topic = Topic.builder()
                                        .roadmapId(draftRoadmap.get().getId())
                                        .userId(userId)
                                        .title(topicNode.has("title") ? topicNode.get("title").asText() : "Untitled Topic")
                                        .description(topicNode.has("description") ? topicNode.get("description").asText() : "")
                                        .sequenceOrder(sequenceOrder.getAndIncrement())
                                        .estimatedMinutes(topicNode.has("estimatedMinutes") ? topicNode.get("estimatedMinutes").asInt() : 30)
                                        .learningObjectives(extractStringArray(topicNode, "learningObjectives"))
                                        .prerequisites(extractStringArray(topicNode, "prerequisites"))
                                        .status(Topic.TopicStatus.AVAILABLE)
                                        .resources(extractResources(topicNode))
                                        .build();
                                
                                topic = topicRepository.save(topic);

                                com.fasterxml.jackson.databind.node.ObjectNode objNode = (com.fasterxml.jackson.databind.node.ObjectNode) topicNode;
                                objNode.put("id", topic.getId());
                                objNode.put("sequenceOrder", topic.getSequenceOrder());

                                events.add(ServerSentEvent.<String>builder()
                                        .event("topic")
                                        .data(objectMapper.writeValueAsString(topicNode))
                                        .build());

                            } catch (Exception e) {
                                log.error("Failed to parse topic JSON: " + topicJson, e);
                            }
                            
                            current = current.substring(nextTopicStart);
                        } else {
                            // Incomplete topic, wait for more chunks
                            break;
                        }
                    }
                    
                    buffer.set(current);
                    return Flux.fromIterable(events);
                })
                .concatWith(Flux.defer(() -> {
                    // Process any remaining topic at the end
                    String current = buffer.get();
                    if (current.contains("TOPIC:")) {
                        int topicStart = current.indexOf("TOPIC:") + "TOPIC:".length();
                        String topicJson = current.substring(topicStart).trim();
                        topicJson = aiService.extractJsonFromResponse(topicJson);
                        
                        try {
                            JsonNode topicNode = objectMapper.readTree(topicJson);
                            
                            if (draftRoadmap.get() == null) {
                                Roadmap initial = Roadmap.builder()
                                        .userId(userId)
                                        .title(request.getTitle() != null && !request.getTitle().isEmpty() ? request.getTitle() : "AI Roadmap")
                                        .description(request.getDescription() != null ? request.getDescription() : "")
                                        .goal(request.getGoal())
                                        .difficulty(request.getDifficulty())
                                        .estimatedHours(request.getEstimatedHoursPerWeek() * 4)
                                        .estimatedWeeks(4)
                                        .tags(request.getTags() != null ? request.getTags() : new ArrayList<>())
                                        .status(Roadmap.RoadmapStatus.DRAFT)
                                        .progressPercentage(0.0)
                                        .completedTopics(0)
                                        .totalTopics(0)
                                        .build();
                                draftRoadmap.set(roadmapRepository.save(initial));
                            }

                            Topic topic = Topic.builder()
                                    .roadmapId(draftRoadmap.get().getId())
                                    .userId(userId)
                                    .title(topicNode.has("title") ? topicNode.get("title").asText() : "Untitled Topic")
                                    .description(topicNode.has("description") ? topicNode.get("description").asText() : "")
                                    .sequenceOrder(sequenceOrder.getAndIncrement())
                                    .estimatedMinutes(topicNode.has("estimatedMinutes") ? topicNode.get("estimatedMinutes").asInt() : 30)
                                    .learningObjectives(extractStringArray(topicNode, "learningObjectives"))
                                    .prerequisites(extractStringArray(topicNode, "prerequisites"))
                                    .status(Topic.TopicStatus.AVAILABLE)
                                    .resources(extractResources(topicNode))
                                    .build();
                            
                            topic = topicRepository.save(topic);

                            com.fasterxml.jackson.databind.node.ObjectNode objNode = (com.fasterxml.jackson.databind.node.ObjectNode) topicNode;
                            objNode.put("id", topic.getId());
                            objNode.put("sequenceOrder", topic.getSequenceOrder());

                            ServerSentEvent<String> event = ServerSentEvent.<String>builder()
                                    .event("topic")
                                    .data(objectMapper.writeValueAsString(topicNode))
                                    .build();

                            Roadmap rm = draftRoadmap.get();
                            rm.setTotalTopics(sequenceOrder.get() - 1);
                            roadmapRepository.save(rm);

                            // Award XP for creating a roadmap
                            awardRoadmapCreationXP(userId);

                            ServerSentEvent<String> complete = ServerSentEvent.<String>builder()
                                    .event("complete")
                                    .data("{\"roadmapId\":\"" + rm.getId() + "\",\"totalTopics\":" + rm.getTotalTopics() + "}")
                                    .build();

                            return Flux.just(event, complete);

                        } catch (Exception e) {
                            log.error("Failed to parse final topic JSON", e);
                        }
                    }
                    
                    if (draftRoadmap.get() != null) {
                        Roadmap rm = draftRoadmap.get();
                        rm.setTotalTopics(sequenceOrder.get() - 1);
                        roadmapRepository.save(rm);

                        // Award XP for creating a roadmap
                        awardRoadmapCreationXP(userId);

                        return Flux.just(ServerSentEvent.<String>builder()
                                .event("complete")
                                .data("{\"roadmapId\":\"" + rm.getId() + "\",\"totalTopics\":" + rm.getTotalTopics() + "}")
                                .build());
                    }
                    
                    return Flux.empty();
                }));
    }

    /**
     * Create a new roadmap for a user
     */
    @Transactional
    public RoadmapResponse createRoadmap(String userId, RoadmapRequest request) {
        log.info("Creating roadmap for user {}: {}", userId, request.getTitle());
        
        Roadmap roadmap;
        
        if (request.isGenerateWithAI() && aiService.isAvailable()) {
            roadmap = generateRoadmapWithAI(userId, request);
        } else {
            roadmap = createManualRoadmap(userId, request);
        }
        
        // Award XP for creating a roadmap
        awardRoadmapCreationXP(userId);
        
        return mapToRoadmapResponse(roadmap);
    }

    /**
     * Generate roadmap using AI
     */
    private Roadmap generateRoadmapWithAI(String userId, RoadmapRequest request) {
        try {
            String prompt = PromptTemplates.formatRoadmapPrompt(
                    request.getGoal(),
                    request.getCurrentLevel(),
                    request.getDifficulty(),
                    request.getEstimatedHoursPerWeek(),
                    request.getPreferredLearningStyle()
            );
            
            AIResponse aiResponse = aiService.generateWithSystem(
                    PromptTemplates.SYSTEM_PROMPT_ROADMAP_GENERATOR,
                    prompt
            );
            
            if (!aiResponse.isSuccess()) {
                log.error("AI roadmap generation failed: {}", aiResponse.getErrorMessage());
                throw new RuntimeException("Failed to generate roadmap: " + aiResponse.getErrorMessage());
            }
            
            // Parse AI response
            String jsonContent = aiService.extractJsonFromResponse(aiResponse.getContent());
            JsonNode root = objectMapper.readTree(jsonContent);
            
            // Create roadmap entity
            Roadmap roadmap = Roadmap.builder()
                    .userId(userId)
                    .title(root.has("title") ? root.get("title").asText() : request.getTitle())
                    .description(root.has("description") ? root.get("description").asText() : request.getDescription())
                    .goal(request.getGoal())
                    .difficulty(request.getDifficulty())
                    .estimatedHours(root.has("estimatedHours") ? root.get("estimatedHours").asInt() : 0)
                    .estimatedWeeks(root.has("estimatedWeeks") ? root.get("estimatedWeeks").asInt() : 0)
                    .tags(extractTags(root))
                    .status(Roadmap.RoadmapStatus.DRAFT)
                    .progressPercentage(0.0)
                    .completedTopics(0)
                    .totalTopics(0)
                    .build();
            
            roadmap = roadmapRepository.save(roadmap);
            
            // Generate topics
            if (root.has("topics") && root.get("topics").isArray()) {
                List<Topic> topics = createTopicsFromAIResponse(roadmap.getId(), userId, root.get("topics"));
                roadmap.setTotalTopics(topics.size());
                roadmap.setTopicIds(topics.stream().map(Topic::getId).collect(Collectors.toList()));
                roadmap = roadmapRepository.save(roadmap);
            }
            
            return roadmap;
            
        } catch (Exception e) {
            log.error("Error generating AI roadmap", e);
            throw new RuntimeException("Failed to generate roadmap", e);
        }
    }

    /**
     * Create manual roadmap without AI
     */
    private Roadmap createManualRoadmap(String userId, RoadmapRequest request) {
        Roadmap roadmap = Roadmap.builder()
                .userId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .goal(request.getGoal())
                .difficulty(request.getDifficulty())
                .estimatedHours(request.getEstimatedHoursPerWeek() * 4)
                .estimatedWeeks(4)
                .tags(request.getTags())
                .status(Roadmap.RoadmapStatus.DRAFT)
                .progressPercentage(0.0)
                .completedTopics(0)
                .totalTopics(0)
                .build();
        
        return roadmapRepository.save(roadmap);
    }

    /**
     * Create topics from AI response
     */
    private List<Topic> createTopicsFromAIResponse(String roadmapId, String userId, JsonNode topicsNode) {
        List<Topic> topics = new ArrayList<>();
        int sequence = 1;
        
        for (JsonNode topicNode : topicsNode) {
            Topic topic = Topic.builder()
                    .roadmapId(roadmapId)
                    .userId(userId)
                    .title(topicNode.has("title") ? topicNode.get("title").asText() : "Untitled Topic")
                    .description(topicNode.has("description") ? topicNode.get("description").asText() : "")
                    .sequenceOrder(sequence++)
                    .estimatedMinutes(topicNode.has("estimatedMinutes") ? topicNode.get("estimatedMinutes").asInt() : 30)
                    .learningObjectives(extractStringArray(topicNode, "learningObjectives"))
                    .prerequisites(extractStringArray(topicNode, "prerequisites"))
                    .status(Topic.TopicStatus.AVAILABLE)
                    .resources(extractResources(topicNode))
                    .build();
            
            topics.add(topicRepository.save(topic));
        }
        
        return topics;
    }

    /**
     * Get roadmap by ID
     */
    public RoadmapResponse getRoadmap(String userId, String roadmapId) {
        Roadmap roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new RuntimeException("Roadmap not found"));
        
        return mapToRoadmapResponseWithTopics(roadmap);
    }

    /**
     * Get all roadmaps for a user
     */
    public List<RoadmapResponse> getUserRoadmaps(String userId) {
        return roadmapRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToRoadmapResponse)
                .collect(Collectors.toList());
    }

    /**
     * Start a roadmap
     */
    @Transactional
    public RoadmapResponse startRoadmap(String userId, String roadmapId) {
        Roadmap roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new RuntimeException("Roadmap not found"));
        
        if (roadmap.getStatus() == Roadmap.RoadmapStatus.DRAFT) {
            roadmap.setStatus(Roadmap.RoadmapStatus.ACTIVE);
            roadmap.setStartedAt(LocalDateTime.now());
            roadmap = roadmapRepository.save(roadmap);

            // Award XP for starting a roadmap
            gamificationService.awardXP(userId, GamificationService.XP_START_ROADMAP,
                    "Started roadmap: " + roadmap.getTitle(), "START_ROADMAP");
        }
        
        return mapToRoadmapResponse(roadmap);
    }

    /**
     * Delete a roadmap
     */
    @Transactional
    public void deleteRoadmap(String userId, String roadmapId) {
        Roadmap roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new RuntimeException("Roadmap not found"));
        
        // Delete associated topics and content
        List<Topic> topics = topicRepository.findByRoadmapIdOrderBySequenceOrderAsc(roadmapId);
        for (Topic topic : topics) {
            contentRepository.deleteAll(contentRepository.findByTopicIdOrderByCreatedAtAsc(topic.getId()));
        }
        topicRepository.deleteAll(topics);
        
        roadmapRepository.delete(roadmap);
    }

    /**
     * Generate content for a topic using AI
     */
    @Transactional
    public ContentResponse generateTopicContent(String userId, String topicId, String contentType) {
        Topic topic = topicRepository.findByIdAndUserId(topicId, userId)
                .orElseThrow(() -> new RuntimeException("Topic not found"));
        
        Roadmap roadmap = roadmapRepository.findById(topic.getRoadmapId())
                .orElseThrow(() -> new RuntimeException("Roadmap not found"));
        
        if (!aiService.isAvailable()) {
            throw new RuntimeException("AI service is not available");
        }
        
        try {
            String prompt = PromptTemplates.formatContentPrompt(
                    roadmap.getTitle(),
                    topic.getTitle(),
                    topic.getDescription(),
                    contentType != null ? contentType : "THEORY"
            );
            
            AIResponse aiResponse = aiService.generateWithSystem(
                    PromptTemplates.SYSTEM_PROMPT_CONTENT_GENERATOR,
                    prompt
            );
            
            if (!aiResponse.isSuccess()) {
                throw new RuntimeException("Failed to generate content: " + aiResponse.getErrorMessage());
            }
            
            String jsonContent = aiService.extractJsonFromResponse(aiResponse.getContent());
            JsonNode root = objectMapper.readTree(jsonContent);
            
            Content content = createContentFromAIResponse(topic, roadmap, userId, root, contentType);
            
            // Update topic with content reference
            topic.getContentIds().add(content.getId());
            topicRepository.save(topic);
            
            // Award XP for generating content
            gamificationService.awardXP(userId, GamificationService.XP_GENERATE_CONTENT,
                    "Generated content for: " + topic.getTitle(), "GENERATE_CONTENT");
            
            return mapToContentResponse(content);
            
        } catch (Exception e) {
            log.error("Error generating topic content", e);
            throw new RuntimeException("Failed to generate content", e);
        }
    }

    /**
     * Create content from AI response
     */
    private Content createContentFromAIResponse(Topic topic, Roadmap roadmap, String userId, 
                                                 JsonNode root, String contentType) {
        Content content = Content.builder()
                .topicId(topic.getId())
                .roadmapId(roadmap.getId())
                .userId(userId)
                .type(contentType != null ? Content.ContentType.valueOf(contentType) : Content.ContentType.THEORY)
                .title(root.has("title") ? root.get("title").asText() : topic.getTitle())
                .markdownContent(root.has("markdownContent") ? root.get("markdownContent").asText() : "")
                .rawContent(root.has("rawContent") ? root.get("rawContent").asText() : "")
                .codeExamples(extractCodeExamples(root))
                .quizQuestions(extractQuizQuestions(root))
                .keyPoints(extractStringArray(root, "keyPoints"))
                .aiGenerated(true)
                .aiModelVersion(modelConfig.getDefaultModelId())
                .readingTimeMinutes(root.has("readingTimeMinutes") ? root.get("readingTimeMinutes").asInt() : 10)
                .complexity(root.has("complexity") ? root.get("complexity").asDouble() : 0.5)
                .build();
        
        return contentRepository.save(content);
    }

    /**
     * Helper methods for mapping and extraction
     */
    private RoadmapResponse mapToRoadmapResponse(Roadmap roadmap) {
        return RoadmapResponse.builder()
                .id(roadmap.getId())
                .userId(roadmap.getUserId())
                .title(roadmap.getTitle())
                .description(roadmap.getDescription())
                .goal(roadmap.getGoal())
                .difficulty(roadmap.getDifficulty())
                .estimatedHours(roadmap.getEstimatedHours())
                .estimatedWeeks(roadmap.getEstimatedWeeks())
                .tags(roadmap.getTags())
                .status(roadmap.getStatus())
                .progressPercentage(roadmap.getProgressPercentage())
                .completedTopics(roadmap.getCompletedTopics())
                .totalTopics(roadmap.getTotalTopics())
                .createdAt(roadmap.getCreatedAt())
                .updatedAt(roadmap.getUpdatedAt())
                .startedAt(roadmap.getStartedAt())
                .completedAt(roadmap.getCompletedAt())
                .build();
    }

    private RoadmapResponse mapToRoadmapResponseWithTopics(Roadmap roadmap) {
        RoadmapResponse response = mapToRoadmapResponse(roadmap);
        
        List<Topic> topics = topicRepository.findByRoadmapIdOrderBySequenceOrderAsc(roadmap.getId());
        List<RoadmapResponse.TopicSummaryResponse> topicSummaries = topics.stream()
                .map(topic -> RoadmapResponse.TopicSummaryResponse.builder()
                        .id(topic.getId())
                        .title(topic.getTitle())
                        .sequenceOrder(topic.getSequenceOrder())
                        .status(topic.getStatus().name())
                        .estimatedMinutes(topic.getEstimatedMinutes())
                        .completedContentCount((int) contentRepository.countByTopicId(topic.getId()))
                        .totalContentCount((int) contentRepository.countByTopicId(topic.getId()))
                        .build())
                .collect(Collectors.toList());
        
        response.setTopics(topicSummaries);
        return response;
    }

    private ContentResponse mapToContentResponse(Content content) {
        return ContentResponse.builder()
                .id(content.getId())
                .topicId(content.getTopicId())
                .roadmapId(content.getRoadmapId())
                .type(content.getType().name())
                .title(content.getTitle())
                .markdownContent(content.getMarkdownContent())
                .keyPoints(content.getKeyPoints())
                .aiGenerated(content.isAiGenerated())
                .aiModelVersion(content.getAiModelVersion())
                .readingTimeMinutes(content.getReadingTimeMinutes())
                .complexity(content.getComplexity())
                .createdAt(content.getCreatedAt())
                .updatedAt(content.getUpdatedAt())
                .build();
    }

    private List<String> extractTags(JsonNode root) {
        List<String> tags = new ArrayList<>();
        if (root.has("tags") && root.get("tags").isArray()) {
            for (JsonNode tag : root.get("tags")) {
                tags.add(tag.asText());
            }
        }
        return tags;
    }

    private List<String> extractStringArray(JsonNode node, String fieldName) {
        List<String> result = new ArrayList<>();
        if (node.has(fieldName) && node.get(fieldName).isArray()) {
            for (JsonNode item : node.get(fieldName)) {
                result.add(item.asText());
            }
        }
        return result;
    }

    private List<Topic.Resource> extractResources(JsonNode topicNode) {
        List<Topic.Resource> resources = new ArrayList<>();
        if (topicNode.has("resources") && topicNode.get("resources").isArray()) {
            for (JsonNode resNode : topicNode.get("resources")) {
                Topic.Resource resource = Topic.Resource.builder()
                        .type(resNode.has("type") ? resNode.get("type").asText() : "article")
                        .title(resNode.has("title") ? resNode.get("title").asText() : "Resource")
                        .url(resNode.has("url") ? resNode.get("url").asText() : "")
                        .description(resNode.has("description") ? resNode.get("description").asText() : "")
                        .build();
                resources.add(resource);
            }
        }
        return resources;
    }

    private List<String> extractCodeExamples(JsonNode root) {
        List<String> examples = new ArrayList<>();
        if (root.has("codeExamples") && root.get("codeExamples").isArray()) {
            for (JsonNode example : root.get("codeExamples")) {
                examples.add(example.toString());
            }
        }
        return examples;
    }

    private List<Content.QuizQuestion> extractQuizQuestions(JsonNode root) {
        List<Content.QuizQuestion> questions = new ArrayList<>();
        if (root.has("quizQuestions") && root.get("quizQuestions").isArray()) {
            for (JsonNode qNode : root.get("quizQuestions")) {
                Content.QuizQuestion question = Content.QuizQuestion.builder()
                        .question(qNode.has("question") ? qNode.get("question").asText() : "")
                        .options(extractStringArray(qNode, "options"))
                        .correctOptionIndex(qNode.has("correctOptionIndex") ? qNode.get("correctOptionIndex").asInt() : 0)
                        .explanation(qNode.has("explanation") ? qNode.get("explanation").asText() : "")
                        .difficulty(qNode.has("difficulty") ? qNode.get("difficulty").asText() : "medium")
                        .build();
                questions.add(question);
            }
        }
        return questions;
    }

    /**
     * Award XP for creating a roadmap, including first-roadmap bonus.
     */
    private void awardRoadmapCreationXP(String userId) {
        try {
            gamificationService.awardXP(userId, GamificationService.XP_CREATE_ROADMAP,
                    "Created a roadmap", "CREATE_ROADMAP");

            // Check if this is the user's first roadmap for bonus XP
            long roadmapCount = roadmapRepository.countByUserId(userId);
            if (roadmapCount == 1) {
                gamificationService.awardXP(userId, GamificationService.XP_FIRST_ROADMAP,
                        "First roadmap bonus!", "FIRST_ROADMAP");
            }
        } catch (Exception e) {
            log.error("Failed to award roadmap creation XP for user {}: {}", userId, e.getMessage());
        }
    }
}
