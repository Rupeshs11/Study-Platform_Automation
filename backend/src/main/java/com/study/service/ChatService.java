package com.study.service;

import com.study.config.AIModelConfig;
import com.study.dto.AIRequest;
import com.study.dto.ChatRequest;
import com.study.model.ChatMessage;
import com.study.model.ChatSession;
import com.study.repository.ChatMessageRepository;
import com.study.repository.ChatSessionRepository;
import com.study.util.PromptTemplates;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final NvidiaAIService aiService;
    private final AIModelConfig modelConfig;

    public ChatService(ChatSessionRepository sessionRepository,
                       ChatMessageRepository messageRepository,
                       NvidiaAIService aiService,
                       AIModelConfig modelConfig) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.aiService = aiService;
        this.modelConfig = modelConfig;
    }

    // ── Session Management ──

    public List<ChatSession> getUserSessions(String userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<ChatSession> getSession(String sessionId, String userId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId);
    }

    public List<ChatMessage> getSessionMessages(String sessionId, String userId) {
        // Verify session belongs to user
        sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return messageRepository.findBySessionIdAndUserIdOrderByCreatedAtAsc(sessionId, userId);
    }

    public void deleteSession(String sessionId, String userId) {
        sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        messageRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteByIdAndUserId(sessionId, userId);
        log.info("Deleted chat session {} for user {}", sessionId, userId);
    }

    public ChatSession updateSessionTitle(String sessionId, String userId, String title) {
        ChatSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setTitle(title);
        session.setUpdatedAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    // ── Chat Streaming ──

    /**
     * Send a message and stream the AI response via SSE.
     * Creates a new session if sessionId is null.
     * Returns Flux of ServerSentEvent with event types: "thinking", "content", "done", "error"
     */
    public Flux<ServerSentEvent<String>> sendMessageStream(String userId, ChatRequest request) {
        try {
            // Resolve or create session
            ChatSession session;
            boolean isNewSession = (request.getSessionId() == null || request.getSessionId().isBlank());

            if (isNewSession) {
                String title = request.getMessage().length() > 60
                        ? request.getMessage().substring(0, 60) + "..."
                        : request.getMessage();
                session = ChatSession.builder()
                        .userId(userId)
                        .title(title)
                        .model(request.getModel())
                        .messageCount(0)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                session = sessionRepository.save(session);
                log.info("Created new chat session {} for user {}", session.getId(), userId);
            } else {
                session = sessionRepository.findByIdAndUserId(request.getSessionId(), userId)
                        .orElseThrow(() -> new RuntimeException("Session not found"));
            }

            final ChatSession finalSession = session;

            // Save user message
            ChatMessage userMessage = ChatMessage.builder()
                    .sessionId(finalSession.getId())
                    .userId(userId)
                    .role("user")
                    .content(request.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();
            messageRepository.save(userMessage);

            // Build conversation history for context
            List<ChatMessage> history = messageRepository
                    .findBySessionIdOrderByCreatedAtAsc(finalSession.getId());

            // Resolve model
            String resolvedModel = modelConfig.resolveModelId(
                    request.getModel() != null ? request.getModel() : finalSession.getModel()
            );

            boolean modelSupportsThinking = modelConfig.getModelById(resolvedModel)
                    .map(AIModelConfig.AIModel::isSupportsThinking)
                    .orElse(false);

            // Only enable thinking if BOTH the model supports it AND the user toggled it on
            boolean thinkingEnabled = modelSupportsThinking && request.isEnableThinking();

            // Build AI request with conversation history
            AIRequest aiRequest = buildConversationRequest(history, resolvedModel, thinkingEnabled);

            // Stream AI response
            final String sessionId = finalSession.getId();

            // Emit session info first (for new sessions the frontend needs the ID)
            Flux<ServerSentEvent<String>> sessionEvent = Flux.just(
                    ServerSentEvent.<String>builder()
                            .event("session")
                            .data("{\"sessionId\":\"" + sessionId + "\",\"isNew\":" + isNewSession + "}")
                            .build()
            );

            // Stream AI content with thinking/content parsing
            Flux<ServerSentEvent<String>> contentStream = streamAIResponse(
                    aiRequest, sessionId, userId, resolvedModel, thinkingEnabled
            );

            return sessionEvent.concatWith(contentStream);

        } catch (Exception e) {
            log.error("Error sending chat message", e);
            return Flux.just(
                    ServerSentEvent.<String>builder()
                            .event("error")
                            .data("{\"message\":\"" + e.getMessage().replace("\"", "'") + "\"}")
                            .build()
            );
        }
    }

    /**
     * Build an AIRequest from conversation history (multi-turn).
     */
    private AIRequest buildConversationRequest(List<ChatMessage> history,
                                                String model,
                                                boolean supportsThinking) {
        List<AIRequest.Message> messages = new ArrayList<>();

        // System prompt
        messages.add(AIRequest.Message.builder()
                .role("system")
                .content(PromptTemplates.SYSTEM_PROMPT_NEXUS_CHAT)
                .build());

        // Add conversation history (exclude thinking from context, only include content)
        for (ChatMessage msg : history) {
            String content = msg.getContent();
            if ("assistant".equals(msg.getRole()) && content != null) {
                // Strip any <think>...</think> tags from assistant messages for context
                content = stripThinkingTags(content);
            }
            if (content != null && !content.isBlank()) {
                messages.add(AIRequest.Message.builder()
                        .role(msg.getRole())
                        .content(content)
                        .build());
            }
        }

        AIRequest request = AIRequest.builder()
                .messages(messages)
                .model(model)
                .stream(true)
                .temperature(0.7)
                .build();

        return request;
    }

    /**
     * Stream AI response, parsing thinking content for thinking-enabled models.
     * Handles two thinking formats:
     * 1. REASONING_MARKER prefix from NvidiaAIService (delta.reasoning_content field)
     * 2. Inline <think>...</think> tags in content stream (DeepSeek R1 style)
     * Saves the assistant message when the stream completes.
     */
    private Flux<ServerSentEvent<String>> streamAIResponse(AIRequest aiRequest,
                                                            String sessionId,
                                                            String userId,
                                                            String model,
                                                            boolean thinkingEnabled) {
        StringBuilder fullContent = new StringBuilder();
        StringBuilder thinkingContent = new StringBuilder();
        // Track state: [0] = inThinking (for inline <think> tag parsing)
        boolean[] state = {false};

        return aiService.generateStream(aiRequest)
                .map(chunk -> {
                    if (chunk.startsWith("[ERROR]")) {
                        return ServerSentEvent.<String>builder()
                                .event("error")
                                .data("{\"message\":\"" + chunk.replace("\"", "'") + "\"}")
                                .build();
                    }

                    if (thinkingEnabled) {
                        // Check for REASONING_MARKER (from delta.reasoning_content)
                        if (chunk.startsWith(NvidiaAIService.REASONING_MARKER)) {
                            String reasoning = chunk.substring(NvidiaAIService.REASONING_MARKER.length());
                            thinkingContent.append(reasoning);
                            String escaped = escapeJson(reasoning);
                            return ServerSentEvent.<String>builder()
                                    .event("thinking")
                                    .data("{\"content\":\"" + escaped + "\"}")
                                    .build();
                        }
                        // Otherwise parse inline <think> tags (DeepSeek R1 style)
                        return processChunkWithThinking(chunk, fullContent, thinkingContent, state);
                    } else {
                        // Non-thinking mode: strip any accidental <think> tags and
                        // reasoning markers, send only content
                        String cleanChunk = chunk;
                        if (cleanChunk.startsWith(NvidiaAIService.REASONING_MARKER)) {
                            // Skip reasoning chunks when thinking is disabled
                            return ServerSentEvent.<String>builder()
                                    .event("content")
                                    .data("{\"content\":\"\"}")
                                    .build();
                        }
                        fullContent.append(cleanChunk);
                        String escaped = escapeJson(cleanChunk);
                        return ServerSentEvent.<String>builder()
                                .event("content")
                                .data("{\"content\":\"" + escaped + "\"}")
                                .build();
                    }
                })
                .concatWith(Flux.defer(() -> {
                    // Stream complete — save assistant message
                    try {
                        String content = fullContent.toString();
                        String thinking = thinkingContent.toString();

                        // Post-process: if content still has <think> tags (partial/leftover), strip them
                        if (content.contains("</think>")) {
                            String afterThink = content.split("</think>", 2).length > 1
                                    ? content.split("</think>", 2)[1].stripLeading() : content;
                            String beforeThink = content.split("<think>", 2).length > 1
                                    ? content.split("<think>", 2)[0] : "";
                            // Extract any thinking from content
                            if (thinking.isEmpty() && content.contains("<think>") && content.contains("</think>")) {
                                thinking = content.substring(
                                        content.indexOf("<think>") + 7,
                                        content.indexOf("</think>")
                                ).strip();
                            }
                            content = (beforeThink + afterThink).strip();
                        }

                        ChatMessage assistantMessage = ChatMessage.builder()
                                .sessionId(sessionId)
                                .userId(userId)
                                .role("assistant")
                                .content(content)
                                .thinking(thinking.isEmpty() ? null : thinking)
                                .model(model)
                                .createdAt(LocalDateTime.now())
                                .build();
                        messageRepository.save(assistantMessage);

                        // Update session
                        sessionRepository.findById(sessionId).ifPresent(session -> {
                            session.setMessageCount((int) messageRepository.countBySessionId(sessionId));
                            session.setUpdatedAt(LocalDateTime.now());
                            sessionRepository.save(session);
                        });

                        log.info("Chat stream completed for session {}: content={}chars, thinking={}chars",
                                sessionId, content.length(), thinking.length());

                        return Flux.just(ServerSentEvent.<String>builder()
                                .event("done")
                                .data("{\"sessionId\":\"" + sessionId + "\",\"model\":\"" + model + "\"}")
                                .build());
                    } catch (Exception e) {
                        log.error("Error saving assistant message", e);
                        return Flux.just(ServerSentEvent.<String>builder()
                                .event("error")
                                .data("{\"message\":\"Failed to save response\"}")
                                .build());
                    }
                }));
    }

    /**
     * Process a streaming chunk, detecting <think> tags for thinking-capable models.
     * Routes content to either "thinking" or "content" SSE event types.
     */
    private ServerSentEvent<String> processChunkWithThinking(String chunk,
                                                              StringBuilder fullContent,
                                                              StringBuilder thinkingContent,
                                                              boolean[] state) {
        String remaining = chunk;
        StringBuilder thinkingPart = new StringBuilder();
        StringBuilder contentPart = new StringBuilder();

        while (!remaining.isEmpty()) {
            if (state[0]) {
                // Currently inside <think> block
                int closeIdx = remaining.indexOf("</think>");
                if (closeIdx != -1) {
                    thinkingPart.append(remaining, 0, closeIdx);
                    remaining = remaining.substring(closeIdx + 8); // skip </think>
                    state[0] = false;
                } else {
                    thinkingPart.append(remaining);
                    remaining = "";
                }
            } else {
                // Outside thinking block
                int openIdx = remaining.indexOf("<think>");
                if (openIdx != -1) {
                    contentPart.append(remaining, 0, openIdx);
                    remaining = remaining.substring(openIdx + 7); // skip <think>
                    state[0] = true;
                } else {
                    contentPart.append(remaining);
                    remaining = "";
                }
            }
        }

        // Accumulate
        if (!thinkingPart.isEmpty()) {
            thinkingContent.append(thinkingPart);
        }
        if (!contentPart.isEmpty()) {
            fullContent.append(contentPart);
        }

        // Return appropriate event
        if (!thinkingPart.isEmpty() && contentPart.isEmpty()) {
            String escaped = escapeJson(thinkingPart.toString());
            return ServerSentEvent.<String>builder()
                    .event("thinking")
                    .data("{\"content\":\"" + escaped + "\"}")
                    .build();
        } else if (!contentPart.isEmpty()) {
            String escaped = escapeJson(contentPart.toString());
            return ServerSentEvent.<String>builder()
                    .event("content")
                    .data("{\"content\":\"" + escaped + "\"}")
                    .build();
        } else {
            // Empty chunk (tag boundaries) — send empty content event
            return ServerSentEvent.<String>builder()
                    .event("content")
                    .data("{\"content\":\"\"}")
                    .build();
        }
    }

    /**
     * Strip <think>...</think> tags from content (for building context).
     */
    private String stripThinkingTags(String content) {
        if (content == null) return "";
        return content.replaceAll("<think>[\\s\\S]*?</think>", "").trim();
    }

    /**
     * Escape a string for safe JSON embedding.
     */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
