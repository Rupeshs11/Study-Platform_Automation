package com.study.service;

import com.study.dto.GamificationResponse;
import com.study.model.GamificationData;
import com.study.model.GamificationData.XPGainEntry;
import com.study.model.Roadmap;
import com.study.repository.GamificationRepository;
import com.study.repository.RoadmapRepository;
import com.study.repository.TopicRepository;
import com.study.repository.UserInteractionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GamificationService {

    private final GamificationRepository gamificationRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final UserInteractionRepository interactionRepository;

    // ── XP Reward Constants ──
    public static final int XP_CREATE_ROADMAP = 100;
    public static final int XP_COMPLETE_TOPIC = 50;
    public static final int XP_ASK_DOUBT = 25;
    public static final int XP_DAILY_LOGIN = 15;
    public static final int XP_STREAK_BONUS_7 = 75;
    public static final int XP_STREAK_BONUS_30 = 300;
    public static final int XP_FIRST_ROADMAP = 50;
    public static final int XP_START_ROADMAP = 25;
    public static final int XP_GENERATE_CONTENT = 30;

    // ── Level Thresholds ──
    private static final int[][] LEVEL_THRESHOLDS = {
        {1, 0},       // Terminal Newbie
        {2, 150},     // Code Learner
        {3, 400},     // Eager Student
        {4, 800},     // Knowledge Explorer
        {5, 1500},    // Digital Scholar
        {6, 2500},    // Study Adept
        {7, 4000},    // Domain Expert
        {8, 6000},    // Learning Master
        {9, 9000},    // Knowledge Sage
        {10, 13000},  // Platform Legend
    };

    private static final String[] LEVEL_NAMES = {
        "newbie", "learner", "student", "explorer", "scholar",
        "adept", "expert", "master", "sage", "legend"
    };

    private static final String[] LEVEL_TITLES = {
        "Terminal Newbie", "Code Learner", "Eager Student", "Knowledge Explorer",
        "Digital Scholar", "Study Adept", "Domain Expert", "Learning Master",
        "Knowledge Sage", "Platform Legend"
    };

    // ── Core Methods ──

    /**
     * Get or create gamification data for a user.
     */
    public GamificationData getOrCreate(String userId) {
        return gamificationRepository.findByUserId(userId)
                .orElseGet(() -> {
                    GamificationData data = GamificationData.builder()
                            .userId(userId)
                            .xp(0)
                            .streak(0)
                            .longestStreak(0)
                            .badgesEarned(new HashSet<>())
                            .xpHistory(new ArrayList<>())
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return gamificationRepository.save(data);
                });
    }

    /**
     * Award XP for an action. This is the primary method called by other services.
     */
    public GamificationData awardXP(String userId, int amount, String reason, String action) {
        GamificationData data = getOrCreate(userId);

        data.setXp(data.getXp() + amount);

        XPGainEntry entry = XPGainEntry.builder()
                .amount(amount)
                .reason(reason)
                .action(action)
                .timestamp(LocalDateTime.now())
                .build();

        // Prepend to history, keep last 100 entries
        List<XPGainEntry> history = new ArrayList<>();
        history.add(entry);
        if (data.getXpHistory() != null) {
            history.addAll(data.getXpHistory());
        }
        if (history.size() > 100) {
            history = history.subList(0, 100);
        }
        data.setXpHistory(history);
        data.setUpdatedAt(LocalDateTime.now());

        log.info("Awarded {} XP to user {} for: {} (action: {})", amount, userId, reason, action);
        return gamificationRepository.save(data);
    }

    /**
     * Handle daily login: update streak and award daily login XP.
     * Returns the updated data. Idempotent for the same day.
     */
    public GamificationData handleDailyLogin(String userId) {
        GamificationData data = getOrCreate(userId);
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        if (data.getLastActiveDate() != null && data.getLastActiveDate().equals(today)) {
            // Already logged in today, no-op
            return data;
        }

        // Update streak
        if (data.getLastActiveDate() != null && data.getLastActiveDate().equals(yesterday)) {
            // Streak continues
            data.setStreak(data.getStreak() + 1);
        } else if (data.getLastActiveDate() == null) {
            // First login ever
            data.setStreak(1);
        } else {
            // Streak broken
            data.setStreak(1);
        }

        data.setLongestStreak(Math.max(data.getStreak(), data.getLongestStreak()));
        data.setLastActiveDate(today);
        data.setUpdatedAt(LocalDateTime.now());

        // Save streak update first
        data = gamificationRepository.save(data);

        // Award daily login XP
        data = awardXP(userId, XP_DAILY_LOGIN, "Daily login", "DAILY_LOGIN");

        // Streak milestone bonuses
        if (data.getStreak() == 7) {
            data = awardXP(userId, XP_STREAK_BONUS_7, "7-day streak bonus!", "STREAK_BONUS_7");
        }
        if (data.getStreak() == 30) {
            data = awardXP(userId, XP_STREAK_BONUS_30, "30-day streak bonus!", "STREAK_BONUS_30");
        }

        return data;
    }

    /**
     * Build the full gamification response for a user (used by the GET endpoint).
     * Computes level, badges, and recent XP gains from persisted data.
     */
    public GamificationResponse getGamificationState(String userId) {
        // Handle daily login (streak + daily XP) and get latest data
        GamificationData data = handleDailyLogin(userId);

        // Compute level info
        int[] levelInfo = computeLevel(data.getXp());
        int level = levelInfo[0];
        int currentLevelXP = levelInfo[1];
        int nextLevelXP = levelInfo[2];
        int xpProgress = levelInfo[3];

        // Build badges from real data
        List<GamificationResponse.BadgeResponse> badges = buildBadges(data, userId);

        // Auto-mark newly earned badges
        Set<String> newlyEarned = badges.stream()
                .filter(b -> b.isEarned() && !data.getBadgesEarned().contains(b.getId()))
                .map(GamificationResponse.BadgeResponse::getId)
                .collect(Collectors.toSet());

        if (!newlyEarned.isEmpty()) {
            data.getBadgesEarned().addAll(newlyEarned);
            data.setUpdatedAt(LocalDateTime.now());
            gamificationRepository.save(data);
        }

        // Build recent XP gains
        List<GamificationResponse.XPGainResponse> recentXP = data.getXpHistory() != null
                ? data.getXpHistory().stream()
                    .limit(20)
                    .map(entry -> GamificationResponse.XPGainResponse.builder()
                            .amount(entry.getAmount())
                            .reason(entry.getReason())
                            .timestamp(entry.getTimestamp() != null ? entry.getTimestamp().toString() : "")
                            .build())
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return GamificationResponse.builder()
                .xp(data.getXp())
                .level(level)
                .levelName(LEVEL_NAMES[level - 1])
                .title(LEVEL_TITLES[level - 1])
                .xpForCurrentLevel(currentLevelXP)
                .xpForNextLevel(nextLevelXP)
                .xpProgress(xpProgress)
                .streak(data.getStreak())
                .longestStreak(data.getLongestStreak())
                .lastActiveDate(data.getLastActiveDate() != null ? data.getLastActiveDate().toString() : "")
                .badges(badges)
                .recentXPGains(recentXP)
                .build();
    }

    // ── Level Calculation ──

    private int[] computeLevel(int xp) {
        int level = 1;
        int currentXP = 0;
        int nextXP = LEVEL_THRESHOLDS[1][1]; // 150

        for (int i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= LEVEL_THRESHOLDS[i][1]) {
                level = LEVEL_THRESHOLDS[i][0];
                currentXP = LEVEL_THRESHOLDS[i][1];
                nextXP = (i + 1 < LEVEL_THRESHOLDS.length)
                        ? LEVEL_THRESHOLDS[i + 1][1]
                        : LEVEL_THRESHOLDS[i][1];
                break;
            }
        }

        int xpInLevel = xp - currentXP;
        int xpNeeded = nextXP - currentXP;
        int progress = xpNeeded > 0 ? Math.min(100, (int) ((xpInLevel * 100.0) / xpNeeded)) : 100;

        return new int[]{level, currentXP, nextXP, progress};
    }

    // ── Badge Calculation ──

    private List<GamificationResponse.BadgeResponse> buildBadges(GamificationData data, String userId) {
        // Query real counts from DB
        long roadmapCount = roadmapRepository.countByUserId(userId);
        long activeRoadmaps = roadmapRepository.countByUserIdAndStatus(userId, Roadmap.RoadmapStatus.ACTIVE);
        long completedRoadmaps = roadmapRepository.countByUserIdAndStatus(userId, Roadmap.RoadmapStatus.COMPLETED);

        // Count completed topics across all roadmaps
        List<com.study.model.Roadmap> userRoadmaps = roadmapRepository.findByUserIdOrderByCreatedAtDesc(userId);
        long completedTopics = 0;
        for (com.study.model.Roadmap rm : userRoadmaps) {
            completedTopics += topicRepository.countByRoadmapIdAndStatus(
                    rm.getId(), com.study.model.Topic.TopicStatus.COMPLETED);
        }

        // Count doubts asked
        long doubtsAsked = interactionRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).size();
        // Use a more accurate count - count all interactions of type DOUBT
        // The repository doesn't have a direct countByUserId, so we use existing methods
        try {
            var page = interactionRepository.findByUserIdOrderByCreatedAtDesc(
                    userId, org.springframework.data.domain.PageRequest.of(0, 1));
            doubtsAsked = page.getTotalElements();
        } catch (Exception e) {
            // Fallback
            log.warn("Could not count doubts for user {}: {}", userId, e.getMessage());
        }

        int level = computeLevel(data.getXp())[0];

        String today = LocalDate.now().toString();

        List<GamificationResponse.BadgeResponse> badges = new ArrayList<>();

        // first_roadmap - Pathfinder
        badges.add(buildBadge("first_roadmap", "Pathfinder", "Create your first roadmap",
                "Map", "text-accent-blue", "learning",
                1, (int) Math.min(roadmapCount, 1), roadmapCount >= 1,
                data.getBadgesEarned().contains("first_roadmap") ? today : null));

        // five_roadmaps - Cartographer
        badges.add(buildBadge("five_roadmaps", "Cartographer", "Create 5 roadmaps",
                "Map", "text-accent-purple", "exploration",
                5, (int) Math.min(roadmapCount, 5), roadmapCount >= 5,
                data.getBadgesEarned().contains("five_roadmaps") ? today : null));

        // topic_starter - Topic Starter
        badges.add(buildBadge("topic_starter", "Topic Starter", "Complete 5 topics",
                "BookOpen", "text-accent-green", "learning",
                5, (int) Math.min(completedTopics, 5), completedTopics >= 5,
                data.getBadgesEarned().contains("topic_starter") ? today : null));

        // topic_crusher - Topic Crusher
        badges.add(buildBadge("topic_crusher", "Topic Crusher", "Complete 25 topics",
                "Zap", "text-accent-orange", "mastery",
                25, (int) Math.min(completedTopics, 25), completedTopics >= 25,
                data.getBadgesEarned().contains("topic_crusher") ? today : null));

        // curious_mind - Curious Mind
        badges.add(buildBadge("curious_mind", "Curious Mind", "Ask 10 doubts",
                "MessageCircleQuestion", "text-accent-cyan", "exploration",
                10, (int) Math.min(doubtsAsked, 10), doubtsAsked >= 10,
                data.getBadgesEarned().contains("curious_mind") ? today : null));

        // streak_week - Streak Warrior
        badges.add(buildBadge("streak_week", "Streak Warrior", "7-day login streak",
                "Flame", "text-accent-orange", "streak",
                7, Math.min(data.getStreak(), 7), data.getLongestStreak() >= 7,
                data.getBadgesEarned().contains("streak_week") ? today : null));

        // streak_month - Streak Legend
        badges.add(buildBadge("streak_month", "Streak Legend", "30-day login streak",
                "Flame", "text-accent-red", "streak",
                30, Math.min(data.getStreak(), 30), data.getLongestStreak() >= 30,
                data.getBadgesEarned().contains("streak_month") ? today : null));

        // multi_active - Multi-Tasker
        badges.add(buildBadge("multi_active", "Multi-Tasker", "Have 3 active roadmaps",
                "Layers", "text-accent-purple", "exploration",
                3, (int) Math.min(activeRoadmaps, 3), activeRoadmaps >= 3,
                data.getBadgesEarned().contains("multi_active") ? today : null));

        // completionist - Completionist
        badges.add(buildBadge("completionist", "Completionist", "Complete a roadmap",
                "Trophy", "text-accent-orange", "mastery",
                1, (int) Math.min(completedRoadmaps, 1), completedRoadmaps >= 1,
                data.getBadgesEarned().contains("completionist") ? today : null));

        // level_5 - Scholar
        badges.add(buildBadge("level_5", "Scholar", "Reach level 5",
                "Star", "text-accent-cyan", "mastery",
                5, Math.min(level, 5), level >= 5,
                data.getBadgesEarned().contains("level_5") ? today : null));

        return badges;
    }

    private GamificationResponse.BadgeResponse buildBadge(
            String id, String name, String description,
            String icon, String color, String category,
            int requirement, int current, boolean earned, String earnedAt) {
        int progress = requirement > 0 ? Math.min(100, (int) ((current * 100.0) / requirement)) : 0;
        return GamificationResponse.BadgeResponse.builder()
                .id(id)
                .name(name)
                .description(description)
                .icon(icon)
                .color(color)
                .category(category)
                .requirement(requirement)
                .current(current)
                .earned(earned)
                .earnedAt(earnedAt)
                .progress(progress)
                .build();
    }
}
