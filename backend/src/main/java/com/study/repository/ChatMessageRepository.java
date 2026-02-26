package com.study.repository;

import com.study.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<ChatMessage> findBySessionIdAndUserIdOrderByCreatedAtAsc(String sessionId, String userId);

    void deleteBySessionId(String sessionId);

    long countBySessionId(String sessionId);
}
