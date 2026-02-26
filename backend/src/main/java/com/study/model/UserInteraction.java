package com.study.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_interactions")
public class UserInteraction {
    
    @Id
    private String id;
    
    @Indexed
    private String userId;
    
    @Indexed
    private String roadmapId;
    
    @Indexed
    private String topicId;
    
    private InteractionType type;
    
    private String content;
    
    private String aiResponse;
    
    @Builder.Default
    private List<String> contextTopics = new ArrayList<>();
    
    @Builder.Default
    private List<String> relevantContentIds = new ArrayList<>();
    
    @Builder.Default
    private List<Double> embedding = new ArrayList<>();
    
    private boolean resolved;
    
    private double confidence;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    private LocalDateTime respondedAt;
    
    public enum InteractionType {
        DOUBT, 
        CLARIFICATION,
        DEEP_DIVE,
        EXAMPLE_REQUEST,
        QUIZ_HINT,
        GENERAL_QUESTION
    }
}
