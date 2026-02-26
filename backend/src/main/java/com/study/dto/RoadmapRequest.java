package com.study.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapRequest {
    
    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;
    
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
    
    @NotBlank(message = "Learning goal is required")
    @Size(min = 10, max = 500, message = "Goal must be between 10 and 500 characters")
    private String goal;
    
    @NotBlank(message = "Difficulty level is required")
    private String difficulty;
    
    private int estimatedHoursPerWeek;
    
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    
    private String currentLevel;
    
    private String preferredLearningStyle;
    
    private String model;
    
    @Builder.Default
    private boolean generateWithAI = true;
}
