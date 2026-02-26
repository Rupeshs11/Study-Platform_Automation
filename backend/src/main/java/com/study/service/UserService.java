package com.study.service;

import com.study.dto.UserProfileResponse;
import com.study.model.User;
import com.study.repository.UserRepository;
import com.study.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public User getCurrentUser() {
        String userId = getCurrentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
    
    public String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserPrincipal) {
            return ((UserPrincipal) principal).getId();
        }
        return null;
    }
    
    public UserProfileResponse getCurrentUserProfile() {
        User user = getCurrentUser();
        return mapToUserProfileResponse(user);
    }
    
    public UserProfileResponse updateUserProfile(String fullName, String learningGoal, String currentLevel) {
        User user = getCurrentUser();
        
        if (fullName != null) user.setFullName(fullName);
        if (learningGoal != null) user.setLearningGoal(learningGoal);
        if (currentLevel != null) user.setCurrentLevel(currentLevel);
        
        user = userRepository.save(user);
        return mapToUserProfileResponse(user);
    }
    
    public void updateLearningPreferences(String learningGoal, String currentLevel, java.util.Set<String> interests) {
        User user = getCurrentUser();
        
        if (learningGoal != null) user.setLearningGoal(learningGoal);
        if (currentLevel != null) user.setCurrentLevel(currentLevel);
        if (interests != null) user.setInterests(interests);
        
        userRepository.save(user);
    }
    
    public void addCompletedTopic(String topicId) {
        User user = getCurrentUser();
        user.getCompletedTopics().add(topicId);
        userRepository.save(user);
    }
    
    private UserProfileResponse mapToUserProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(user.getRoles())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .learningGoal(user.getLearningGoal())
                .currentLevel(user.getCurrentLevel())
                .completedTopics(user.getCompletedTopics())
                .interests(user.getInterests())
                .build();
    }
}
