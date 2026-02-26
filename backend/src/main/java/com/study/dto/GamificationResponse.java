package com.study.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamificationResponse {

    private int xp;
    private int level;
    private String levelName;
    private String title;
    private int xpForCurrentLevel;
    private int xpForNextLevel;
    private int xpProgress; // 0-100 percentage within current level

    private int streak;
    private int longestStreak;
    private String lastActiveDate;

    private List<BadgeResponse> badges;
    private List<XPGainResponse> recentXPGains;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BadgeResponse {
        private String id;
        private String name;
        private String description;
        private String icon;
        private String color;
        private String category;
        private int requirement;
        private int current;
        private boolean earned;
        private String earnedAt;
        private int progress; // 0-100
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class XPGainResponse {
        private int amount;
        private String reason;
        private String timestamp;
    }
}
