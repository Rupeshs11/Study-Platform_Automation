package com.study.dto;

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
public class AIResponse {
    
    private boolean success;
    
    private String content;
    
    private String model;
    
    private int promptTokens;
    
    private int completionTokens;
    
    private int totalTokens;
    
    private String errorMessage;
    
    private long responseTimeMs;
    
    @Builder.Default
    private List<Choice> choices = new ArrayList<>();
    
    public static AIResponse error(String message) {
        return AIResponse.builder()
                .success(false)
                .errorMessage(message)
                .build();
    }
    
    public static AIResponse success(String content) {
        return AIResponse.builder()
                .success(true)
                .content(content)
                .build();
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Choice {
        private String text;
        private int index;
        private String finishReason;
    }
}
