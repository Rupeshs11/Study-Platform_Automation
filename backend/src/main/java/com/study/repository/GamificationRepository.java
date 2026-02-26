package com.study.repository;

import com.study.model.GamificationData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GamificationRepository extends MongoRepository<GamificationData, String> {
    Optional<GamificationData> findByUserId(String userId);
}
