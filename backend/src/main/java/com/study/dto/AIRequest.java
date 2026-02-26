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
public class AIRequest {
    
    private String prompt;
    
    @Builder.Default
    private List<Message> messages = new ArrayList<>();
    
    private String systemPrompt;
    
    @Builder.Default
    private double temperature = 0.7;
    
    @Builder.Default
    private int maxTokens = 16384;
    
    @Builder.Default
    private boolean stream = false;
    
    private String model;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Message {
        private String role;
        private String content;
    }
    
    public static AIRequest withPrompt(String prompt) {
        return AIRequest.builder()
                .prompt(prompt)
                .build();
    }
    
    public static AIRequest withSystemPrompt(String systemPrompt, String userPrompt) {
        List<Message> messages = new ArrayList<>();
        messages.add(Message.builder()
                .role("system")
                .content(systemPrompt)
                .build());
        messages.add(Message.builder()
                .role("user")
                .content(userPrompt)
                .build());
        
        return AIRequest.builder()
                .messages(messages)
                .build();
    }
}
