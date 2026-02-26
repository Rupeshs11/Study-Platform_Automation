package com.study.repository;

import com.study.model.Topic;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends MongoRepository<Topic, String> {
    
    List<Topic> findByRoadmapIdOrderBySequenceOrderAsc(String roadmapId);
    
    List<Topic> findByUserIdOrderByCreatedAtDesc(String userId);
    
    Optional<Topic> findByIdAndUserId(String id, String userId);
    
    List<Topic> findByRoadmapIdAndStatus(String roadmapId, Topic.TopicStatus status);
    
    long countByRoadmapId(String roadmapId);
    
    long countByRoadmapIdAndStatus(String roadmapId, Topic.TopicStatus status);
    
    List<Topic> findByUserIdAndStatus(String userId, Topic.TopicStatus status);
}
