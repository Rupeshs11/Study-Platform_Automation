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
@Document(collection = "roadmaps")
public class Roadmap {
    
    @Id
    private String id;
    
    @Indexed
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
    private List<String> topicIds = new ArrayList<>();
    
    @Builder.Default
    private RoadmapStatus status = RoadmapStatus.DRAFT;
    
    private double progressPercentage;
    
    private int completedTopics;
    
    private int totalTopics;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private LocalDateTime startedAt;
    
    private LocalDateTime completedAt;
    
    public enum RoadmapStatus {
        DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED
    }
}
