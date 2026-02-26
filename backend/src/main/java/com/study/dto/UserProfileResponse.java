package com.study.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    
    private String id;
    private String username;
    private String email;
    private String fullName;
    private Set<String> roles;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
    private String learningGoal;
    private String currentLevel;
    private Set<String> completedTopics;
    private Set<String> interests;
}
