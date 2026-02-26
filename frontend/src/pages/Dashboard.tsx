import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { roadmapApi } from "../api/roadmaps";
import { doubtApi } from "../api/doubts";
import type { RoadmapResponse, LearningInsights } from "../types";
import {
  Map,
  Sparkles,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Loader2,
  Plus,
  Zap,
  Flame,
  Trophy,
  Star,
  Target,
} from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "text-text-muted",
  ACTIVE: "text-accent-green",
  PAUSED: "text-accent-orange",
  COMPLETED: "text-accent-blue",
  ARCHIVED: "text-text-muted",
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { state: gam } = useGamification();
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roadmapRes, insightsRes] = await Promise.all([
        roadmapApi.getAll(),
        doubtApi.getInsights(),
      ]);
      if (roadmapRes.data.success) setRoadmaps(roadmapRes.data.data);
      if (insightsRes.data.success) setInsights(insightsRes.data.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const activeRoadmaps = roadmaps.filter((r) => r.status === "ACTIVE");
  const totalTopics = roadmaps.reduce(
    (sum, r) => sum + (r.totalTopics || 0),
    0,
  );
  const completedTopics = roadmaps.reduce(
    (sum, r) => sum + (r.completedTopics || 0),
    0,
  );
  const earnedBadges = gam?.badges.filter((b) => b.earned) || [];
  const nextBadge = gam?.badges.find((b) => !b.earned && b.progress > 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary text-base">
          <Loader2 size={18} className="spinner" />
          loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-6xl mx-auto fade-in">
      {/* Welcome */}
      <div className="mb-12">
        <div className="flex items-center gap-2.5 text-text-muted text-sm mb-1.5">
          <ChevronRight size={12} className="text-accent-green" />
          <span>~/{user?.username}/dashboard</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-bright">
              welcome back,{" "}
              <span className="text-accent-green">
                {profile?.fullName || user?.username}
              </span>
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {/* Level badge */}
          {gam && (
            <div className="flex items-center gap-4 px-5 py-3 border border-border-primary rounded bg-bg-secondary">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent-green">
                  {gam.level}
                </div>
                <div className="text-[13px] text-text-muted uppercase tracking-wider">
                  level
                </div>
              </div>
              <div className="border-l border-border-primary pl-4">
                <div className="text-[14px] text-accent-green font-medium">
                  {gam.title}
                </div>
                <div className="flex items-center gap-2.5 mt-1">
                  <div className="w-20 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-green rounded-full"
                      style={{ width: `${gam.xpProgress}%` }}
                    />
                  </div>
                  <span className="text-[13px] text-text-muted">
                    {gam.xp} XP
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gamification Stats Row */}
      {gam && (
        <div className="grid grid-cols-4 gap-6 mb-10">
          {/* XP */}
          <div className="border border-border-primary rounded bg-bg-secondary p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Zap size={17} className="text-accent-green" />
              <span className="text-[14px] uppercase tracking-wider text-text-muted">
                total xp
              </span>
            </div>
            <div className="text-4xl font-bold text-accent-green">{gam.xp}</div>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-green to-accent-cyan rounded-full"
                  style={{ width: `${gam.xpProgress}%` }}
                />
              </div>
              <span className="text-[13px] text-text-muted">
                {gam.xpProgress}%
              </span>
            </div>
          </div>

          {/* Streak */}
          <div className="border border-border-primary rounded bg-bg-secondary p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Flame
                size={17}
                className={
                  gam.streak > 0 ? "text-accent-orange" : "text-text-muted"
                }
              />
              <span className="text-[14px] uppercase tracking-wider text-text-muted">
                streak
              </span>
            </div>
            <div
              className={`text-4xl font-bold ${gam.streak > 0 ? "text-accent-orange" : "text-text-muted"}`}
            >
              {gam.streak}
              <span className="text-sm font-normal text-text-muted ml-1.5">
                days
              </span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-sm ${
                    i < Math.min(gam.streak, 7)
                      ? "bg-accent-orange"
                      : "bg-bg-primary"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="border border-border-primary rounded bg-bg-secondary p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Trophy size={17} className="text-accent-purple" />
              <span className="text-[14px] uppercase tracking-wider text-text-muted">
                badges
              </span>
            </div>
            <div className="text-4xl font-bold text-accent-purple">
              {earnedBadges.length}
              <span className="text-sm font-normal text-text-muted ml-1.5">
                /{gam.badges.length}
              </span>
            </div>
            {nextBadge && (
              <div className="flex items-center gap-2.5 mt-2">
                <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-purple/50 rounded-full"
                    style={{ width: `${nextBadge.progress}%` }}
                  />
                </div>
                <span className="text-[13px] text-text-muted truncate max-w-[80px]">
                  {nextBadge.name}
                </span>
              </div>
            )}
          </div>

          {/* Level */}
          <div className="border border-border-primary rounded bg-bg-secondary p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Star size={17} className="text-accent-cyan" />
              <span className="text-[14px] uppercase tracking-wider text-text-muted">
                level
              </span>
            </div>
            <div className="text-4xl font-bold text-accent-cyan">
              {gam.level}
            </div>
            <div className="text-[14px] text-accent-cyan mt-1.5">
              {gam.levelName}
            </div>
          </div>
        </div>
      )}

      {/* Learning Stats grid */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        {[
          {
            icon: Map,
            label: "roadmaps",
            value: roadmaps.length,
            color: "text-accent-blue",
          },
          {
            icon: Target,
            label: "active",
            value: activeRoadmaps.length,
            color: "text-accent-green",
          },
          {
            icon: BookOpen,
            label: "topics",
            value: `${completedTopics}/${totalTopics}`,
            color: "text-accent-purple",
          },
          {
            icon: Sparkles,
            label: "doubts asked",
            value: insights?.doubtCount || 0,
            color: "text-accent-orange",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-border-primary rounded bg-bg-secondary p-6"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <stat.icon size={17} className={stat.color} />
              <span className="text-[14px] uppercase tracking-wider text-text-muted">
                {stat.label}
              </span>
            </div>
            <div className={`text-4xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <Link
          to="/roadmaps?new=true"
          className="flex items-center gap-5 border border-border-primary rounded bg-bg-secondary p-7 hover:border-accent-green/50 hover:bg-bg-hover transition-colors group"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded bg-accent-dim-green">
            <Plus size={20} className="text-accent-green" />
          </div>
          <div>
            <div className="text-base text-text-primary group-hover:text-accent-green transition-colors">
              new roadmap
            </div>
            <div className="text-[14px] text-text-muted mt-1">
              generate an AI learning path (+100 XP)
            </div>
          </div>
          <ChevronRight
            size={20}
            className="ml-auto text-text-muted group-hover:text-accent-green transition-colors"
          />
        </Link>

        <Link
          to="/nexus"
          className="flex items-center gap-5 border border-border-primary rounded bg-bg-secondary p-7 hover:border-accent-cyan/50 hover:bg-bg-hover transition-colors group"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded bg-accent-dim-blue">
            <Sparkles size={20} className="text-accent-cyan" />
          </div>
          <div>
            <div className="text-base text-text-primary group-hover:text-accent-cyan transition-colors">
              nexus ai
            </div>
            <div className="text-[14px] text-text-muted mt-1">
              chat with AI — ask anything
            </div>
          </div>
          <ChevronRight
            size={20}
            className="ml-auto text-text-muted group-hover:text-accent-cyan transition-colors"
          />
        </Link>
      </div>

      {/* Two-column: Recent Roadmaps + Recent XP */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent roadmaps (takes 2 cols) */}
        <div className="col-span-2 border border-border-primary rounded bg-bg-secondary">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={17} className="text-accent-cyan" />
              <span className="text-base font-medium text-text-primary">
                recent roadmaps
              </span>
            </div>
            <Link
              to="/roadmaps"
              className="text-[14px] text-accent-blue hover:underline"
            >
              view all
            </Link>
          </div>

          {roadmaps.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base text-text-muted">no roadmaps yet</p>
              <p className="text-sm text-text-muted mt-1.5">
                create your first AI-generated learning roadmap
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-primary">
              {roadmaps.slice(0, 5).map((rm) => (
                <Link
                  key={rm.id}
                  to={`/roadmaps/${rm.id}`}
                  className="flex items-center gap-5 px-6 py-4 hover:bg-bg-hover transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-base text-text-primary group-hover:text-accent-blue transition-colors truncate">
                      {rm.title}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[14px] text-text-muted">
                      <span className={statusColors[rm.status]}>
                        {rm.status.toLowerCase()}
                      </span>
                      <span>{rm.totalTopics || 0} topics</span>
                      <span>{rm.difficulty}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-32 flex items-center gap-2.5">
                    <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-green rounded-full transition-all"
                        style={{ width: `${rm.progressPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-[14px] text-text-muted w-10 text-right">
                      {Math.round(rm.progressPercentage || 0)}%
                    </span>
                  </div>

                  <ChevronRight
                    size={17}
                    className="text-text-muted group-hover:text-accent-blue transition-colors"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent XP gains (1 col) */}
        <div className="border border-border-primary rounded bg-bg-secondary">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border-primary">
            <Zap size={17} className="text-accent-green" />
            <span className="text-base font-medium text-text-primary">
              xp activity
            </span>
          </div>

          {gam?.recentXPGains && gam.recentXPGains.length > 0 ? (
            <div className="divide-y divide-border-primary">
              {gam.recentXPGains.slice(0, 8).map((gain, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-accent-green text-sm font-medium">
                      +{gain.amount}
                    </span>
                    <span className="text-[13px] text-text-muted">
                      {new Date(gain.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[14px] text-text-secondary mt-1">
                    {gain.reason}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <Zap size={28} className="text-text-muted mx-auto mb-3" />
              <p className="text-[14px] text-text-muted">
                no xp yet — start learning!
              </p>
            </div>
          )}

          <Link
            to="/profile"
            className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border-primary text-[14px] text-accent-blue hover:bg-bg-hover transition-colors"
          >
            view all achievements
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
