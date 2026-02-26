package com.study.controller;

import com.study.dto.ApiResponse;
import com.study.dto.ChatRequest;
import com.study.model.ChatMessage;
import com.study.model.ChatSession;
import com.study.security.UserPrincipal;
import com.study.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * Send a message and stream the AI response via SSE.
     * Creates a new session if sessionId is null in the request body.
     */
    @PostMapping(value = "/send", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> sendMessage(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody ChatRequest request) {

        log.info("POST /chat/send - User: {}, Session: {}, Model: {}",
                userPrincipal.getId(),
                request.getSessionId() != null ? request.getSessionId() : "NEW",
                request.getModel());

        return chatService.sendMessageStream(userPrincipal.getId(), request);
    }

    /**
     * List all chat sessions for the current user.
     */
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatSession>>> getSessions(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("GET /chat/sessions - User: {}", userPrincipal.getId());
        List<ChatSession> sessions = chatService.getUserSessions(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    /**
     * Get messages for a specific chat session.
     */
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessage>>> getSessionMessages(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String sessionId) {

        log.info("GET /chat/sessions/{}/messages - User: {}", sessionId, userPrincipal.getId());
        List<ChatMessage> messages = chatService.getSessionMessages(sessionId, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    /**
     * Delete a chat session and all its messages.
     */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String sessionId) {

        log.info("DELETE /chat/sessions/{} - User: {}", sessionId, userPrincipal.getId());
        chatService.deleteSession(sessionId, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Session deleted", null));
    }

    /**
     * Update a session's title.
     */
    @PatchMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSession>> updateSession(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String sessionId,
            @RequestBody Map<String, String> body) {

        log.info("PATCH /chat/sessions/{} - User: {}", sessionId, userPrincipal.getId());
        String title = body.get("title");
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Title is required"));
        }
        ChatSession session = chatService.updateSessionTitle(sessionId, userPrincipal.getId(), title);
        return ResponseEntity.ok(ApiResponse.success("Session updated", session));
    }
}
