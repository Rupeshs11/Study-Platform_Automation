package com.study.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "topics")
public class Topic {
    
    @Id
    private String id;
    
    @Indexed
    private String roadmapId;
    
    @Indexed
    private String userId;
    
    private String title;
    
    private String description;
    
    private int sequenceOrder;
    
    private int estimatedMinutes;
    
    @Builder.Default
    private List<String> prerequisites = new ArrayList<>();
    
    @Builder.Default
    private List<String> learningObjectives = new ArrayList<>();
    
    @Builder.Default
    private List<String> contentIds = new ArrayList<>();
    
    @Builder.Default
    private TopicStatus status = TopicStatus.LOCKED;
    
    @Builder.Default
    private List<Resource> resources = new ArrayList<>();
    
    private String aiGeneratedSummary;
    
    private String keyTakeaways;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private LocalDateTime startedAt;
    
    private LocalDateTime completedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Resource {
        private String type;
        private String title;
        private String url;
        private String description;
    }
    
    public enum TopicStatus {
        LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED
    }
}
