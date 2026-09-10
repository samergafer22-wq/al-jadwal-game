import { collection, getDocs, doc, setDoc, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeArabic } from './arabicUtils';
import { ALL_CATEGORIES } from '../data/categories';
import { registerDynamicWordInLexicon, isWordInLexicon } from '../data/arabicLexicon';

export interface LearnedWordEntry {
  id: string;
  word: string;
  normalizedWord: string;
  letter: string;
  categoryId: string;
  addedBy: string;
  addedAt: number;
  source: 'player_learning' | 'match_auto_learn' | 'dispute_justified' | 'daily_challenge' | 'community_suggestion' | 'admin';
  learnedCount: number;
  isAccepted: boolean;
  notes?: string;
}

const STORAGE_KEY = 'aljadwal_learned_lexicon_v2';
const MEMORY_LEARNED_MAP: Map<string, LearnedWordEntry> = new Map();
const SUBSCRIBERS: Set<(words: LearnedWordEntry[]) => void> = new Set();
let isInitialized = false;

function generateEntryId(normalizedWord: string, categoryId: string): string {
  return `${normalizedWord}_${categoryId}`.replace(/\s+/g, '_');
}

/**
 * Loads learned words from localStorage and syncs with Firestore
 */
export async function initLearnedLexicon(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Load from local storage immediately for fast offline bootstrap
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: LearnedWordEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry.word && entry.categoryId && entry.letter) {
            const id = entry.id || generateEntryId(entry.normalizedWord || normalizeArabic(entry.word), entry.categoryId);
            MEMORY_LEARNED_MAP.set(id, entry);
            registerDynamicWordInLexicon(entry.word, entry.letter, entry.categoryId);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Failed loading learned words from localStorage:', e);
  }

  notifySubscribers();

  // 2. Asynchronously sync community learned words from Firestore
  try {
    const colRef = collection(db, 'word_bank_overrides');
    const q = query(colRef, limit(500));
    const snap = await getDocs(q);

    let hasNew = false;
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data && data.word && data.categoryId) {
        const norm = data.normalizedWord || normalizeArabic(data.word);
        const letter = data.letter || (norm.startsWith('ال') ? norm.charAt(2) : norm.charAt(0)) || 'ا';
        const id = d.id || generateEntryId(norm, data.categoryId);
        
        const entry: LearnedWordEntry = {
          id,
          word: data.word,
          normalizedWord: norm,
          letter,
          categoryId: data.categoryId,
          addedBy: data.addedBy || 'لاعب',
          addedAt: data.addedAt || Date.now(),
          source: data.source || 'community_suggestion',
          learnedCount: data.learnedCount || 1,
          isAccepted: data.isAccepted !== false,
          notes: data.notes || '',
        };

        if (entry.isAccepted) {
          MEMORY_LEARNED_MAP.set(id, entry);
          registerDynamicWordInLexicon(entry.word, entry.letter, entry.categoryId);
          hasNew = true;
        }
      }
    });

    if (hasNew) {
      persistToLocalStorage();
      notifySubscribers();
    }
  } catch (err) {
    // Offline or network warning - local cache is already active
    console.warn('Cloud sync for learned words postponed (using offline cache):', err);
  }
}

/**
 * Saves current in-memory cache to localStorage
 */
function persistToLocalStorage(): void {
  try {
    const list = Array.from(MEMORY_LEARNED_MAP.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

function notifySubscribers(): void {
  const list = Array.from(MEMORY_LEARNED_MAP.values());
  SUBSCRIBERS.forEach((cb) => {
    try {
      cb(list);
    } catch {
      // ignore
    }
  });
}

export function subscribeToLearnedLexicon(callback: (words: LearnedWordEntry[]) => void): () => void {
  SUBSCRIBERS.add(callback);
  callback(Array.from(MEMORY_LEARNED_MAP.values()));
  return () => {
    SUBSCRIBERS.delete(callback);
  };
}

/**
 * Learns a new Arabic word into the application lexicon.
 * - Instantly indexes it in memory for real-time validation.
 * - Saves to localStorage for persistent offline availability.
 * - Saves to Firestore word_bank_overrides for community wide learning.
 */
export async function learnWord(params: {
  word: string;
  letter: string;
  categoryId: string;
  addedBy?: string;
  source?: LearnedWordEntry['source'];
  notes?: string;
}): Promise<{ success: boolean; isNew: boolean; entry: LearnedWordEntry }> {
  const { word, letter, categoryId, addedBy = 'لاعب ذكي', source = 'player_learning', notes = '' } = params;
  
  const trimmed = word?.trim() || '';
  if (!trimmed || trimmed.length < 2) {
    throw new Error('الكلمة قصيرة جداً');
  }

  const normalized = normalizeArabic(trimmed);
  const id = generateEntryId(normalized, categoryId);

  const existing = MEMORY_LEARNED_MAP.get(id);
  const isNew = !existing;

  const entry: LearnedWordEntry = {
    id,
    word: trimmed,
    normalizedWord: normalized,
    letter,
    categoryId,
    addedBy: existing?.addedBy || addedBy,
    addedAt: existing?.addedAt || Date.now(),
    source: existing?.source || source,
    learnedCount: (existing?.learnedCount || 0) + 1,
    isAccepted: true,
    notes: notes || existing?.notes || '',
  };

  // Update in-memory registry
  MEMORY_LEARNED_MAP.set(id, entry);
  registerDynamicWordInLexicon(entry.word, entry.letter, entry.categoryId);

  // Persist locally
  persistToLocalStorage();
  notifySubscribers();

  // Async cloud sync (non-blocking)
  try {
    const docRef = doc(db, 'word_bank_overrides', id);
    setDoc(
      docRef,
      {
        id,
        word: entry.word,
        normalizedWord: entry.normalizedWord,
        letter: entry.letter,
        categoryId: entry.categoryId,
        addedBy: entry.addedBy,
        addedAt: entry.addedAt,
        source: entry.source,
        learnedCount: entry.learnedCount,
        isAccepted: true,
        notes: entry.notes,
        lastLearnedAt: Date.now(),
      },
      { merge: true }
    ).catch(() => {
      // offline silent catch
    });
  } catch {
    // ignore
  }

  return { success: true, isNew, entry };
}

/**
 * Auto-learns a batch of valid answers from a finished match round.
 */
export function autoLearnMatchAnswers(
  letter: string,
  answers: Record<string, string>,
  userDisplayName: string = 'لاعب'
): void {
  if (!answers || !letter) return;

  Object.entries(answers).forEach(([catId, rawWord]) => {
    const trimmed = rawWord?.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Check if valid
    const alreadyKnown = isWordInLexicon(trimmed, letter, catId);
    // Learn the word regardless to increment count or record player usage
    learnWord({
      word: trimmed,
      letter,
      categoryId: catId,
      addedBy: userDisplayName,
      source: 'match_auto_learn',
      notes: alreadyKnown ? 'تم تعزيزها في مباراة' : 'تم تعلمها لأول مرة من إجابة لاعب',
    }).catch(() => {
      // ignore
    });
  });
}

/**
 * Returns all learned words currently in the application.
 */
export function getAllLearnedWords(): LearnedWordEntry[] {
  return Array.from(MEMORY_LEARNED_MAP.values()).sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * Returns summary stats for the learned lexicon.
 */
export function getLearnedLexiconStats(): {
  totalLearned: number;
  byCategory: Record<string, number>;
  byLetter: Record<string, number>;
  recentWords: LearnedWordEntry[];
} {
  const all = Array.from(MEMORY_LEARNED_MAP.values());
  const byCategory: Record<string, number> = {};
  const byLetter: Record<string, number> = {};

  all.forEach((w) => {
    byCategory[w.categoryId] = (byCategory[w.categoryId] || 0) + 1;
    byLetter[w.letter] = (byLetter[w.letter] || 0) + 1;
  });

  return {
    totalLearned: all.length,
    byCategory,
    byLetter,
    recentWords: all.slice(0, 10),
  };
}
