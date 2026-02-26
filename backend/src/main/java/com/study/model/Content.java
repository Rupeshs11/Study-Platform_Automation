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
@Document(collection = "contents")
public class Content {
    
    @Id
    private String id;
    
    @Indexed
    private String topicId;
    
    @Indexed
    private String roadmapId;
    
    @Indexed
    private String userId;
    
    private ContentType type;
    
    private String title;
    
    private String markdownContent;
    
    private String rawContent;
    
    @Builder.Default
    private List<String> codeExamples = new ArrayList<>();
    
    @Builder.Default
    private List<QuizQuestion> quizQuestions = new ArrayList<>();
    
    @Builder.Default
    private List<String> keyPoints = new ArrayList<>();
    
    private boolean aiGenerated;
    
    private String aiModelVersion;
    
    private int readingTimeMinutes;
    
    private double complexity;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestion {
        private String question;
        private List<String> options;
        private int correctOptionIndex;
        private String explanation;
        private String difficulty;
    }
    
    public enum ContentType {
        THEORY, EXAMPLE, EXERCISE, QUIZ, SUMMARY, DOUBT_RESPONSE
    }
}
