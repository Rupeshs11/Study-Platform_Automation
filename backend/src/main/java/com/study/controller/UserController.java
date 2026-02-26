package com.study.controller;

import com.study.dto.ApiResponse;
import com.study.dto.UserProfileResponse;
import com.study.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getCurrentUser() {
        UserProfileResponse profile = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success("User profile retrieved", profile));
    }
    
    @PutMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> updates) {
        UserProfileResponse profile = userService.updateUserProfile(
                updates.get("fullName"),
                updates.get("learningGoal"),
                updates.get("currentLevel")
        );
        return ResponseEntity.ok(ApiResponse.success("Profile updated", profile));
    }
    
    @PutMapping("/me/preferences")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updatePreferences(@RequestBody Map<String, Object> preferences) {
        String learningGoal = (String) preferences.get("learningGoal");
        String currentLevel = (String) preferences.get("currentLevel");
        @SuppressWarnings("unchecked")
        Set<String> interests = (Set<String>) preferences.get("interests");
        
        userService.updateLearningPreferences(learningGoal, currentLevel, interests);
        return ResponseEntity.ok(ApiResponse.success("Preferences updated"));
    }
}
