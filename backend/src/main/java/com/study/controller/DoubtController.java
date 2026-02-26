package com.study.controller;

import com.study.dto.ApiResponse;
import com.study.dto.DoubtRequest;
import com.study.model.UserInteraction;
import com.study.security.UserPrincipal;
import com.study.service.DoubtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/doubts")
@RequiredArgsConstructor
public class DoubtController {

    private final DoubtService doubtService;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> askDoubt(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody DoubtRequest request) {
        
        log.info("POST /doubts - User: {}, Doubt: '{}'", userPrincipal.getId(), 
                request.getDoubt() != null ? request.getDoubt().substring(0, Math.min(50, request.getDoubt().length())) : "null");
        Map<String, Object> response = doubtService.solveDoubt(userPrincipal.getId(), request);
        log.info("Doubt processed: resolved={}", response.get("resolved"));
        return ResponseEntity.ok(ApiResponse.success("Doubt processed successfully", response));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<UserInteraction>>> getDoubtHistory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(defaultValue = "20") int limit) {
        
        log.info("GET /doubts/history - User: {}, Limit: {}", userPrincipal.getId(), limit);
        List<UserInteraction> history = doubtService.getDoubtHistory(userPrincipal.getId(), limit);
        log.info("Returning {} history items", history.size());
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/insights")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLearningInsights(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("GET /doubts/insights - User: {}", userPrincipal.getId());
        Map<String, Object> insights = doubtService.getLearningInsights(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(insights));
    }
}
