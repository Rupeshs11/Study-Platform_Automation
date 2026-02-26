package com.study.repository;

import com.study.model.Roadmap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoadmapRepository extends MongoRepository<Roadmap, String> {
    
    List<Roadmap> findByUserIdOrderByCreatedAtDesc(String userId);
    
    Page<Roadmap> findByUserId(String userId, Pageable pageable);
    
    Optional<Roadmap> findByIdAndUserId(String id, String userId);
    
    List<Roadmap> findByUserIdAndStatus(String userId, Roadmap.RoadmapStatus status);
    
    long countByUserId(String userId);
    
    long countByUserIdAndStatus(String userId, Roadmap.RoadmapStatus status);
}
