import { UserProfile, LuckySpinReward } from '../types';

export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Strictly 24 hours in milliseconds

export interface WheelSegmentDef {
  id: number;
  label: string;
  type: 'stars' | 'gems' | 'hints';
  amount: number;
  color: string;
  textColor: string;
  icon: 'star' | 'gem' | 'hint';
  isRare?: boolean;
  weight: number; // For server/client random distribution
}

export const OFFICIAL_WHEEL_SEGMENTS: WheelSegmentDef[] = [
  { id: 0, label: '50 جوهرة', type: 'gems', amount: 50, color: '#f59e0b', textColor: '#0f172a', icon: 'gem', isRare: true, weight: 4 },
  { id: 1, label: '100 نجمة', type: 'stars', amount: 100, color: '#3b82f6', textColor: '#ffffff', icon: 'star', weight: 24 },
  { id: 2, label: '3 تلميحات', type: 'hints', amount: 3, color: '#10b981', textColor: '#ffffff', icon: 'hint', weight: 18 },
  { id: 3, label: '15 جوهرة', type: 'gems', amount: 15, color: '#ec4899', textColor: '#ffffff', icon: 'gem', weight: 14 },
  { id: 4, label: '250 نجمة', type: 'stars', amount: 250, color: '#8b5cf6', textColor: '#ffffff', icon: 'star', isRare: true, weight: 6 },
  { id: 5, label: '1 تلميح', type: 'hints', amount: 1, color: '#06b6d4', textColor: '#ffffff', icon: 'hint', weight: 20 },
  { id: 6, label: '25 جوهرة', type: 'gems', amount: 25, color: '#f97316', textColor: '#ffffff', icon: 'gem', weight: 10 },
  { id: 7, label: '50 نجمة', type: 'stars', amount: 50, color: '#14b8a6', textColor: '#ffffff', icon: 'star', weight: 24 },
];

/**
 * Checks if the user is eligible for a lucky spin (strictly once per 24 hours).
 * Checks userProfile, user-specific localStorage, and device-level localStorage for bulletproof 24h cooldown.
 */
export function checkSpinEligibility(userProfile: UserProfile | null): {
  canSpin: boolean;
  remainingMs: number;
  formattedCountdown: string;
  progressPercentage: number;
} {
  const now = Date.now();
  let candidateTimes: number[] = [];

  if (userProfile?.lastLuckySpinTime && typeof userProfile.lastLuckySpinTime === 'number') {
    candidateTimes.push(userProfile.lastLuckySpinTime);
  }

  // Fallback for legacy records having only lastLuckySpinDate (YYYY-MM-DD)
  if (userProfile?.lastLuckySpinDate) {
    const today = new Date().toISOString().split('T')[0];
    if (userProfile.lastLuckySpinDate === today && (!userProfile.lastLuckySpinTime || userProfile.lastLuckySpinTime === 0)) {
      // Spun today without millisecond timestamp -> treat as spun earlier today
      candidateTimes.push(now - 1000); // effectively locks it for 24h
    }
  }

  // Check LocalStorage user & device timestamps
  try {
    const uid = userProfile?.uid || 'guest';
    const localUserTs = localStorage.getItem(`aljadwal_lucky_spin_ts_${uid}`);
    if (localUserTs) {
      const parsed = parseInt(localUserTs, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= now + 60000) {
        candidateTimes.push(parsed);
      }
    }

    const deviceTs = localStorage.getItem('aljadwal_lucky_spin_ts_device');
    if (deviceTs) {
      const parsed = parseInt(deviceTs, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= now + 60000) {
        candidateTimes.push(parsed);
      }
    }
  } catch (e) {
    // Ignore storage quota or access issues
  }

  // If no previous spin recorded anywhere
  if (candidateTimes.length === 0) {
    return {
      canSpin: true,
      remainingMs: 0,
      formattedCountdown: '00:00:00',
      progressPercentage: 100,
    };
  }

  const latestSpinTime = Math.max(...candidateTimes);
  const elapsed = now - latestSpinTime;
  const remaining = SPIN_COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return {
      canSpin: true,
      remainingMs: 0,
      formattedCountdown: '00:00:00',
      progressPercentage: 100,
    };
  }

  // Format HH:MM:SS
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedCountdown = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const progressPercentage = Math.min(100, Math.max(0, Math.round((elapsed / SPIN_COOLDOWN_MS) * 100)));

  return {
    canSpin: false,
    remainingMs: remaining,
    formattedCountdown,
    progressPercentage,
  };
}

/**
 * Security: Validates incoming spin reward against the official segments
 * to prevent client-side reward manipulation/injection attacks.
 */
export function sanitizeAndValidateSpinReward(segmentId: number): LuckySpinReward {
  const segment = OFFICIAL_WHEEL_SEGMENTS.find((s) => s.id === segmentId) || OFFICIAL_WHEEL_SEGMENTS[7];
  
  return {
    id: `spin_${segment.id}`,
    label: segment.label,
    type: segment.type,
    amount: segment.amount,
    stars: segment.type === 'stars' ? segment.amount : 0,
    gems: segment.type === 'gems' ? segment.amount : 0,
    hints: segment.type === 'hints' ? segment.amount : 0,
    color: segment.color,
    icon: segment.icon,
  };
}

/**
 * Selects a winning segment based on mathematical weighted probabilities
 */
export function pickRandomWinningSegmentIndex(): number {
  const totalWeight = OFFICIAL_WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (let i = 0; i < OFFICIAL_WHEEL_SEGMENTS.length; i++) {
    if (randomNum < OFFICIAL_WHEEL_SEGMENTS[i].weight) {
      return i;
    }
    randomNum -= OFFICIAL_WHEEL_SEGMENTS[i].weight;
  }
  return OFFICIAL_WHEEL_SEGMENTS.length - 1;
}

/**
 * Calculates updated streak count based on elapsed time
 */
export function calculateNextStreak(userProfile: UserProfile | null): number {
  if (!userProfile) return 1;
  const lastSpinTime = userProfile.lastLuckySpinTime;
  if (!lastSpinTime) return 1;

  const elapsed = Date.now() - lastSpinTime;
  const currentStreak = userProfile.luckySpinStreak || 1;

  // Between 24 hours and 48 hours: streak continues
  if (elapsed >= SPIN_COOLDOWN_MS && elapsed <= SPIN_COOLDOWN_MS * 2) {
    return (currentStreak % 7) + 1;
  }

  // If more than 48 hours passed: streak resets to 1
  return 1;
}
