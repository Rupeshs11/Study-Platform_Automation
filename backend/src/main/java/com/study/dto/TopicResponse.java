package com.study.dto;

import com.study.model.Topic;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicResponse {
    
    private String id;
    private String roadmapId;
    private String title;
    private String description;
    private int sequenceOrder;
    private int estimatedMinutes;
    
    @Builder.Default
    private List<String> prerequisites = new ArrayList<>();
    
    @Builder.Default
    private List<String> learningObjectives = new ArrayList<>();
    
    @Builder.Default
    private List<ContentSummaryResponse> contents = new ArrayList<>();
    
    private Topic.TopicStatus status;
    
    @Builder.Default
    private List<ResourceResponse> resources = new ArrayList<>();
    
    private String aiGeneratedSummary;
    private String keyTakeaways;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceResponse {
        private String type;
        private String title;
        private String url;
        private String description;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentSummaryResponse {
        private String id;
        private String title;
        private String type;
        private int readingTimeMinutes;
        private boolean completed;
    }
}
