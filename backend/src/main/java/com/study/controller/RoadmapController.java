package com.study.controller;

import com.study.dto.*;
import com.study.security.UserPrincipal;
import com.study.service.RoadmapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.http.codec.ServerSentEvent;
import org.springframework.http.MediaType;
import reactor.core.publisher.Flux;

@Slf4j
@RestController
@RequestMapping("/roadmaps")
@RequiredArgsConstructor
public class RoadmapController {

    private final RoadmapService roadmapService;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> createRoadmapStream(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody RoadmapRequest request) {
        
        log.info("POST /roadmaps/stream - User: {}, Title: '{}', AI: {}", 
                userPrincipal.getId(), request.getTitle(), request.isGenerateWithAI());
        
        return roadmapService.createRoadmapStreaming(userPrincipal.getId(), request);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoadmapResponse>> createRoadmap(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody RoadmapRequest request) {
        
        log.info("POST /roadmaps - User: {}, Title: '{}', AI: {}", 
                userPrincipal.getId(), request.getTitle(), request.isGenerateWithAI());
        RoadmapResponse roadmap = roadmapService.createRoadmap(userPrincipal.getId(), request);
        log.info("Roadmap created successfully: id={}", roadmap.getId());
        return ResponseEntity.ok(ApiResponse.success("Roadmap created successfully", roadmap));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoadmapResponse>>> getUserRoadmaps(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("GET /roadmaps - User: {}", userPrincipal.getId());
        List<RoadmapResponse> roadmaps = roadmapService.getUserRoadmaps(userPrincipal.getId());
        log.info("Returning {} roadmaps", roadmaps.size());
        return ResponseEntity.ok(ApiResponse.success(roadmaps));
    }

    @GetMapping("/{roadmapId}")
    public ResponseEntity<ApiResponse<RoadmapResponse>> getRoadmap(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String roadmapId) {
        
        RoadmapResponse roadmap = roadmapService.getRoadmap(userPrincipal.getId(), roadmapId);
        return ResponseEntity.ok(ApiResponse.success(roadmap));
    }

    @PostMapping("/{roadmapId}/start")
    public ResponseEntity<ApiResponse<RoadmapResponse>> startRoadmap(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String roadmapId) {
        
        RoadmapResponse roadmap = roadmapService.startRoadmap(userPrincipal.getId(), roadmapId);
        return ResponseEntity.ok(ApiResponse.success("Roadmap started successfully", roadmap));
    }

    @DeleteMapping("/{roadmapId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoadmap(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String roadmapId) {
        
        roadmapService.deleteRoadmap(userPrincipal.getId(), roadmapId);
        return ResponseEntity.ok(ApiResponse.success("Roadmap deleted successfully", null));
    }

    @PostMapping("/topics/{topicId}/generate-content")
    public ResponseEntity<ApiResponse<ContentResponse>> generateTopicContent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String topicId,
            @RequestParam(required = false, defaultValue = "THEORY") String contentType) {
        
        ContentResponse content = roadmapService.generateTopicContent(
                userPrincipal.getId(), topicId, contentType);
        return ResponseEntity.ok(ApiResponse.success("Content generated successfully", content));
    }
}
