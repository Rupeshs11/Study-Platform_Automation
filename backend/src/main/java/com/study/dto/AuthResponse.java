package com.study.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private String id;
    private String username;
    private String email;
    private String fullName;
    private Set<String> roles;
    
    public AuthResponse(String token, String id, String username, String email, String fullName, Set<String> roles) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles;
    }
}
