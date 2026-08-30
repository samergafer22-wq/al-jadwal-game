import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, MatchData, AdminSystemConfig, GlobalAnnouncement, WordBankOverrideItem } from '../types';
import { EXTRA_CATEGORIES } from '../data/categories';

export const PRIMARY_ADMIN_EMAIL = 'samergafer22@gmail.com';

export const ADMIN_EMAILS = [
  'samergafer22@gmail.com',
];

/**
 * Checks whether a given user has admin privileges.
 */
export function checkIsAdmin(user: UserProfile | { email?: string | null; role?: string; isAdmin?: boolean; uid?: string } | null): boolean {
  if (!user) return false;
  
  const email = (user.email || auth.currentUser?.email || '').trim().toLowerCase();
  if (email === PRIMARY_ADMIN_EMAIL.toLowerCase() || ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    return true;
  }

  if (user.role === 'admin' || user.isAdmin === true) {
    return true;
  }

  return false;
}

/**
 * Bootstrap admin status if the logged-in email matches PRIMARY_ADMIN_EMAIL
 */
export async function bootstrapAdminStatusIfNeeded(userProfile: UserProfile): Promise<boolean> {
  const email = (userProfile.email || auth.currentUser?.email || '').trim().toLowerCase();
  if (email === PRIMARY_ADMIN_EMAIL.toLowerCase() || ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    if (userProfile.role !== 'admin' || !userProfile.isAdmin) {
      try {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          role: 'admin',
          isAdmin: true,
        });

        // Also ensure admin doc in /admins collection
        const adminRef = doc(db, 'admins', userProfile.uid);
        await setDoc(adminRef, {
          uid: userProfile.uid,
          email: userProfile.email || PRIMARY_ADMIN_EMAIL,
          role: 'admin',
          grantedAt: Date.now(),
        }, { merge: true });

        return true;
      } catch (err) {
        console.warn('Failed to auto-grant admin document:', err);
      }
    }
    return true;
  }
  return false;
}

/**
 * Super Admin Power-Up: Give unlimited/max stars, gems, hints, and unlock all categories.
 */
export async function grantSuperAdminResources(userId: string): Promise<void> {
  const allCategoryIds = [
    'name', 'animal', 'plant', 'inanimate', 'country',
    ...EXTRA_CATEGORIES.map(c => c.id)
  ];

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    stars: 99999,
    gems: 9999,
    hints: 99,
    unlockedCategories: allCategoryIds,
    role: 'admin',
    isAdmin: true,
  });

  const adminRef = doc(db, 'admins', userId);
  await setDoc(adminRef, {
    uid: userId,
    role: 'admin',
    updatedAt: Date.now(),
  }, { merge: true });
}

/**
 * Fetch all users from Firestore (up to limit) for the admin players directory.
 */
export async function fetchAllUsers(maxUsers = 50): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('lastSeen', 'desc'), limit(maxUsers));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() } as UserProfile));
  } catch (err) {
    console.error('Error fetching users for admin:', err);
    // Fallback simple query
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ ...d.data() } as UserProfile));
  }
}

/**
 * Modify any user's balance or permissions.
 */
export async function adminUpdateUser(
  userId: string, 
  updates: Partial<UserProfile> & { resetStats?: boolean }
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const patch: Record<string, any> = { ...updates };
  
  if (updates.resetStats) {
    patch.stats = {
      wins: 0,
      losses: 0,
      totalMatches: 0,
      roundsWon: 0,
      highestScore: 0,
      totalWordsAccepted: 0,
      rareLetterWins: 0,
      fastStopsCount: 0,
    };
    delete patch.resetStats;
  }

  await updateDoc(userRef, patch);

  if (updates.role === 'admin' || updates.isAdmin === true) {
    const adminRef = doc(db, 'admins', userId);
    await setDoc(adminRef, {
      uid: userId,
      role: 'admin',
      updatedAt: Date.now(),
    }, { merge: true });
  } else if (updates.role === 'player' || updates.isAdmin === false) {
    try {
      await deleteDoc(doc(db, 'admins', userId));
    } catch {
      // ignore
    }
  }
}

/**
 * Unlock all categories for a given user.
 */
export async function adminUnlockAllCategoriesForUser(userId: string): Promise<void> {
  const allCategoryIds = [
    'name', 'animal', 'plant', 'inanimate', 'country',
    ...EXTRA_CATEGORIES.map(c => c.id)
  ];
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    unlockedCategories: allCategoryIds,
  });
}

/**
 * Fetch active and recent matches for Room Controller.
 */
export async function fetchAdminMatches(maxMatches = 30): Promise<MatchData[]> {
  try {
    const matchesCol = collection(db, 'matches');
    const q = query(matchesCol, orderBy('createdAt', 'desc'), limit(maxMatches));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as MatchData));
  } catch (err) {
    console.error('Error fetching matches for admin:', err);
    const snap = await getDocs(collection(db, 'matches'));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as MatchData));
  }
}

/**
 * Force cancel or finish an active match room.
 */
export async function adminForceMatchStatus(matchId: string, newStatus: 'cancelled' | 'match_end', winnerId?: string): Promise<void> {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, {
    status: newStatus,
    winnerId: winnerId || (newStatus === 'match_end' ? 'draw' : undefined),
    updatedAt: Date.now(),
  });
}

/**
 * Delete an abandoned or old match.
 */
export async function adminDeleteMatch(matchId: string): Promise<void> {
  await deleteDoc(doc(db, 'matches', matchId));
}

/**
 * Load or update system config.
 */
export async function getAdminSystemConfig(): Promise<AdminSystemConfig> {
  try {
    const snap = await getDoc(doc(db, 'system_config', 'global'));
    if (snap.exists()) {
      return snap.data() as AdminSystemConfig;
    }
  } catch (err) {
    console.warn('System config load error:', err);
  }
  return {
    roundDuration: 45,
    defaultStars: 100,
    maintenanceMode: false,
    doubleStarsActive: false,
    freeGemsEvent: false,
  };
}

export async function saveAdminSystemConfig(config: AdminSystemConfig, adminUid: string): Promise<void> {
  await setDoc(doc(db, 'system_config', 'global'), {
    ...config,
    updatedAt: Date.now(),
    updatedBy: adminUid,
  }, { merge: true });
}

/**
 * Announcements Management
 */
export async function fetchAnnouncements(): Promise<GlobalAnnouncement[]> {
  try {
    const snap = await getDocs(collection(db, 'announcements'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalAnnouncement));
  } catch {
    return [];
  }
}

export async function saveAnnouncement(announcement: GlobalAnnouncement): Promise<void> {
  await setDoc(doc(db, 'announcements', announcement.id), announcement, { merge: true });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
}

/**
 * Word Bank Overrides (Add / Remove custom words)
 */
export async function fetchWordBankOverrides(): Promise<WordBankOverrideItem[]> {
  try {
    const snap = await getDocs(collection(db, 'word_bank_overrides'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WordBankOverrideItem));
  } catch {
    return [];
  }
}

export async function saveWordBankOverride(item: WordBankOverrideItem): Promise<void> {
  await setDoc(doc(db, 'word_bank_overrides', item.id), item, { merge: true });
}

export async function deleteWordBankOverride(id: string): Promise<void> {
  await deleteDoc(doc(db, 'word_bank_overrides', id));
}
