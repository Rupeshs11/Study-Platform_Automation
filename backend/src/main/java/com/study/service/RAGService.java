package com.study.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.study.model.Content;
import com.study.model.Topic;
import com.study.model.UserInteraction;
import com.study.repository.ContentRepository;
import com.study.repository.TopicRepository;
import com.study.repository.UserInteractionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class RAGService {

    private final UserInteractionRepository interactionRepository;
    private final ContentRepository contentRepository;
    private final TopicRepository topicRepository;
    private final ObjectMapper objectMapper;

    public RAGService(UserInteractionRepository interactionRepository,
                      ContentRepository contentRepository,
                      TopicRepository topicRepository,
                      ObjectMapper objectMapper) {
        this.interactionRepository = interactionRepository;
        this.contentRepository = contentRepository;
        this.topicRepository = topicRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Get relevant context for a user doubt/question
     * Combines user history, topic content, and related materials
     */
    public String getRelevantContext(String userId, String roadmapId, String topicId, String query, int maxItems) {
        StringBuilder context = new StringBuilder();
        
        // 1. Get user's recent learning history
        List<UserInteraction> recentHistory = getUserLearningHistory(userId, maxItems / 2);
        if (!recentHistory.isEmpty()) {
            context.append("User's Recent Learning Context:\n");
            for (UserInteraction interaction : recentHistory) {
                context.append("- ").append(interaction.getType()).append(": ")
                       .append(interaction.getContent()).append("\n");
            }
            context.append("\n");
        }
        
        // 2. Get current topic information
        if (topicId != null) {
            Optional<Topic> topicOpt = topicRepository.findById(topicId);
            if (topicOpt.isPresent()) {
                Topic topic = topicOpt.get();
                context.append("Current Topic: ").append(topic.getTitle()).append("\n");
                context.append("Description: ").append(topic.getDescription()).append("\n");
                context.append("Learning Objectives: ").append(
                    String.join(", ", topic.getLearningObjectives())
                ).append("\n\n");
            }
        }
        
        // 3. Get relevant content for the topic
        if (topicId != null) {
            List<Content> contents = contentRepository.findByTopicIdOrderByCreatedAtAsc(topicId);
            if (!contents.isEmpty()) {
                context.append("Relevant Learning Materials:\n");
                for (Content content : contents.stream().limit(maxItems / 2).collect(Collectors.toList())) {
                    context.append("- ").append(content.getTitle())
                           .append(" (").append(content.getType()).append(")\n");
                    if (content.getKeyPoints() != null && !content.getKeyPoints().isEmpty()) {
                        context.append("  Key points: ")
                               .append(String.join(", ", content.getKeyPoints().subList(0, 
                                   Math.min(3, content.getKeyPoints().size()))))
                               .append("\n");
                    }
                }
                context.append("\n");
            }
        }
        
        // 4. Get similar past doubts/interactions
        List<UserInteraction> similarDoubts = findSimilarInteractions(userId, query, maxItems / 3);
        if (!similarDoubts.isEmpty()) {
            context.append("Similar Previous Questions:\n");
            for (UserInteraction doubt : similarDoubts) {
                context.append("Q: ").append(doubt.getContent()).append("\n");
                if (doubt.getAiResponse() != null) {
                    context.append("A: ").append(doubt.getAiResponse().substring(0, 
                        Math.min(200, doubt.getAiResponse().length()))).append("...\n");
                }
            }
            context.append("\n");
        }
        
        return context.toString();
    }

    /**
     * Get user's recent learning interactions
     */
    public List<UserInteraction> getUserLearningHistory(String userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return interactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).getContent();
    }

    /**
     * Find similar past interactions based on query
     * Simple keyword matching - can be enhanced with embeddings
     */
    public List<UserInteraction> findSimilarInteractions(String userId, String query, int limit) {
        // Get recent interactions and filter by keyword similarity
        List<UserInteraction> allInteractions = interactionRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
        
        if (query == null || query.isEmpty()) {
            return allInteractions.stream().limit(limit).collect(Collectors.toList());
        }
        
        Set<String> queryKeywords = extractKeywords(query);
        
        return allInteractions.stream()
                .filter(interaction -> {
                    Set<String> interactionKeywords = extractKeywords(interaction.getContent());
                    // Check for keyword overlap
                    Set<String> intersection = new HashSet<>(queryKeywords);
                    intersection.retainAll(interactionKeywords);
                    return !intersection.isEmpty();
                })
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Create a simple embedding for text using keyword extraction
     * In production, this should use a proper embedding model (e.g., OpenAI, HuggingFace)
     */
    public List<Double> createEmbedding(String text) {
        // Simple keyword-based embedding for now
        // In production, integrate with NVIDIA's embedding API or similar
        Set<String> keywords = extractKeywords(text);
        
        // Create a sparse vector representation
        // This is a simplified approach - real embeddings should be dense vectors
        List<Double> embedding = new ArrayList<>();
        for (String keyword : keywords) {
            // Use hash-based pseudo-random values (deterministic for same keywords)
            embedding.add((double) keyword.hashCode());
        }
        
        // Normalize to fixed size
        while (embedding.size() < 50) {
            embedding.add(0.0);
        }
        
        return embedding.subList(0, 50);
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    public double calculateSimilarity(List<Double> embedding1, List<Double> embedding2) {
        if (embedding1 == null || embedding2 == null || embedding1.size() != embedding2.size()) {
            return 0.0;
        }
        
        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;
        
        for (int i = 0; i < embedding1.size(); i++) {
            dotProduct += embedding1.get(i) * embedding2.get(i);
            norm1 += embedding1.get(i) * embedding1.get(i);
            norm2 += embedding2.get(i) * embedding2.get(i);
        }
        
        if (norm1 == 0.0 || norm2 == 0.0) {
            return 0.0;
        }
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Save user interaction with embedding for future retrieval
     */
    public UserInteraction saveInteraction(UserInteraction interaction) {
        // Generate and store embedding
        List<Double> embedding = createEmbedding(interaction.getContent());
        interaction.setEmbedding(embedding);
        
        return interactionRepository.save(interaction);
    }

    /**
     * Get learning insights for a user
     */
    public Map<String, Object> getUserLearningInsights(String userId) {
        Map<String, Object> insights = new HashMap<>();
        
        // Get interaction statistics
        List<UserInteraction> allInteractions = interactionRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
        
        long doubtCount = allInteractions.stream()
                .filter(i -> i.getType() == UserInteraction.InteractionType.DOUBT)
                .count();
        
        long unresolvedCount = allInteractions.stream()
                .filter(i -> !i.isResolved())
                .count();
        
        // Get most common topics of confusion
        Map<String, Long> topicConfusion = allInteractions.stream()
                .filter(i -> i.getTopicId() != null)
                .collect(Collectors.groupingBy(UserInteraction::getTopicId, Collectors.counting()));
        
        List<String> challengingTopics = topicConfusion.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        
        insights.put("totalInteractions", allInteractions.size());
        insights.put("doubtCount", doubtCount);
        insights.put("unresolvedCount", unresolvedCount);
        insights.put("challengingTopics", challengingTopics);
        insights.put("engagementScore", calculateEngagementScore(allInteractions));
        
        return insights;
    }

    /**
     * Extract keywords from text
     */
    private Set<String> extractKeywords(String text) {
        if (text == null || text.isEmpty()) {
            return new HashSet<>();
        }
        
        // Simple keyword extraction - remove common words and split
        String[] commonWords = {"the", "a", "an", "is", "are", "was", "were", "be", "been", 
                               "being", "have", "has", "had", "do", "does", "did", "will",
                               "would", "could", "should", "may", "might", "must", "can",
                               "this", "that", "these", "those", "i", "you", "he", "she",
                               "it", "we", "they", "what", "which", "who", "when", "where",
                               "why", "how", "all", "any", "both", "each", "few", "more",
                               "most", "other", "some", "such", "no", "nor", "not", "only",
                               "own", "same", "so", "than", "too", "very", "just", "and",
                               "but", "if", "or", "because", "as", "until", "while", "of",
                               "at", "by", "for", "with", "through", "during", "before",
                               "after", "above", "below", "up", "down", "in", "out", "on",
                               "off", "over", "under", "again", "further", "then", "once"};
        
        Set<String> commonWordsSet = new HashSet<>(Arrays.asList(commonWords));
        
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(word -> word.length() > 2)
                .filter(word -> !commonWordsSet.contains(word))
                .collect(Collectors.toSet());
    }

    /**
     * Calculate user engagement score
     */
    private double calculateEngagementScore(List<UserInteraction> interactions) {
        if (interactions.isEmpty()) {
            return 0.0;
        }
        
        // Factors: frequency, diversity of types, recency
        long uniqueTypes = interactions.stream()
                .map(UserInteraction::getType)
                .distinct()
                .count();
        
        double typeDiversity = uniqueTypes / 6.0; // 6 types of interactions
        double frequencyScore = Math.min(interactions.size() / 10.0, 1.0);
        
        return (typeDiversity * 0.4 + frequencyScore * 0.6) * 100;
    }
}
