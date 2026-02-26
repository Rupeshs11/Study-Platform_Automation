package com.study.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.study.config.AIModelConfig;
import com.study.dto.AIRequest;
import com.study.dto.AIResponse;
import com.study.dto.DoubtRequest;
import com.study.model.*;
import com.study.repository.*;
import com.study.util.PromptTemplates;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class DoubtService {

    private final UserInteractionRepository interactionRepository;
    private final TopicRepository topicRepository;
    private final RoadmapRepository roadmapRepository;
    private final ContentRepository contentRepository;
    private final NvidiaAIService aiService;
    private final RAGService ragService;
    private final ObjectMapper objectMapper;
    private final AIModelConfig modelConfig;
    private final GamificationService gamificationService;

    public DoubtService(UserInteractionRepository interactionRepository,
                        TopicRepository topicRepository,
                        RoadmapRepository roadmapRepository,
                        ContentRepository contentRepository,
                        NvidiaAIService aiService,
                        RAGService ragService,
                        ObjectMapper objectMapper,
                        AIModelConfig modelConfig,
                        GamificationService gamificationService) {
        this.interactionRepository = interactionRepository;
        this.topicRepository = topicRepository;
        this.roadmapRepository = roadmapRepository;
        this.contentRepository = contentRepository;
        this.aiService = aiService;
        this.ragService = ragService;
        this.objectMapper = objectMapper;
        this.modelConfig = modelConfig;
        this.gamificationService = gamificationService;
    }

    /**
     * Solve user doubt using AI with context
     */
    public Map<String, Object> solveDoubt(String userId, DoubtRequest request) {
        log.info("Processing doubt for user {}: {}", userId, request.getDoubt());
        
        // Create interaction record
        UserInteraction interaction = UserInteraction.builder()
                .userId(userId)
                .roadmapId(request.getRoadmapId())
                .topicId(request.getTopicId())
                .type(UserInteraction.InteractionType.DOUBT)
                .content(request.getDoubt())
                .resolved(false)
                .build();
        
        // Get context for the doubt
        String context = buildContext(userId, request);
        String topicInfo = getTopicInfo(request.getTopicId());
        String roadmapInfo = getRoadmapInfo(request.getRoadmapId());
        
        // Get history context if requested
        String historyContext = "";
        if (request.isIncludeUserHistory()) {
            historyContext = getHistoryContext(userId, request.getMaxHistoryItems());
        }
        
        // Build prompt for AI
        String prompt = PromptTemplates.formatDoubtPrompt(
                request.getDoubt(),
                roadmapInfo,
                topicInfo,
                context,
                historyContext
        );
        
        // Generate AI response (with optional model selection)
        String resolvedModel = modelConfig.resolveModelId(request.getModel());
        AIResponse aiResponse = aiService.generateWithSystem(
                PromptTemplates.SYSTEM_PROMPT_DOUBT_SOLVER,
                prompt,
                resolvedModel
        );
        
        // Update interaction with response
        if (aiResponse.isSuccess()) {
            interaction.setAiResponse(aiResponse.getContent());
            interaction.setResolved(true);
            interaction.setConfidence(0.85); // Default confidence
            interaction.setRespondedAt(LocalDateTime.now());
        } else {
            interaction.setAiResponse("I'm sorry, I couldn't process your question at the moment. Please try again.");
            interaction.setResolved(false);
            interaction.setConfidence(0.0);
        }
        
        // Save interaction with RAG
        interaction = ragService.saveInteraction(interaction);
        
        // Award XP for asking a doubt
        try {
            gamificationService.awardXP(userId, GamificationService.XP_ASK_DOUBT,
                    "Asked a doubt", "ASK_DOUBT");
        } catch (Exception e) {
            log.error("Failed to award doubt XP for user {}: {}", userId, e.getMessage());
        }
        
        // Prepare response
        Map<String, Object> response = new HashMap<>();
        response.put("doubtId", interaction.getId());
        response.put("answer", interaction.getAiResponse());
        response.put("resolved", interaction.isResolved());
        response.put("confidence", interaction.getConfidence());
        response.put("timestamp", interaction.getCreatedAt());
        response.put("suggestedTopics", suggestRelatedTopics(userId, request.getDoubt()));
        
        return response;
    }

    /**
     * Get user doubt history
     */
    public List<UserInteraction> getDoubtHistory(String userId, int limit) {
        return interactionRepository.findByUserIdAndTypeOrderByCreatedAtDesc(
                userId, UserInteraction.InteractionType.DOUBT)
                .stream()
                .limit(limit)
                .toList();
    }

    /**
     * Get insights about user's learning patterns
     */
    public Map<String, Object> getLearningInsights(String userId) {
        return ragService.getUserLearningInsights(userId);
    }

    /**
     * Build context for doubt solving
     */
    private String buildContext(String userId, DoubtRequest request) {
        StringBuilder context = new StringBuilder();
        
        // Add current topic context
        if (request.getTopicId() != null) {
            List<Content> contents = contentRepository.findByTopicIdOrderByCreatedAtAsc(request.getTopicId());
            if (!contents.isEmpty()) {
                context.append("Current Learning Materials:\n");
                for (Content content : contents) {
                    context.append("- ").append(content.getTitle())
                           .append(" (").append(content.getType()).append(")\n");
                    if (content.getKeyPoints() != null && !content.getKeyPoints().isEmpty()) {
                        context.append("  Key concepts: ")
                               .append(String.join(", ", content.getKeyPoints().subList(0, 
                                   Math.min(3, content.getKeyPoints().size()))))
                               .append("\n");
                    }
                }
            }
        }
        
        // Add relevant context from user history
        String relevantContext = ragService.getRelevantContext(
                userId, 
                request.getRoadmapId(), 
                request.getTopicId(), 
                request.getDoubt(), 
                5
        );
        
        if (!relevantContext.isEmpty()) {
            context.append("\n").append(relevantContext);
        }
        
        return context.toString();
    }

    /**
     * Get topic information
     */
    private String getTopicInfo(String topicId) {
        if (topicId == null) return "General learning";
        
        return topicRepository.findById(topicId)
                .map(topic -> topic.getTitle() + " - " + topic.getDescription())
                .orElse("Unknown topic");
    }

    /**
     * Get roadmap information
     */
    private String getRoadmapInfo(String roadmapId) {
        if (roadmapId == null) return "General learning path";
        
        return roadmapRepository.findById(roadmapId)
                .map(roadmap -> roadmap.getTitle() + " (" + roadmap.getGoal() + ")")
                .orElse("Unknown roadmap");
    }

    /**
     * Get user history context
     */
    private String getHistoryContext(String userId, int limit) {
        List<UserInteraction> history = ragService.getUserLearningHistory(userId, limit);
        
        if (history.isEmpty()) {
            return "";
        }
        
        StringBuilder context = new StringBuilder();
        for (UserInteraction interaction : history) {
            if (interaction.getType() == UserInteraction.InteractionType.DOUBT && 
                interaction.getAiResponse() != null) {
                context.append("Previous Q: ").append(interaction.getContent()).append("\n");
                context.append("A: ").append(interaction.getAiResponse().substring(0, 
                        Math.min(150, interaction.getAiResponse().length()))).append("...\n\n");
            }
        }
        
        return context.toString();
    }

    /**
     * Suggest related topics based on doubt content
     */
    private List<Map<String, String>> suggestRelatedTopics(String userId, String doubt) {
        List<Map<String, String>> suggestions = new ArrayList<>();
        
        // Get user's topics
        List<Topic> userTopics = topicRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Simple keyword matching for suggestions
        Set<String> doubtKeywords = extractKeywords(doubt);
        
        for (Topic topic : userTopics) {
            Set<String> topicKeywords = new HashSet<>();
            topicKeywords.addAll(extractKeywords(topic.getTitle()));
            topicKeywords.addAll(extractKeywords(topic.getDescription()));
            
            // Check overlap
            Set<String> intersection = new HashSet<>(doubtKeywords);
            intersection.retainAll(topicKeywords);
            
            if (!intersection.isEmpty()) {
                Map<String, String> suggestion = new HashMap<>();
                suggestion.put("topicId", topic.getId());
                suggestion.put("title", topic.getTitle());
                suggestion.put("reason", "Related to your question about " + String.join(", ", intersection));
                suggestions.add(suggestion);
                
                if (suggestions.size() >= 3) break;
            }
        }
        
        return suggestions;
    }

    /**
     * Extract keywords from text
     */
    private Set<String> extractKeywords(String text) {
        if (text == null || text.isEmpty()) {
            return new HashSet<>();
        }
        
        String[] commonWords = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                               "being", "have", "has", "had", "do", "does", "did", "will",
                               "would", "could", "should", "may", "might", "must", "can"};
        
        Set<String> commonWordsSet = new HashSet<>(Arrays.asList(commonWords));
        
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(word -> word.length() > 3)
                .filter(word -> !commonWordsSet.contains(word))
                .collect(java.util.stream.Collectors.toSet());
    }
}
