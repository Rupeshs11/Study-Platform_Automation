import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { userApi } from '../api/users';
import {
  ChevronRight,
  User,
  Mail,
  Calendar,
  Target,
  BookOpen,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  Trophy,
  Flame,
  Star,
  Zap,
  Map,
  MessageCircleQuestion,
  Layers,
  Lock,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Map,
  BookOpen,
  Zap,
  MessageCircleQuestion,
  Flame,
  Layers,
  Trophy,
  Star,
};

const categoryColors: Record<string, string> = {
  learning: 'border-accent-green/30',
  social: 'border-accent-blue/30',
  streak: 'border-accent-orange/30',
  mastery: 'border-accent-purple/30',
  exploration: 'border-accent-cyan/30',
};

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { state: gam } = useGamification();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [learningGoal, setLearningGoal] = useState(profile?.learningGoal || '');
  const [currentLevel, setCurrentLevel] = useState(profile?.currentLevel || '');
  const [interests, setInterests] = useState(profile?.interests?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await userApi.updateProfile({ fullName, learningGoal, currentLevel });
      await userApi.updatePreferences({
        learningGoal,
        currentLevel,
        interests: interests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      await refreshProfile();
      setSuccess('Profile updated successfully');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const earnedBadges = gam?.badges.filter((b) => b.earned) || [];
  const inProgressBadges = gam?.badges.filter((b) => !b.earned) || [];

  return (
    <div className="p-10 max-w-5xl mx-auto fade-in">
      {/* Path */}
      <div className="flex items-center gap-2.5 text-text-muted text-sm mb-1.5">
        <ChevronRight size={13} className="text-accent-green" />
        <span>~/{user?.username}/profile</span>
      </div>
      <h1 className="text-2xl font-semibold text-text-bright mb-10">
        profile <span className="text-text-muted font-normal text-base">& achievements</span>
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Left Column: Profile Info ── */}
        <div className="col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="border border-border-primary rounded bg-bg-secondary">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary">
              <div className="flex items-center gap-2.5">
                <User size={17} className="text-accent-blue" />
                <span className="text-base font-medium text-text-primary">user profile</span>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[15px] text-accent-blue hover:underline cursor-pointer"
                >
                  edit
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setEditing(false)}
                    className="text-[15px] text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-[15px] text-accent-green hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 size={13} className="spinner" /> : <Save size={13} />}
                    save
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-accent-dim-red border border-accent-red/30 rounded text-sm text-accent-red">
                  <AlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-accent-dim-green border border-accent-green/30 rounded text-sm text-accent-green">
                  <Check size={15} />
                  <span>{success}</span>
                </div>
              )}

              {/* Identity fields */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                    <User size={13} />
                    full name
                  </label>
                  {editing ? (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                    />
                  ) : (
                    <div className="text-base text-text-primary">{profile?.fullName || '—'}</div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                    <Mail size={13} />
                    email
                  </label>
                  <div className="text-base text-text-primary">{profile?.email || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                    username
                  </label>
                  <div className="text-base text-text-secondary">@{profile?.username}</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                    <Calendar size={13} />
                    joined
                  </label>
                  <div className="text-base text-text-secondary">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="border-t border-border-primary pt-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                      <Target size={13} />
                      learning goal
                    </label>
                    {editing ? (
                      <input
                        value={learningGoal}
                        onChange={(e) => setLearningGoal(e.target.value)}
                        className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                        placeholder="e.g. Master full-stack development"
                      />
                    ) : (
                      <div className="text-base text-text-primary">
                        {profile?.learningGoal || <span className="text-text-muted italic">not set</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                      <BookOpen size={13} />
                      current level
                    </label>
                    {editing ? (
                      <select
                        value={currentLevel}
                        onChange={(e) => setCurrentLevel(e.target.value)}
                        className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                      >
                        <option value="">select level</option>
                        <option value="BEGINNER">beginner</option>
                        <option value="INTERMEDIATE">intermediate</option>
                        <option value="ADVANCED">advanced</option>
                      </select>
                    ) : (
                      <div className="text-base text-text-primary">
                        {profile?.currentLevel?.toLowerCase() || (
                          <span className="text-text-muted italic">not set</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border-primary pt-5">
                <label className="flex items-center gap-1.5 text-[15px] uppercase tracking-wider text-text-muted mb-2">
                  interests
                </label>
                {editing ? (
                  <input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                    placeholder="react, typescript, ai, machine-learning"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {profile?.interests && profile.interests.length > 0 ? (
                      profile.interests.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-bg-tertiary border border-border-primary rounded text-[15px] text-accent-cyan"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-base text-text-muted italic">no interests set</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Badges Section ── */}
          <div className="border border-border-primary rounded bg-bg-secondary">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary">
              <div className="flex items-center gap-2.5">
                <Trophy size={17} className="text-accent-orange" />
                <span className="text-base font-medium text-text-primary">
                  badges
                  <span className="text-text-muted ml-2">
                    {earnedBadges.length}/{gam?.badges.length || 0}
                  </span>
                </span>
              </div>
            </div>

            <div className="p-5">
              {/* Earned Badges */}
              {earnedBadges.length > 0 && (
                <div className="mb-5">
                  <div className="text-[15px] uppercase tracking-wider text-text-muted mb-3">earned</div>
                  <div className="grid grid-cols-2 gap-3.5">
                    {earnedBadges.map((badge) => {
                      const Icon = iconMap[badge.icon] || Star;
                      return (
                        <div
                          key={badge.id}
                          className={`flex items-center gap-3.5 p-4 border ${categoryColors[badge.category]} rounded bg-bg-tertiary`}
                        >
                          <div className={`${badge.color}`}>
                            <Icon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary font-medium">{badge.name}</div>
                            <div className="text-[15px] text-text-muted mt-0.5">{badge.description}</div>
                          </div>
                          <Check size={16} className="text-accent-green shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* In Progress Badges */}
              {inProgressBadges.length > 0 && (
                <div>
                  <div className="text-[15px] uppercase tracking-wider text-text-muted mb-3">in progress</div>
                  <div className="grid grid-cols-2 gap-3.5">
                    {inProgressBadges.map((badge) => {
                      const Icon = iconMap[badge.icon] || Star;
                      return (
                        <div
                          key={badge.id}
                          className="flex items-center gap-3.5 p-4 border border-border-primary rounded bg-bg-primary"
                        >
                          <div className="text-text-muted">
                            <Icon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-secondary">{badge.name}</div>
                            <div className="text-[15px] text-text-muted mt-0.5">{badge.description}</div>
                            <div className="flex items-center gap-2.5 mt-2">
                              <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent-blue/50 rounded-full transition-all"
                                  style={{ width: `${badge.progress}%` }}
                                />
                              </div>
                              <span className="text-[14px] text-text-muted">
                                {badge.current}/{badge.requirement}
                              </span>
                            </div>
                          </div>
                          <Lock size={13} className="text-text-muted shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── XP History ── */}
          <div className="border border-border-primary rounded bg-bg-secondary">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border-primary">
              <Zap size={17} className="text-accent-green" />
              <span className="text-base font-medium text-text-primary">recent xp gains</span>
            </div>
            <div className="divide-y divide-border-primary">
              {gam?.recentXPGains && gam.recentXPGains.length > 0 ? (
                gam.recentXPGains.map((gain, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-accent-green text-sm font-medium">+{gain.amount} XP</span>
                      <span className="text-sm text-text-secondary">{gain.reason}</span>
                    </div>
                    <span className="text-[15px] text-text-muted">
                      {new Date(gain.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-text-muted">
                  no xp gains yet — start learning to earn xp!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Gamification Stats ── */}
        <div className="space-y-6">
          {/* Level & XP Card */}
          <div className="border border-border-primary rounded bg-bg-secondary p-5">
            <div className="text-center mb-4">
              <div className="text-[15px] uppercase tracking-wider text-text-muted mb-1.5">level</div>
              <div className="text-5xl font-bold text-accent-green">{gam?.level || 1}</div>
              <div className="text-sm text-accent-green mt-1.5">{gam?.title || 'Terminal Newbie'}</div>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between text-[15px] text-text-muted">
                <span>{gam?.xp || 0} XP</span>
                <span>{gam?.xpForNextLevel || 150} XP</span>
              </div>
              <div className="h-2.5 bg-bg-primary rounded-full overflow-hidden border border-border-primary">
                <div
                  className="h-full bg-gradient-to-r from-accent-green to-accent-cyan rounded-full transition-all duration-500"
                  style={{ width: `${gam?.xpProgress || 0}%` }}
                />
              </div>
              <div className="text-center text-[15px] text-text-secondary">
                {gam?.xpForNextLevel
                  ? `${(gam.xpForNextLevel - gam.xp)} XP to level ${(gam.level || 1) + 1}`
                  : 'max level reached'}
              </div>
            </div>
          </div>

          {/* Streak Card */}
          <div className="border border-border-primary rounded bg-bg-secondary p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Flame size={17} className="text-accent-orange" />
              <span className="text-base font-medium text-text-primary">streak</span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-4xl font-bold text-accent-orange">{gam?.streak || 0}</div>
                <div className="text-[15px] text-text-muted mt-0.5">current streak</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-text-secondary">{gam?.longestStreak || 0}</div>
                <div className="text-[15px] text-text-muted mt-0.5">longest</div>
              </div>
            </div>

            {/* Streak calendar (last 7 days visual) */}
            <div className="flex gap-2 mt-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const isActive = i < (gam?.streak || 0) && (gam?.streak || 0) <= 7;
                const isFilled = (gam?.streak || 0) > 7 || i < (gam?.streak || 0);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-3 rounded-sm ${isFilled
                        ? 'bg-accent-orange'
                        : isActive
                          ? 'bg-accent-orange/30'
                          : 'bg-bg-primary border border-border-primary'
                      }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[14px] text-text-muted mt-2">
              <span>7 days ago</span>
              <span>today</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="border border-border-primary rounded bg-bg-secondary p-5">
            <div className="text-[15px] uppercase tracking-wider text-text-muted mb-4">quick stats</div>
            <div className="space-y-3.5">
              {[
                { label: 'Total XP', value: `${gam?.xp || 0}`, color: 'text-accent-green' },
                {
                  label: 'Badges Earned',
                  value: `${earnedBadges.length}/${gam?.badges.length || 0}`,
                  color: 'text-accent-orange',
                },
                {
                  label: 'Completed Topics',
                  value: `${profile?.completedTopics?.length || 0}`,
                  color: 'text-accent-blue',
                },
                { label: 'Roles', value: profile?.roles?.join(', ') || '—', color: 'text-accent-purple' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{stat.label}</span>
                  <span className={`text-sm font-medium ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div className="border border-border-primary rounded bg-bg-secondary p-5">
            <div className="text-[15px] uppercase tracking-wider text-text-muted mb-4">account</div>
            <div className="space-y-3.5 text-[15px]">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                  <span className="text-accent-green">active</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">last login</span>
                <span className="text-text-secondary">
                  {profile?.lastLogin
                    ? new Date(profile.lastLogin).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">auth</span>
                <span className="text-text-secondary">jwt/bearer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
