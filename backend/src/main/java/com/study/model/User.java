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
import java.util.HashSet;
import java.util.Set;

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String email;
    
    @Indexed(unique = true)
    private String username;
    
    private String password;
    
    private String fullName;
    
    @Builder.Default
    private Set<String> roles = new HashSet<>();
    
    @Builder.Default
    private boolean active = true;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    private LocalDateTime lastLogin;
    
    // User learning preferences and memory (for AI)
    private String learningGoal;
    
    private String currentLevel; // beginner, intermediate, advanced
    
    @Builder.Default
    private Set<String> completedTopics = new HashSet<>();
    
    @Builder.Default
    private Set<String> interests = new HashSet<>();
    
    public enum Role {
        USER,
        ADMIN
    }
}
