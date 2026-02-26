package com.study.dto;

import com.study.model.Roadmap;
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
public class RoadmapResponse {
    
    private String id;
    private String userId;
    private String title;
    private String description;
    private String goal;
    private String difficulty;
    private int estimatedHours;
    private int estimatedWeeks;
    
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    
    @Builder.Default
    private List<TopicSummaryResponse> topics = new ArrayList<>();
    
    private Roadmap.RoadmapStatus status;
    private double progressPercentage;
    private int completedTopics;
    private int totalTopics;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicSummaryResponse {
        private String id;
        private String title;
        private int sequenceOrder;
        private String status;
        private int estimatedMinutes;
        private int completedContentCount;
        private int totalContentCount;
    }
}
