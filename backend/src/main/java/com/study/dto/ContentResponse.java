package com.study.dto;

import com.study.model.Content;
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
public class ContentResponse {
    
    private String id;
    private String topicId;
    private String roadmapId;
    private String type;
    private String title;
    private String markdownContent;
    
    @Builder.Default
    private List<CodeExampleResponse> codeExamples = new ArrayList<>();
    
    @Builder.Default
    private List<QuizQuestionResponse> quizQuestions = new ArrayList<>();
    
    @Builder.Default
    private List<String> keyPoints = new ArrayList<>();
    
    private boolean aiGenerated;
    private String aiModelVersion;
    private int readingTimeMinutes;
    private double complexity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodeExampleResponse {
        private String language;
        private String code;
        private String explanation;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestionResponse {
        private String question;
        private List<String> options;
        private int correctOptionIndex;
        private String explanation;
        private String difficulty;
        private boolean answered;
        private boolean answeredCorrectly;
    }
}
