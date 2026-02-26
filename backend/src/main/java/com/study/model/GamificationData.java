package com.study.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Document(collection = "gamification")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamificationData {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private int xp = 0;

    @Builder.Default
    private int streak = 0;

    @Builder.Default
    private int longestStreak = 0;

    private LocalDate lastActiveDate;

    @Builder.Default
    private Set<String> badgesEarned = new HashSet<>();

    @Builder.Default
    private List<XPGainEntry> xpHistory = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Embedded XP gain entry for history tracking.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class XPGainEntry {
        private int amount;
        private String reason;
        private String action; // e.g. CREATE_ROADMAP, COMPLETE_TOPIC, ASK_DOUBT, etc.
        private LocalDateTime timestamp;
    }
}
