package com.study.controller;

import com.study.dto.ApiResponse;
import com.study.dto.GamificationResponse;
import com.study.security.UserPrincipal;
import com.study.service.GamificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/gamification")
@RequiredArgsConstructor
public class GamificationController {

    private final GamificationService gamificationService;

    /**
     * Get full gamification state for the authenticated user.
     * This also handles daily login (streak + daily XP).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<GamificationResponse>> getGamificationState(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("GET /gamification - User: {}", userPrincipal.getId());
        GamificationResponse state = gamificationService.getGamificationState(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(state));
    }
}
