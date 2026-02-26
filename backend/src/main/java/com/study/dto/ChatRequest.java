package com.study.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    /** The user's message */
    private String message;

    /** Session ID - null means create a new session */
    private String sessionId;

    /** AI model to use (null = session default or system default) */
    private String model;

    /** Enable thinking/reasoning mode (only effective for models that support it) */
    @Builder.Default
    private boolean enableThinking = false;
}
