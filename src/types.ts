export interface UserAchievementState {
  progress: number;
  unlocked: boolean;
  claimed: boolean;
  unlockedAt?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  role?: 'admin' | 'player';
  isAdmin?: boolean;
  isBanned?: boolean;
  stars: number; // Free currency, default 100
  gems: number; // Purchased currency, default 0
  hints?: number; // In-game hint items, default 3
  stats: {
    wins: number;
    losses: number;
    totalMatches: number;
    roundsWon: number;
    highestScore: number;
    totalWordsAccepted?: number;
    rareLetterWins?: number;
    fastStopsCount?: number;
  };
  unlockedCategories: string[]; // e.g. ['name', 'animal', 'plant', 'inanimate', 'country']
  unlockedThemes: string[];
  activeTheme?: string;
  rewardedAdsToday: number; // Max 3 per day
  lastRewardDate: string; // YYYY-MM-DD
  matchesPlayedSinceLastInterstitial: number;
  lastLuckySpinDate?: string; // YYYY-MM-DD
  lastLuckySpinTime?: number; // Exact timestamp in ms when last spun
  luckySpinStreak?: number; // 1 to 7
  luckySpinsCount?: number;
  totalSpinsCount?: number;
  achievements?: Record<string, UserAchievementState>;
  hapticsEnabled?: boolean;
  soundEnabled?: boolean;
  createdAt: number;
  lastSeen: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'matches' | 'speed' | 'vocabulary' | 'challenge' | 'social';
  targetCount: number;
  rewardStars: number;
  rewardGems: number;
}

export type MatchStatus =
  | 'waiting'          // Waiting for player 2
  | 'choosing_letter'  // Assigned player chooses letter
  | 'playing'          // 45s round active
  | 'round_review'     // Round ended, viewing answers & dispute window
  | 'match_end'        // Game finished (Best of 3)
  | 'cancelled';       // Player disconnected or abandoned

export interface CategoryDef {
  id: string;
  label: string;
  iconName: string;
  placeholder: string;
  isExtra?: boolean;
  gemPrice?: number;
  description?: string;
}

export interface PlayerAnswerBreakdown {
  word: string;
  normalizedWord: string;
  isValid: boolean;
  isDuplicate: boolean;
  points: number;
  reason?: string;
  disputed?: boolean;
}

export interface RoundResult {
  roundNumber: number;
  letter: string;
  isRareLetter: boolean;
  multiplier: number;
  stoppedBy?: string; // UID of who hit STOP
  stoppedAt?: number;
  answers: {
    [uid: string]: {
      [categoryId: string]: string;
    };
  };
  scores: {
    [uid: string]: {
      totalPoints: number;
      breakdown: {
        [categoryId: string]: PlayerAnswerBreakdown;
      };
    };
  };
  disputes?: {
    [categoryId: string]: {
      raisedBy: string;
      targetUid: string;
      word: string;
      status: 'open' | 'withdrawn' | 'justified';
      justification?: string;
      timestamp: number;
    };
  };
  winnerUid?: string | 'draw';
}

export interface MatchQuickChat {
  id: string;
  senderUid: string;
  senderName: string;
  message: string;
  emoji?: string;
  timestamp: number;
}

export interface MatchData {
  id: string;
  code: string; // 6-digit room code
  status: MatchStatus;
  isBotMatch?: boolean;
  creatorId: string;
  guestId?: string;
  players: string[];
  playerDetails: {
    [uid: string]: {
      displayName: string;
      photoURL?: string;
      stars: number;
      isBot?: boolean;
    };
  };
  betStars: number; // e.g. 20
  totalPot: number; // e.g. 40
  currentRound: number; // 1, 2, 3
  maxRounds: number; // 3 (Best of 3)
  letterPickerId: string; // UID of whose turn to pick letter
  currentLetter: string;
  isRareLetter: boolean;
  categories: string[]; // Active category IDs
  roundStartTime?: number; // ms timestamp
  roundDurationSec: number; // 45
  stoppedBy?: string;
  stoppedAt?: number;
  progress: {
    [uid: string]: number; // count of filled inputs (0 to categories.length)
  };
  currentAnswers: {
    [uid: string]: {
      [categoryId: string]: string;
    };
  };
  roundsHistory: RoundResult[];
  matchScores: {
    [uid: string]: {
      totalPoints: number;
      roundsWon: number;
    };
  };
  activeDisputes?: {
    [disputeKey: string]: {
      categoryId: string;
      raisedBy: string;
      targetUid: string;
      word: string;
      status: 'open' | 'withdrawn' | 'justified';
      justification?: string;
      expiresAt: number;
    };
  };
  lastChat?: MatchQuickChat;
  winnerId?: string | 'draw';
  createdAt: number;
  updatedAt: number;
}

export interface MatchHistoryItem {
  id: string;
  matchId: string;
  opponentName: string;
  opponentPhoto?: string;
  isWin: boolean;
  isDraw?: boolean;
  playerScore: number;
  opponentScore: number;
  starsDelta: number;
  date: string;
}

export interface GemShopPack {
  id: string;
  gems: number;
  bonusGems: number;
  priceUsd: string;
  priceFormatted: string;
  popular?: boolean;
}

export interface DailyChallengeConfig {
  dateKey: string; // YYYY-MM-DD
  formattedDateArabic: string; // e.g. "الخميس، 27 أغسطس 2026"
  letter: string;
  letterName: string;
  isRareLetter: boolean;
  categories: CategoryDef[];
  timeLimitSeconds: number; // e.g. 45 or 60
}

export interface WeeklyLetterChallenge {
  letterIndex: number; // 0..11
  letter: string;
  letterName: string;
  isRareLetter: boolean;
  categories: CategoryDef[];
  timeLimitSeconds: number; // 45s
}

export interface WeeklyTournamentConfig {
  weekKey: string; // e.g. "2026-W35"
  formattedWeekArabic: string; // e.g. "بطولة الأسبوع الكبرى (12 حرفاً)"
  letters: WeeklyLetterChallenge[];
  totalLettersCount: number; // 12
  categories: CategoryDef[];
  timeLimitPerLetter: number; // 45 seconds
}

export interface LetterRoundSubmission {
  letterIndex: number;
  letter: string;
  answers: Record<string, string>;
  breakdown: Record<string, PlayerAnswerBreakdown>;
  score: number;
  basePoints: number;
  speedBonus: number;
  validWordsCount: number;
  timeTakenSeconds: number;
  isPerfect: boolean;
}

export interface WeeklyChallengeSubmission {
  uid: string;
  displayName: string;
  photoURL?: string;
  weekKey: string;
  totalScore: number;
  totalValidWords: number;
  totalWordsPossible: number;
  accuracyPercentage: number;
  totalTimeSeconds: number;
  averageTimePerLetter: number;
  lettersCompleted: number; // 12
  roundResults: LetterRoundSubmission[];
  completedAt: number;
}

export interface PodiumPrizeDef {
  rank: 1 | 2 | 3;
  title: string;
  icon: string;
  stars: number;
  gems: number;
  hints: number;
  badgeTitle: string;
  color: string;
}

export interface DailyChallengeSubmission {
  uid: string;
  displayName: string;
  photoURL?: string;
  dateKey: string;
  letter: string;
  categories: string[];
  answers: Record<string, string>;
  breakdown: Record<string, PlayerAnswerBreakdown>;
  score: number;
  timeTakenSeconds: number;
  completedAt: number;
}

// Daily & Weekly Tasks Types
export type TaskPeriod = 'daily' | 'weekly';

export type TaskActionType =
  | 'play_matches'              // e.g. Play X matches
  | 'win_matches'               // e.g. Win X matches
  | 'complete_daily_challenge'  // e.g. Finish daily challenge
  | 'hit_stop_first'            // e.g. Press STOP first
  | 'play_friend_match'         // e.g. Play with friend
  | 'use_rare_letter'           // e.g. Play with gold letter
  | 'watch_rewarded_ad'         // e.g. Watch ad for stars
  | 'score_high_round'          // e.g. Score 40+ in a round
  | 'accumulate_points'         // e.g. Accumulate points across rounds
  | 'spin_lucky_wheel';         // e.g. Spin daily wheel

export interface LuckySpinReward {
  id: string;
  label: string;
  type: 'stars' | 'gems' | 'hints' | 'jackpot';
  amount: number;
  stars?: number;
  gems?: number;
  hints?: number;
  color: string;
  icon: string;
}

export interface TaskDefinition {
  id: string;
  period: TaskPeriod;
  title: string;
  description: string;
  iconName: string; // Lucide icon identifier
  actionType: TaskActionType;
  targetCount: number;
  rewardStars: number;
  rewardGems?: number;
  highlight?: boolean;
}

export interface UserTaskProgress {
  taskId: string;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
  claimedAt?: number;
}

export interface UserTasksState {
  uid: string;
  dailyDateKey: string; // YYYY-MM-DD
  weeklyDateKey: string; // YYYY-Www
  tasks: Record<string, UserTaskProgress>;
  weeklyBonusClaimed?: boolean;
  updatedAt: number;
}

export interface AdminSystemConfig {
  roundDuration: number;
  defaultStars: number;
  maintenanceMode: boolean;
  doubleStarsActive: boolean;
  freeGemsEvent?: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export interface GlobalAnnouncement {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'promo';
  isActive: boolean;
  createdAt: number;
}

export interface WordBankOverrideItem {
  id: string;
  word: string;
  normalizedWord: string;
  categoryId: string;
  isAccepted: boolean;
  notes?: string;
  addedBy: string;
  addedAt: number;
}


