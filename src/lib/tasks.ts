import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { TaskDefinition, TaskActionType, UserTasksState, UserTaskProgress } from '../types';

// ==========================================
// TASK CATALOG DEFINITIONS (DAILY & WEEKLY)
// ==========================================

export const DAILY_TASKS: TaskDefinition[] = [
  {
    id: 'daily_play_3',
    period: 'daily',
    title: 'خوض 3 مباريات',
    description: 'العب 3 مباريات سواء في المطابقة السريعة أو مع الأصدقاء',
    iconName: 'Gamepad2',
    actionType: 'play_matches',
    targetCount: 3,
    rewardStars: 20,
    highlight: true,
  },
  {
    id: 'daily_win_2',
    period: 'daily',
    title: 'تحقيق انتصارين',
    description: 'فز في مباراتين ضد لاعبين حقيقيين أو ذكاء اصطناعي',
    iconName: 'Trophy',
    actionType: 'win_matches',
    targetCount: 2,
    rewardStars: 30,
  },
  {
    id: 'daily_daily_challenge',
    period: 'daily',
    title: 'تحدي اليوم الموحّد',
    description: 'شارك في تحدي اليوم الخاص بالكلمات العربية واجمع نقاطك',
    iconName: 'Calendar',
    actionType: 'complete_daily_challenge',
    targetCount: 1,
    rewardStars: 25,
  },
  {
    id: 'daily_stop_first',
    period: 'daily',
    title: 'أوقف الجولة أولاً (STOP)',
    description: 'املأ خاناتك وكن أول من يضغط زر إيقاف الجولة',
    iconName: 'Zap',
    actionType: 'hit_stop_first',
    targetCount: 1,
    rewardStars: 15,
  },
  {
    id: 'daily_friend_match',
    period: 'daily',
    title: 'تحدَّ صديقاً برمز الغرفة',
    description: 'أنشئ غرفة خاصة أو انضم لغرفة صديق لخوض مواجهة',
    iconName: 'Users',
    actionType: 'play_friend_match',
    targetCount: 1,
    rewardStars: 20,
  },
  {
    id: 'daily_rare_letter',
    period: 'daily',
    title: 'لعب بحرف نادر (مضاعف x2)',
    description: 'خض جولة بحرف ذهبي نادر مثل (ث، ذ، ض، ظ، غ)',
    iconName: 'Sparkles',
    actionType: 'use_rare_letter',
    targetCount: 1,
    rewardStars: 15,
  },
  {
    id: 'daily_watch_ad',
    period: 'daily',
    title: 'مشاهدة إعلان مكافأة',
    description: 'شاهد فيديو مكافأة واحد واحصل على نجوم إضافية',
    iconName: 'PlayCircle',
    actionType: 'watch_rewarded_ad',
    targetCount: 1,
    rewardStars: 15,
  },
];

export const WEEKLY_TASKS: TaskDefinition[] = [
  {
    id: 'weekly_win_8',
    period: 'weekly',
    title: 'بطل الأسبوع: 8 انتصارات',
    description: 'حقق الفوز في 8 مباريات مختلفة خلال هذا الأسبوع',
    iconName: 'Crown',
    actionType: 'win_matches',
    targetCount: 8,
    rewardStars: 80,
    highlight: true,
  },
  {
    id: 'weekly_play_15',
    period: 'weekly',
    title: 'المثابر: 15 مباراة',
    description: 'العب 15 مباراة كاملة لتثبت تفوقك ونشاطك',
    iconName: 'Swords',
    actionType: 'play_matches',
    targetCount: 15,
    rewardStars: 60,
  },
  {
    id: 'weekly_daily_challenge_4',
    period: 'weekly',
    title: 'عاشق التحديات اليومية',
    description: 'أكمل 4 تحديات يومية مختلفة خلال الأسبوع',
    iconName: 'CalendarCheck',
    actionType: 'complete_daily_challenge',
    targetCount: 4,
    rewardStars: 75,
  },
  {
    id: 'weekly_points_250',
    period: 'weekly',
    title: 'حاصد النقاط: 250 نقطة',
    description: 'اجمع 250 نقطة إجمالية من خلال إجاباتك الصحيحة',
    iconName: 'Flame',
    actionType: 'accumulate_points',
    targetCount: 250,
    rewardStars: 70,
  },
  {
    id: 'weekly_stop_5',
    period: 'weekly',
    title: 'سرعة البرق: 5 إيقافات',
    description: 'اضغط على زر STOP أولاً في 5 جولات مختلفة',
    iconName: 'Timer',
    actionType: 'hit_stop_first',
    targetCount: 5,
    rewardStars: 50,
  },
  {
    id: 'weekly_friend_3',
    period: 'weekly',
    title: 'مبارز الأصدقاء: 3 مواجهات',
    description: 'العب 3 مباريات تحدي في الغرف الخاصة مع أصدقائك',
    iconName: 'UserCheck',
    actionType: 'play_friend_match',
    targetCount: 3,
    rewardStars: 60,
  },
];

export const ALL_TASKS: TaskDefinition[] = [...DAILY_TASKS, ...WEEKLY_TASKS];
export const ALL_TASKS_MAP = new Map<string, TaskDefinition>(
  ALL_TASKS.map((t) => [t.id, t])
);

// WEEKLY MILESTONE REWARD
export const WEEKLY_MILESTONE_TARGET = 4; // Complete at least 4 weekly tasks
export const WEEKLY_MILESTONE_REWARD_STARS = 100;

// ==========================================
// DATE & TIME CYCLE HELPERS
// ==========================================

export function getTodayDateKey(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Returns ISO week key in format YYYY-Www (e.g. 2026-W35)
 */
export function getWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns formatted remaining time until midnight (Daily reset)
 */
export function getRemainingDailyTime(): { hours: number; minutes: number; text: string } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    hours,
    minutes,
    text: `${hours} س و ${minutes} د`,
  };
}

/**
 * Returns remaining days until next Monday midnight (Weekly reset)
 */
export function getRemainingWeeklyTime(): { days: number; hours: number; text: string } {
  const now = new Date();
  const nextMonday = new Date(now);
  const day = now.getDay();
  const diffToMonday = (8 - day) % 7 || 7; // days to next Monday
  nextMonday.setDate(now.getDate() + diffToMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const diffMs = Math.max(0, nextMonday.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return {
    days,
    hours,
    text: days > 0 ? `${days} أيام و ${hours} س` : `${hours} ساعة`,
  };
}

// ==========================================
// STATE INITIALIZATION & SYNC WITH FIRESTORE
// ==========================================

const LOCAL_STORAGE_KEY_PREFIX = 'aljadwal_tasks_';

export function createInitialTasksState(uid: string): UserTasksState {
  const dailyKey = getTodayDateKey();
  const weekKey = getWeekKey();
  const tasksMap: Record<string, UserTaskProgress> = {};

  ALL_TASKS.forEach((task) => {
    tasksMap[task.id] = {
      taskId: task.id,
      currentCount: 0,
      completed: false,
      claimed: false,
    };
  });

  return {
    uid,
    dailyDateKey: dailyKey,
    weeklyDateKey: weekKey,
    tasks: tasksMap,
    weeklyBonusClaimed: false,
    updatedAt: Date.now(),
  };
}

/**
 * Normalizes an existing tasks state, checking if daily or weekly tasks need resetting.
 */
export function normalizeTasksState(existing: UserTasksState, uid: string): UserTasksState {
  const currentDailyKey = getTodayDateKey();
  const currentWeekKey = getWeekKey();

  let modified = false;
  const updatedTasks = { ...(existing.tasks || {}) };

  // Daily reset check
  const isNewDay = existing.dailyDateKey !== currentDailyKey;
  if (isNewDay) {
    DAILY_TASKS.forEach((task) => {
      updatedTasks[task.id] = {
        taskId: task.id,
        currentCount: 0,
        completed: false,
        claimed: false,
      };
    });
    modified = true;
  }

  // Weekly reset check
  const isNewWeek = existing.weeklyDateKey !== currentWeekKey;
  let weeklyBonusClaimed = existing.weeklyBonusClaimed || false;
  if (isNewWeek) {
    WEEKLY_TASKS.forEach((task) => {
      updatedTasks[task.id] = {
        taskId: task.id,
        currentCount: 0,
        completed: false,
        claimed: false,
      };
    });
    weeklyBonusClaimed = false;
    modified = true;
  }

  // Ensure all known tasks exist in state
  ALL_TASKS.forEach((task) => {
    if (!updatedTasks[task.id]) {
      updatedTasks[task.id] = {
        taskId: task.id,
        currentCount: 0,
        completed: false,
        claimed: false,
      };
      modified = true;
    }
  });

  return {
    uid: uid || existing.uid,
    dailyDateKey: currentDailyKey,
    weeklyDateKey: currentWeekKey,
    tasks: updatedTasks,
    weeklyBonusClaimed,
    updatedAt: modified ? Date.now() : existing.updatedAt,
  };
}

/**
 * Fetches user tasks state from Firestore (or localStorage for offline/guests),
 * handling daily/weekly rollover seamlessly.
 */
export async function fetchUserTasks(uid: string): Promise<UserTasksState> {
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${uid || 'guest'}`;

  // Try reading local storage first as fast cache
  let cachedState: UserTasksState | null = null;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      cachedState = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local task state:', e);
  }

  if (!uid || uid === 'guest') {
    const state = cachedState ? normalizeTasksState(cachedState, 'guest') : createInitialTasksState('guest');
    localStorage.setItem(localKey, JSON.stringify(state));
    return state;
  }

  try {
    const docRef = doc(db, 'user_tasks', uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as UserTasksState;
      const normalized = normalizeTasksState(data, uid);
      
      // If reset happened, persist back to Firestore
      if (normalized.dailyDateKey !== data.dailyDateKey || normalized.weeklyDateKey !== data.weeklyDateKey) {
        await setDoc(docRef, normalized, { merge: true });
      }
      
      localStorage.setItem(localKey, JSON.stringify(normalized));
      return normalized;
    } else {
      // Create fresh document in Firestore
      const fresh = cachedState ? normalizeTasksState(cachedState, uid) : createInitialTasksState(uid);
      await setDoc(docRef, fresh);
      localStorage.setItem(localKey, JSON.stringify(fresh));
      return fresh;
    }
  } catch (err) {
    console.warn('Error fetching tasks from Firestore, falling back to local:', err);
    const fallback = cachedState ? normalizeTasksState(cachedState, uid) : createInitialTasksState(uid);
    localStorage.setItem(localKey, JSON.stringify(fallback));
    return fallback;
  }
}

/**
 * Saves tasks state to Firestore & local storage
 */
export async function saveUserTasks(tasksState: UserTasksState): Promise<void> {
  const uid = tasksState.uid;
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${uid || 'guest'}`;
  
  try {
    localStorage.setItem(localKey, JSON.stringify(tasksState));
  } catch (e) {
    // Ignore storage quota
  }

  if (uid && uid !== 'guest') {
    try {
      const docRef = doc(db, 'user_tasks', uid);
      await setDoc(docRef, tasksState, { merge: true });
    } catch (err) {
      console.error('Error saving user tasks to Firestore:', err);
    }
  }
}

/**
 * Tracks an action and increments relevant daily and weekly task progress.
 * Returns array of newly completed tasks (for popup celebration toast).
 */
export async function recordTaskAction(
  currentState: UserTasksState,
  actionType: TaskActionType,
  amount: number = 1
): Promise<{ newState: UserTasksState; newlyCompleted: TaskDefinition[] }> {
  const normalized = normalizeTasksState(currentState, currentState.uid);
  const updatedTasks = { ...normalized.tasks };
  const newlyCompleted: TaskDefinition[] = [];

  ALL_TASKS.forEach((task) => {
    if (task.actionType === actionType) {
      const current = updatedTasks[task.id] || {
        taskId: task.id,
        currentCount: 0,
        completed: false,
        claimed: false,
      };

      if (!current.completed) {
        const newCount = Math.min(task.targetCount, current.currentCount + amount);
        const isNowCompleted = newCount >= task.targetCount;

        updatedTasks[task.id] = {
          ...current,
          currentCount: newCount,
          completed: isNowCompleted,
        };

        if (isNowCompleted) {
          newlyCompleted.push(task);
        }
      }
    }
  });

  const newState: UserTasksState = {
    ...normalized,
    tasks: updatedTasks,
    updatedAt: Date.now(),
  };

  await saveUserTasks(newState);

  return { newState, newlyCompleted };
}

/**
 * Claims a specific completed task reward and credits stars in Firestore
 */
export async function claimTaskReward(
  currentState: UserTasksState,
  taskId: string
): Promise<{ newState: UserTasksState; starsAwarded: number; task: TaskDefinition | null }> {
  const taskDef = ALL_TASKS_MAP.get(taskId);
  if (!taskDef) return { newState: currentState, starsAwarded: 0, task: null };

  const taskProgress = currentState.tasks[taskId];
  if (!taskProgress || !taskProgress.completed || taskProgress.claimed) {
    return { newState: currentState, starsAwarded: 0, task: null };
  }

  const starsAwarded = taskDef.rewardStars;
  const updatedTasks = {
    ...currentState.tasks,
    [taskId]: {
      ...taskProgress,
      claimed: true,
      claimedAt: Date.now(),
    },
  };

  const newState: UserTasksState = {
    ...currentState,
    tasks: updatedTasks,
    updatedAt: Date.now(),
  };

  await saveUserTasks(newState);

  // Credit user profile stars in Firestore if authenticated
  if (currentState.uid && currentState.uid !== 'guest') {
    try {
      const userRef = doc(db, 'users', currentState.uid);
      await updateDoc(userRef, {
        stars: increment(starsAwarded),
      });
    } catch (err) {
      console.error('Error awarding task stars in Firestore:', err);
    }
  }

  return { newState, starsAwarded, task: taskDef };
}

/**
 * Claims all currently completed and unclaimed tasks in one click
 */
export async function claimAllCompletedTasks(
  currentState: UserTasksState
): Promise<{ newState: UserTasksState; totalStarsAwarded: number; claimedCount: number }> {
  let totalStars = 0;
  let claimedCount = 0;
  const updatedTasks = { ...currentState.tasks };

  ALL_TASKS.forEach((task) => {
    const progress = updatedTasks[task.id];
    if (progress && progress.completed && !progress.claimed) {
      totalStars += task.rewardStars;
      claimedCount++;
      updatedTasks[task.id] = {
        ...progress,
        claimed: true,
        claimedAt: Date.now(),
      };
    }
  });

  if (claimedCount === 0) {
    return { newState: currentState, totalStarsAwarded: 0, claimedCount: 0 };
  }

  const newState: UserTasksState = {
    ...currentState,
    tasks: updatedTasks,
    updatedAt: Date.now(),
  };

  await saveUserTasks(newState);

  if (currentState.uid && currentState.uid !== 'guest' && totalStars > 0) {
    try {
      const userRef = doc(db, 'users', currentState.uid);
      await updateDoc(userRef, {
        stars: increment(totalStars),
      });
    } catch (err) {
      console.error('Error awarding all task stars in Firestore:', err);
    }
  }

  return { newState, totalStarsAwarded: totalStars, claimedCount };
}

/**
 * Claims the weekly milestone bonus chest (e.g. +100 ⭐ when 4+ weekly tasks are completed)
 */
export async function claimWeeklyMilestoneBonus(
  currentState: UserTasksState
): Promise<{ newState: UserTasksState; starsAwarded: number; success: boolean }> {
  if (currentState.weeklyBonusClaimed) {
    return { newState: currentState, starsAwarded: 0, success: false };
  }

  // Count completed weekly tasks
  const completedWeeklyCount = WEEKLY_TASKS.filter(
    (t) => currentState.tasks[t.id]?.completed
  ).length;

  if (completedWeeklyCount < WEEKLY_MILESTONE_TARGET) {
    return { newState: currentState, starsAwarded: 0, success: false };
  }

  const starsAwarded = WEEKLY_MILESTONE_REWARD_STARS;
  const newState: UserTasksState = {
    ...currentState,
    weeklyBonusClaimed: true,
    updatedAt: Date.now(),
  };

  await saveUserTasks(newState);

  if (currentState.uid && currentState.uid !== 'guest') {
    try {
      const userRef = doc(db, 'users', currentState.uid);
      await updateDoc(userRef, {
        stars: increment(starsAwarded),
      });
    } catch (err) {
      console.error('Error awarding weekly bonus in Firestore:', err);
    }
  }

  return { newState, starsAwarded, success: true };
}

/**
 * Counts total unclaimed completed tasks for badges in Lobby/Navbar/Sidebar
 */
export function countUnclaimedTasks(state: UserTasksState | null): number {
  if (!state || !state.tasks) return 0;
  let count = 0;
  
  ALL_TASKS.forEach((task) => {
    const p = state.tasks[task.id];
    if (p && p.completed && !p.claimed) {
      count++;
    }
  });

  // Also check if weekly mega bonus is ready to claim and not yet claimed
  const completedWeeklyCount = WEEKLY_TASKS.filter(
    (t) => state.tasks[t.id]?.completed
  ).length;
  if (completedWeeklyCount >= WEEKLY_MILESTONE_TARGET && !state.weeklyBonusClaimed) {
    count++;
  }

  return count;
}
