import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, MatchData } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// In Firebase JS SDK with specific custom database ID from config:
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Helper for Arabic Firebase Auth error messages
export function mapFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب من قِبل الإدارة.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'بيانات الدخول غير صحيحة، يرجى التحقق من البريد وكلمة المرور.';
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل مسبقاً بحساب آخر. يمكنك تسجيل الدخول بدلاً من ذلك.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة. يرجى إدخال 6 خانات أو رموز على الأقل.';
    case 'auth/too-many-requests':
      return 'تم حظر تسجيل الدخول مؤقتاً بسبب المحاولات المتكررة. يرجى الانتظار والمحاولة لاحقاً.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد الإلكتروني غير مفعل في إعدادات Firebase Auth.';
    default:
      return error?.message || 'حدث خطأ أثناء المصادقة، يرجى المحاولة مرة أخرى.';
  }
}

// Google Sign-In Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return result.user;
  } catch (error: any) {
    console.error('Email Sign-In Error:', error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<User> {
  try {
    const cleanName = displayName.trim() || `بطل_الجدول_${Math.floor(1000 + Math.random() * 9000)}`;
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    
    // Update Firebase Auth profile
    await updateProfile(result.user, {
      displayName: cleanName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${result.user.uid}`
    });

    // Initialize firestore user profile
    await initUserProfile(result.user, cleanName);
    return result.user;
  } catch (error: any) {
    console.error('Email Sign-Up Error:', error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function sendResetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.error('Password Reset Error:', error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function loginAnonymously(customName?: string): Promise<User> {
  const result = await signInAnonymously(auth);
  if (customName) {
    await initUserProfile(result.user, customName);
  }
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// User Profile Management
export async function initUserProfile(user: User, customDisplayName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  
  const today = new Date().toISOString().split('T')[0];
  
  if (!snap.exists()) {
    const defaultProfile: UserProfile = {
      uid: user.uid,
      displayName: customDisplayName || user.displayName || `لاعب_${Math.floor(1000 + Math.random() * 9000)}`,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      email: user.email || undefined,
      stars: 100, // 100 Welcome Stars
      gems: 10, // 10 Welcome Gems
      hints: 3, // 3 Welcome In-Game Hints
      stats: {
        wins: 0,
        losses: 0,
        totalMatches: 0,
        roundsWon: 0,
        highestScore: 0,
        totalWordsAccepted: 0,
        rareLetterWins: 0,
        fastStopsCount: 0,
      },
      unlockedCategories: ['name', 'animal', 'plant', 'inanimate', 'country'],
      unlockedThemes: ['classic'],
      activeTheme: 'classic',
      rewardedAdsToday: 0,
      lastRewardDate: today,
      matchesPlayedSinceLastInterstitial: 0,
      luckySpinStreak: 1,
      totalSpinsCount: 0,
      achievements: {},
      hapticsEnabled: true,
      soundEnabled: true,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };
    
    await setDoc(userRef, defaultProfile);
    return defaultProfile;
  } else {
    const data = snap.data() as UserProfile;
    // Backfill any missing new fields for existing accounts
    const updates: Partial<UserProfile> = { lastSeen: Date.now() };
    if (data.hints === undefined) updates.hints = 3;
    if (data.hapticsEnabled === undefined) updates.hapticsEnabled = true;
    if (data.soundEnabled === undefined) updates.soundEnabled = true;
    if (data.stats.totalWordsAccepted === undefined) updates['stats.totalWordsAccepted' as any] = (data.stats.wins * 8) || 0;
    if (data.stats.rareLetterWins === undefined) updates['stats.rareLetterWins' as any] = 0;
    if (data.stats.fastStopsCount === undefined) updates['stats.fastStopsCount' as any] = 0;

    // Reset daily rewarded ads if new day
    if (data.lastRewardDate !== today) {
      updates.rewardedAdsToday = 0;
      updates.lastRewardDate = today;
      data.rewardedAdsToday = 0;
      data.lastRewardDate = today;
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates as any);
    }
    return { ...data, ...updates };
  }
}

/**
 * Google Play Data Safety Compliant: Deletes all user documents, data & signs out / deletes auth user
 */
export async function deleteUserAccountAndData(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);

    // Also delete user tasks if exists
    const tasksRef = doc(db, 'userTasks', uid);
    await deleteDoc(tasksRef).catch(() => {});

    // Clear local storage entries
    localStorage.removeItem('aljadwal_haptics_enabled');
    localStorage.removeItem('aljadwal_audio_muted');
    localStorage.removeItem('aljadwal_recent_matches');

    // Delete Auth User if authenticated
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await currentUser.delete().catch(async (authErr) => {
        console.warn('Could not delete Firebase Auth user object directly (may require re-auth), signing out:', authErr);
        await signOut(auth);
      });
    } else {
      await signOut(auth);
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}

export const deleteUserAccount = deleteUserAccountAndData;

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Error subscribing to profile:', err);
  });
}

// Match Helpers
export function subscribeToMatch(matchId: string, callback: (match: MatchData | null) => void) {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as MatchData);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Error subscribing to match:', err);
  });
}
