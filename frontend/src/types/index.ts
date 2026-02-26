// ── AI Models ──
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsThinking: boolean;
  category: string;
  tags: string[];
}

// ── Chat (Nexus) ──
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string | null;
  model?: string | null;
  createdAt: string;
}

export interface ChatMessageRequest {
  message: string;
  sessionId?: string | null;
  model?: string;
  enableThinking?: boolean;
}

export interface AIModelsResponse {
  models: AIModel[];
  defaultModel: string;
}

// ── API Response wrapper ──
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Auth ──
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

// ── User ──
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  active: boolean;
  createdAt: string;
  lastLogin: string;
  learningGoal: string | null;
  currentLevel: string | null;
  completedTopics: string[];
  interests: string[];
}

// ── Roadmap ──
export interface RoadmapRequest {
  title: string;
  description: string;
  goal: string;
  difficulty: string;
  estimatedHoursPerWeek: number;
  tags: string[];
  currentLevel: string;
  preferredLearningStyle: string;
  generateWithAI: boolean;
  model?: string;
}

export interface TopicSummary {
  id: string;
  title: string;
  sequenceOrder: number;
  status: TopicStatus;
  estimatedMinutes: number;
  completedContentCount: number;
  totalContentCount: number;
}

export interface RoadmapResponse {
  id: string;
  userId: string;
  title: string;
  description: string;
  goal: string;
  difficulty: string;
  estimatedHours: number;
  estimatedWeeks: number;
  tags: string[];
  topics: TopicSummary[];
  status: RoadmapStatus;
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export type RoadmapStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type TopicStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

// ── SSE Streaming ──
export interface StreamThinkingEvent {
  content: string;
}

export interface StreamTopicEvent {
  id: string;
  title: string;
  description: string;
  sequenceOrder: number;
  estimatedMinutes: number;
  learningObjectives?: string[];
  prerequisites?: string[];
  resources?: Resource[];
}

export interface StreamCompleteEvent {
  roadmapId: string;
  totalTopics: number;
}

// ── Topic ──
export interface TopicDetail {
  id: string;
  roadmapId: string;
  title: string;
  description: string;
  sequenceOrder: number;
  estimatedMinutes: number;
  prerequisites: string[];
  learningObjectives: string[];
  contents: ContentSummary[];
  status: TopicStatus;
  resources: Resource[];
  aiGeneratedSummary: string;
  keyTakeaways: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ContentSummary {
  id: string;
  title: string;
  type: string;
  readingTimeMinutes: number;
  completed: boolean;
}

export interface Resource {
  type: string;
  title: string;
  url: string;
  description: string;
}

// ── Content ──
export interface ContentResponse {
  id: string;
  topicId: string;
  roadmapId: string;
  type: string;
  title: string;
  markdownContent: string;
  codeExamples: CodeExample[];
  quizQuestions: QuizQuestion[];
  keyPoints: string[];
  aiGenerated: boolean;
  aiModelVersion: string;
  readingTimeMinutes: number;
  complexity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: string;
  answered: boolean;
  answeredCorrectly: boolean;
}

// ── Doubt ──
export interface DoubtRequest {
  doubt: string;
  roadmapId?: string;
  topicId?: string;
  contextContentIds?: string[];
  includeUserHistory: boolean;
  maxHistoryItems: number;
  model?: string;
}

export interface DoubtResponse {
  doubtId: string;
  answer: string;
  resolved: boolean;
  confidence: number;
  timestamp: string;
  suggestedTopics: string[];
}

export interface DoubtHistory {
  id: string;
  userId: string;
  roadmapId: string | null;
  topicId: string | null;
  type: string;
  content: string;
  aiResponse: string;
  resolved: boolean;
  confidence: number;
  createdAt: string;
  respondedAt: string;
}

export interface LearningInsights {
  totalInteractions: number;
  doubtCount: number;
  unresolvedCount: number;
  challengingTopics: string[];
  engagementScore: number;
}

// ── Gamification ──
export interface GamificationState {
  xp: number;
  level: number;
  levelName: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number; // 0-100 percentage within current level
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  badges: Badge[];
  recentXPGains: XPGain[];
  title: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  earnedAt: string | null;
  earned: boolean;
  progress: number; // 0-100
  requirement: number;
  current: number;
  category: 'learning' | 'social' | 'streak' | 'mastery' | 'exploration';
}

export interface XPGain {
  amount: number;
  reason: string;
  timestamp: string;
}

export interface GamificationData {
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  badgesEarned: string[];
  xpHistory: XPGain[];
}

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'newbie', title: 'Terminal Newbie' },
  { level: 2, xp: 150, name: 'learner', title: 'Code Learner' },
  { level: 3, xp: 400, name: 'student', title: 'Eager Student' },
  { level: 4, xp: 800, name: 'explorer', title: 'Knowledge Explorer' },
  { level: 5, xp: 1500, name: 'scholar', title: 'Digital Scholar' },
  { level: 6, xp: 2500, name: 'adept', title: 'Study Adept' },
  { level: 7, xp: 4000, name: 'expert', title: 'Domain Expert' },
  { level: 8, xp: 6000, name: 'master', title: 'Learning Master' },
  { level: 9, xp: 9000, name: 'sage', title: 'Knowledge Sage' },
  { level: 10, xp: 13000, name: 'legend', title: 'Platform Legend' },
] as const;

export const XP_REWARDS = {
  CREATE_ROADMAP: 100,
  COMPLETE_TOPIC: 50,
  ASK_DOUBT: 25,
  DAILY_LOGIN: 15,
  STREAK_BONUS_7: 75,
  STREAK_BONUS_30: 300,
  FIRST_ROADMAP: 50,
  START_ROADMAP: 25,
  GENERATE_CONTENT: 30,
} as const;
