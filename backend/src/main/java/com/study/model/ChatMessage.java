package com.study.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chat_messages")
public class ChatMessage {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    @Indexed
    private String userId;

    /** "user", "assistant", or "system" */
    private String role;

    private String content;

    /** Thinking/reasoning content (for models that support it, e.g. DeepSeek R1) */
    private String thinking;

    /** Model used to generate this message (null for user messages) */
    private String model;

    @CreatedDate
    private LocalDateTime createdAt;
}
