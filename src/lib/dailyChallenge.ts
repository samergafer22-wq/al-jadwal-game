import { ARABIC_LETTERS, ALL_CATEGORIES, RARE_LETTERS_SET } from '../data/categories';
import { 
  DailyChallengeConfig, 
  DailyChallengeSubmission, 
  CategoryDef, 
  PlayerAnswerBreakdown,
  WeeklyTournamentConfig,
  WeeklyLetterChallenge,
  WeeklyChallengeSubmission,
  LetterRoundSubmission,
  PodiumPrizeDef
} from '../types';
import { validateArabicWord, normalizeArabic } from './arabicUtils';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

/**
 * Returns today's date key formatted as YYYY-MM-DD in local time
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current week key formatted as YYYY-Www (e.g. "2026-W35")
 */
export function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDays = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Simple pseudo-random hash generator for deterministic values
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Formats date key into Arabic text
 */
export function formatArabicDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return `${day}/${month}/${year}`;
  }
}

/**
 * Formats week key into Arabic tournament text
 */
export function formatArabicWeekTitle(weekKey: string = getWeekKey()): string {
  const weekNum = weekKey.split('-W')[1] || '1';
  return `بطولة الأسبوع الكبرى ${weekNum} (12 حرفاً)`;
}

/**
 * Standard Podium Prizes for the Top 3 Ranks
 */
export const WEEKLY_PODIUM_PRIZES: PodiumPrizeDef[] = [
  {
    rank: 1,
    title: 'المركز الأول (بطل الأسبوع)',
    icon: '👑',
    stars: 500,
    gems: 100,
    hints: 5,
    badgeTitle: 'بطل الأسبوع الذهبي 🥇',
    color: 'from-amber-400 via-yellow-300 to-amber-500',
  },
  {
    rank: 2,
    title: 'المركز الثاني (وصيف البطولة)',
    icon: '🥈',
    stars: 300,
    gems: 50,
    hints: 3,
    badgeTitle: 'وصيف البطولة الفضي 🥈',
    color: 'from-slate-200 via-slate-300 to-slate-400',
  },
  {
    rank: 3,
    title: 'المركز الثالث (نخبة التحدي)',
    icon: '🥉',
    stars: 150,
    gems: 25,
    hints: 2,
    badgeTitle: 'نخبة الأسبوع البرونزي 🥉',
    color: 'from-amber-600 via-amber-700 to-amber-800',
  },
];

/**
 * Deterministically generates the 12-letter Weekly Tournament Configuration
 */
export function getWeeklyTournamentConfig(weekKey: string = getWeekKey()): WeeklyTournamentConfig {
  const seed = hashString(`aljadwal_weekly_12letters_${weekKey}`);
  
  // Standard 5 main categories for fair tournament comparison
  const standardCategories: CategoryDef[] = ALL_CATEGORIES.slice(0, 5);

  // Pick 12 distinct Arabic letters deterministically using LCG
  const availableLetters = [...ARABIC_LETTERS];
  let s = seed;
  
  // Shuffle letters
  for (let i = availableLetters.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const temp = availableLetters[i];
    availableLetters[i] = availableLetters[j];
    availableLetters[j] = temp;
  }

  // Ensure we take exactly 12 letters, including at least 2 rare gold letters for excitement
  const chosenLetters = availableLetters.slice(0, 12);

  const lettersChallenges: WeeklyLetterChallenge[] = chosenLetters.map((l, index) => ({
    letterIndex: index,
    letter: l.char,
    letterName: l.name,
    isRareLetter: RARE_LETTERS_SET.has(l.char),
    categories: standardCategories,
    timeLimitSeconds: 45,
  }));

  return {
    weekKey,
    formattedWeekArabic: formatArabicWeekTitle(weekKey),
    letters: lettersChallenges,
    totalLettersCount: 12,
    categories: standardCategories,
    timeLimitPerLetter: 45,
  };
}

/**
 * Evaluates a single letter round in the 12-letter tournament
 */
export function evaluateLetterRound(
  letterChallenge: WeeklyLetterChallenge,
  answers: Record<string, string>,
  timeTakenSeconds: number
): LetterRoundSubmission {
  const multiplier = letterChallenge.isRareLetter ? 2 : 1;
  const breakdown: Record<string, PlayerAnswerBreakdown> = {};
  let basePoints = 0;
  let validWordsCount = 0;

  letterChallenge.categories.forEach((cat) => {
    const rawWord = answers[cat.id] || '';
    const norm = normalizeArabic(rawWord);
    const validation = validateArabicWord(rawWord, letterChallenge.letter, cat.id);

    let points = 0;
    if (validation.isValid) {
      // 10 base points per valid word
      points = 10 * multiplier;
      basePoints += points;
      validWordsCount++;
    }

    breakdown[cat.id] = {
      word: rawWord,
      normalizedWord: norm,
      isValid: validation.isValid,
      isDuplicate: false,
      points,
      reason: validation.reason,
    };
  });

  // Speed Bonus: 1 bonus point for every 3 seconds saved (if at least 3 valid words entered)
  let speedBonus = 0;
  if (validWordsCount >= 3) {
    const remainingTime = Math.max(0, letterChallenge.timeLimitSeconds - timeTakenSeconds);
    speedBonus = Math.floor(remainingTime / 3);
  }

  // Perfect Letter Bonus: +15 points if all 5 categories are valid!
  const isPerfect = validWordsCount === letterChallenge.categories.length;
  const perfectBonus = isPerfect ? 15 : 0;

  const totalRoundScore = basePoints + speedBonus + perfectBonus;

  return {
    letterIndex: letterChallenge.letterIndex,
    letter: letterChallenge.letter,
    answers,
    breakdown,
    score: totalRoundScore,
    basePoints,
    speedBonus: speedBonus + perfectBonus,
    validWordsCount,
    timeTakenSeconds,
    isPerfect,
  };
}

/**
 * Compiles and calculates full weekly submission from all 12 completed letters
 */
export function compileWeeklySubmission(
  uid: string,
  displayName: string,
  photoURL: string | undefined,
  weekKey: string,
  roundResults: LetterRoundSubmission[]
): WeeklyChallengeSubmission {
  const totalScore = roundResults.reduce((sum, r) => sum + r.score, 0);
  const totalValidWords = roundResults.reduce((sum, r) => sum + r.validWordsCount, 0);
  const totalTimeSeconds = roundResults.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
  const totalWordsPossible = roundResults.length * 5; // 5 categories per letter

  const accuracyPercentage = totalWordsPossible > 0 
    ? Math.round((totalValidWords / totalWordsPossible) * 100) 
    : 0;

  const averageTimePerLetter = roundResults.length > 0 
    ? Math.round((totalTimeSeconds / roundResults.length) * 10) / 10 
    : 0;

  return {
    uid,
    displayName: displayName || 'لاعب الجدول',
    photoURL,
    weekKey,
    totalScore,
    totalValidWords,
    totalWordsPossible,
    accuracyPercentage,
    totalTimeSeconds,
    averageTimePerLetter,
    lettersCompleted: roundResults.length,
    roundResults,
    completedAt: Date.now(),
  };
}

/**
 * Submits the weekly 12-letter challenge submission to Firestore
 */
export async function submitWeeklyChallenge(
  submission: WeeklyChallengeSubmission
): Promise<boolean> {
  try {
    const subDocRef = doc(db, 'weekly_challenges', submission.weekKey, 'participants', submission.uid);
    await setDoc(subDocRef, submission, { merge: true });
    return true;
  } catch (err) {
    console.error('Error submitting weekly challenge:', err);
    return false;
  }
}

/**
 * Fetches user's weekly submission if already completed or in progress
 */
export async function fetchUserWeeklySubmission(
  weekKey: string = getWeekKey(),
  uid: string
): Promise<WeeklyChallengeSubmission | null> {
  try {
    const subDocRef = doc(db, 'weekly_challenges', weekKey, 'participants', uid);
    const snap = await getDoc(subDocRef);
    if (snap.exists()) {
      return snap.data() as WeeklyChallengeSubmission;
    }
  } catch (err) {
    console.warn('Error fetching weekly submission:', err);
  }
  return null;
}

/**
 * Fetches the weekly tournament leaderboard sorted by:
 * 1. Total Score (descending)
 * 2. Accuracy Percentage (descending)
 * 3. Total Time Taken (ascending - fastest first)
 */
export async function fetchWeeklyLeaderboard(
  weekKey: string = getWeekKey(),
  limitCount: number = 30
): Promise<WeeklyChallengeSubmission[]> {
  try {
    const participantsRef = collection(db, 'weekly_challenges', weekKey, 'participants');
    const q = query(participantsRef, orderBy('totalScore', 'desc'), limit(limitCount));
    
    let submissions: WeeklyChallengeSubmission[] = [];
    try {
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        submissions.push(docSnap.data() as WeeklyChallengeSubmission);
      });
    } catch {
      const snap = await getDocs(participantsRef);
      snap.forEach((docSnap) => {
        submissions.push(docSnap.data() as WeeklyChallengeSubmission);
      });
    }

    // Precise sorting by score -> accuracy -> time
    submissions.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (b.accuracyPercentage !== a.accuracyPercentage) {
        return b.accuracyPercentage - a.accuracyPercentage;
      }
      return (a.totalTimeSeconds || 600) - (b.totalTimeSeconds || 600);
    });

    return submissions.slice(0, limitCount);
  } catch (err) {
    console.error('Error fetching weekly leaderboard:', err);
    return [];
  }
}

// -------------------------------------------------------------
// Daily challenge legacy helpers for compatibility
// -------------------------------------------------------------

export function getDailyChallengeConfig(dateKey: string = getTodayDateKey()): DailyChallengeConfig {
  const seed = hashString(`aljadwal_daily_v1_${dateKey}`);
  const letterIndex = seed % ARABIC_LETTERS.length;
  const letterObj = ARABIC_LETTERS[letterIndex];
  const isRare = RARE_LETTERS_SET.has(letterObj.char);

  return {
    dateKey,
    formattedDateArabic: formatArabicDate(dateKey),
    letter: letterObj.char,
    letterName: letterObj.name,
    isRareLetter: isRare,
    categories: ALL_CATEGORIES.slice(0, 5),
    timeLimitSeconds: 60,
  };
}

export function evaluateDailyAnswers(
  config: DailyChallengeConfig,
  answers: Record<string, string>,
  timeTakenSeconds: number
) {
  const multiplier = config.isRareLetter ? 2 : 1;
  const breakdown: Record<string, PlayerAnswerBreakdown> = {};
  let basePoints = 0;
  let validWordsCount = 0;

  config.categories.forEach((cat) => {
    const rawWord = answers[cat.id] || '';
    const norm = normalizeArabic(rawWord);
    const validation = validateArabicWord(rawWord, config.letter, cat.id);

    let points = 0;
    if (validation.isValid) {
      points = 10 * multiplier;
      basePoints += points;
      validWordsCount++;
    }

    breakdown[cat.id] = {
      word: rawWord,
      normalizedWord: norm,
      isValid: validation.isValid,
      isDuplicate: false,
      points,
      reason: validation.reason,
    };
  });

  let speedBonus = 0;
  if (validWordsCount >= 3) {
    const remainingTime = Math.max(0, config.timeLimitSeconds - timeTakenSeconds);
    speedBonus = Math.floor(remainingTime / 4);
  }

  return {
    score: basePoints + speedBonus,
    breakdown,
    validWordsCount,
  };
}

export async function fetchUserDailySubmission(
  dateKey: string,
  uid: string
): Promise<DailyChallengeSubmission | null> {
  try {
    const subDocRef = doc(db, 'daily_challenges', dateKey, 'participants', uid);
    const snap = await getDoc(subDocRef);
    if (snap.exists()) {
      return snap.data() as DailyChallengeSubmission;
    }
  } catch (err) {
    console.warn('Error fetching daily submission:', err);
  }
  return null;
}

export async function submitDailyChallenge(
  submission: DailyChallengeSubmission
): Promise<boolean> {
  try {
    const subDocRef = doc(db, 'daily_challenges', submission.dateKey, 'participants', submission.uid);
    await setDoc(subDocRef, submission, { merge: true });
    return true;
  } catch (err) {
    console.error('Error submitting daily challenge:', err);
    return false;
  }
}

export async function fetchDailyLeaderboard(
  dateKey: string = getTodayDateKey(),
  limitCount: number = 20
): Promise<DailyChallengeSubmission[]> {
  try {
    const participantsRef = collection(db, 'daily_challenges', dateKey, 'participants');
    const q = query(participantsRef, orderBy('score', 'desc'), limit(limitCount));
    let submissions: DailyChallengeSubmission[] = [];
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      submissions.push(docSnap.data() as DailyChallengeSubmission);
    });
    return submissions;
  } catch {
    return [];
  }
}
