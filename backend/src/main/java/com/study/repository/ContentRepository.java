package com.study.repository;

import com.study.model.Content;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContentRepository extends MongoRepository<Content, String> {
    
    List<Content> findByTopicIdOrderByCreatedAtAsc(String topicId);
    
    List<Content> findByRoadmapId(String roadmapId);
    
    List<Content> findByUserIdOrderByCreatedAtDesc(String userId);
    
    Optional<Content> findByIdAndUserId(String id, String userId);
    
    List<Content> findByTopicIdAndType(String topicId, Content.ContentType type);
    
    List<Content> findByAiGeneratedTrueAndUserId(String userId);
    
    long countByTopicId(String topicId);
    
    long countByRoadmapId(String roadmapId);
}
