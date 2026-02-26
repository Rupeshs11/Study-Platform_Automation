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
public class DoubtRequest {
    
    private String roadmapId;
    
    private String topicId;
    
    private String doubt;
    
    @Builder.Default
    private List<String> contextContentIds = new ArrayList<>();
    
    private boolean includeUserHistory;
    
    @Builder.Default
    private int maxHistoryItems = 5;
    
    /** AI model to use — null means use system default */
    private String model;
    
    public static DoubtRequest of(String doubt) {
        return DoubtRequest.builder()
                .doubt(doubt)
                .build();
    }
    
    public static DoubtRequest forTopic(String topicId, String doubt) {
        return DoubtRequest.builder()
                .topicId(topicId)
                .doubt(doubt)
                .build();
    }
}
