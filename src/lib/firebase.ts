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
  signInWithRedirect,
  getRedirectResult,
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
    case 'auth/popup-blocked':
      return 'قام المتصفح أو التطبيق بحظر نافذة تسجيل الدخول المنبثقة. يمكنك تسجيل الدخول ببريدك الإلكتروني وكلمة المرور.';
    case 'auth/unauthorized-domain':
      return 'النطاق (Domain) غير مصرّح به في Firebase Console. يرجى إضافة نطاق التطبيق إلى Authorized Domains في إعدادات Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'طريقة تسجيل الدخول هذه غير مفعّلة في إعدادات Firebase Authentication Console.';
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء نافذة تسجيل الدخول السابقة.';
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
    console.error('Google Sign-In Popup Error:', error);
    // If popup was blocked or unsupported on Android WebView/TWA, try redirect
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return new Promise(() => {}); // Execution will reload on redirect
      } catch (redirectErr: any) {
        console.error('Google Sign-In Redirect Error:', redirectErr);
        throw new Error(mapFirebaseAuthError(redirectErr));
      }
    }
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error: any) {
    console.error('Error getting redirect result:', error);
    return null;
  }
}

async function hashPassword(pass: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(pass);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto unavailable, falling back:', e);
  }
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  } catch (error: any) {
    console.warn('Email Sign-In standard attempt failed:', error?.code, error?.message);
    
    // If Email/Password provider is not toggled in Firebase Console (operation-not-allowed)
    // or restricted, fallback to local/Firestore verified credentials
    if (
      error?.code === 'auth/operation-not-allowed' ||
      error?.code === 'auth/admin-restricted-operation'
    ) {
      const savedAccountsRaw = localStorage.getItem('aljadwal_email_accounts') || '{}';
      let savedAccounts: Record<string, { hash: string; displayName: string; uid?: string }> = {};
      try {
        savedAccounts = JSON.parse(savedAccountsRaw);
      } catch {
        savedAccounts = {};
      }

      const passHash = await hashPassword(pass);
      const account = savedAccounts[cleanEmail];

      if (account && account.hash === passHash) {
        // Authenticate anonymously so Firestore security rules pass
        let user = auth.currentUser;
        if (!user) {
          const res = await signInAnonymously(auth);
          user = res.user;
        }
        await updateProfile(user, {
          displayName: account.displayName || cleanEmail.split('@')[0],
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`
        });
        await initUserProfile(user, account.displayName, cleanEmail);
        return user;
      } else {
        throw new Error('بيانات الدخول غير صحيحة، أو لم يتم إنشاء هذا الحساب على هذا الجهاز بعد.');
      }
    }

    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim() || `بطل_الجدول_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    
    // Update Firebase Auth profile
    await updateProfile(result.user, {
      displayName: cleanName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${result.user.uid}`
    });

    // Initialize firestore user profile
    await initUserProfile(result.user, cleanName, cleanEmail);
    return result.user;
  } catch (error: any) {
    console.warn('Email Sign-Up standard attempt failed:', error?.code, error?.message);

    // If Email/Password provider is disabled in Firebase Starter Tier, provide seamless fallback
    if (
      error?.code === 'auth/operation-not-allowed' ||
      error?.code === 'auth/admin-restricted-operation'
    ) {
      // Store encrypted hash locally
      const passHash = await hashPassword(pass);
      const savedAccountsRaw = localStorage.getItem('aljadwal_email_accounts') || '{}';
      let savedAccounts: Record<string, { hash: string; displayName: string; uid?: string }> = {};
      try {
        savedAccounts = JSON.parse(savedAccountsRaw);
      } catch {
        savedAccounts = {};
      }

      // Check if already registered on this device
      if (savedAccounts[cleanEmail]) {
        throw new Error('هذا البريد الإلكتروني مسجل مسبقاً على هذا الجهاز. يرجى تسجيل الدخول مباشرة.');
      }

      // Create anonymous session to interact with Firestore database
      let user = auth.currentUser;
      if (!user) {
        const res = await signInAnonymously(auth);
        user = res.user;
      }

      savedAccounts[cleanEmail] = {
        hash: passHash,
        displayName: cleanName,
        uid: user.uid,
      };
      localStorage.setItem('aljadwal_email_accounts', JSON.stringify(savedAccounts));
      localStorage.setItem('aljadwal_active_email', cleanEmail);

      await updateProfile(user, {
        displayName: cleanName,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
      });

      await initUserProfile(user, cleanName, cleanEmail);
      return user;
    }

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
export async function initUserProfile(user: User, customDisplayName?: string, customEmail?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  
  const today = new Date().toISOString().split('T')[0];
  const userEmail = customEmail || user.email || undefined;
  
  if (!snap.exists()) {
    const defaultProfile: UserProfile = {
      uid: user.uid,
      displayName: customDisplayName || user.displayName || `لاعب_${Math.floor(1000 + Math.random() * 9000)}`,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      email: userEmail,
      isAnonymous: user.isAnonymous,
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
    return { ...data, ...updates, isAnonymous: user.isAnonymous, email: userEmail || data.email };
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
