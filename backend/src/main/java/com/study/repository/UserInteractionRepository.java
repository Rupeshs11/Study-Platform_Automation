package com.study.repository;

import com.study.model.UserInteraction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserInteractionRepository extends MongoRepository<UserInteraction, String> {
    
    Page<UserInteraction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    
    List<UserInteraction> findByUserIdAndRoadmapIdOrderByCreatedAtDesc(String userId, String roadmapId);
    
    List<UserInteraction> findByUserIdAndTopicIdOrderByCreatedAtDesc(String userId, String topicId);
    
    List<UserInteraction> findByUserIdAndTypeOrderByCreatedAtDesc(String userId, UserInteraction.InteractionType type);
    
    long countByUserIdAndResolvedFalse(String userId);
    
    List<UserInteraction> findTop10ByUserIdOrderByCreatedAtDesc(String userId);
}
