package com.study.repository;

import com.study.model.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {

    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<ChatSession> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
