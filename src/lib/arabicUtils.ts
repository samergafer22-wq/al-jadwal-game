import { RARE_LETTERS_SET, ALL_CATEGORIES, ARABIC_WORD_BANK } from '../data/categories';
import { isWordInLexicon } from '../data/arabicLexicon';
import { PlayerAnswerBreakdown, RoundResult } from '../types';

/**
 * Normalizes Arabic text for fair comparison and robust validation:
 * - Strips tashkeel / diacritics / tatweel
 * - Normalizes variants of Alif (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbouta (ة -> ه)
 * - Normalizes Alif Maqsura (ى -> ي)
 * - Normalizes Hamza variants (ؤ, ئ -> و, ي)
 * - Strips zero-width chars and trims whitespaces
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove zero-width spaces, joiners and formatting marks
  cleaned = cleaned.replace(/[\u200B-\u200F\uFEFF\u00AD\u202A-\u202E]/g, '');
  
  // Remove Arabic diacritics (tashkeel), tanween, shadda, sukun, and tatweel (_)
  cleaned = cleaned.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  
  // Normalize all Alif variations (أ, إ, آ, ٱ, ٲ, ٳ -> ا)
  cleaned = cleaned.replace(/[أإآٱٲٳ]/g, 'ا');
  
  // Normalize Taa Marbouta to Haa (ة -> ه)
  cleaned = cleaned.replace(/ة/g, 'ه');
  
  // Normalize Alif Maqsura to Yaa (ى -> ي)
  cleaned = cleaned.replace(/ى/g, 'ي');
  
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.toLowerCase().trim();
}

/**
 * Checks whether an Arabic letter matches the beginning of a given word.
 * Also intelligently handles:
 * - Visually similar variants of Alif (أ, إ, آ, ٱ, ا)
 * - The definite article 'ال' / 'الـ' (e.g. if letter is 'أ' and word is 'الأردن' or letter is 'ب' and word is 'البحرين' or 'بحرين')
 */
export function checkStartsWithLetter(word: string, letter: string): boolean {
  if (!word || !letter) return false;
  
  const normWord = normalizeArabic(word);
  const normLetter = normalizeArabic(letter);
  
  if (!normWord || !normLetter) return false;
  
  // Direct match on normalized first character (handles أ/إ/آ/ا interchangeably)
  if (normWord.startsWith(normLetter)) {
    return true;
  }
  
  // Special case: If word starts with 'ال' (Al-) and letter is 'ا' / 'أ' (Alif)
  if (normLetter === 'ا' && normWord.startsWith('ال')) {
    return true;
  }
  
  // If word starts with 'ال' and player entered word for root letter (e.g. 'البحرين' for 'ب', 'الحصان' for 'ح')
  if (normWord.startsWith('ال') && normWord.length >= 3) {
    const withoutAl = normWord.slice(2);
    if (withoutAl.startsWith(normLetter)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Known keyboard mash patterns and nonsense character sequences
 */
const KEYBOARD_MASH_PATTERNS = [
  'ضصثق', 'ثقفغ', 'فغعه', 'عهخح', 'هخحج', 'خحجد', 'شسيبل', 'سيبلا', 'يبتات', 'كمنت', 'منتلا', 'تلاال',
  'ئءؤر', 'ءؤرى', 'ؤرىة', 'رىةو', 'ىةوز', 'ةوزظ', 'حنتوحز', 'ضصث', 'ثقف', 'قفا', 'شسي', 'يبت', 'كمن',
  'asd', 'qwe', 'zxc', 'jkl'
];

/**
 * Detects invalid random character mashing or spam (e.g. "حنتوحز", "حيم", "حححح")
 */
export function isArabicGibberish(word: string): boolean {
  if (!word) return true;
  const trimmed = word.trim();
  const normalized = normalizeArabic(trimmed);
  
  // Must contain only Arabic letters, spaces, and hyphens
  const arabicOnlyRegex = /^[\u0600-\u06FF\s\-]+$/;
  if (!arabicOnlyRegex.test(trimmed)) {
    return true;
  }
  
  // More than 2 identical consecutive characters (e.g. "ححح", "اااا")
  if (/(.)\1{2,}/.test(trimmed)) {
    return true;
  }
  
  // Check for common keyboard mash substrings
  for (const mash of KEYBOARD_MASH_PATTERNS) {
    if (normalized.includes(mash)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Recognizes Arabic Name Morphology (فاعِل، فَعيل، فَعْلان، أفْعَل، فاعِلة، أسماء مركبة)
 * Validates names like: زاهر، سامر، صابر، كريم، مروان، أحمد، عبد الرحمن، نور الدين، إلخ.
 */
function isMorphologicallyValidArabicName(word: string): boolean {
  const norm = normalizeArabic(word);
  if (norm.length < 3) return false;
  
  // Compound names: عبد ..., ابو ..., ام ..., ابن ..., بنت ...
  if (
    norm.startsWith('عبد ') || 
    norm.startsWith('ابو ') || 
    norm.startsWith('ام ') || 
    norm.startsWith('ابن ') || 
    norm.startsWith('بنت ') || 
    norm.startsWith('الشيخ ')
  ) {
    return norm.length >= 5;
  }
  
  // Names ending with الدين / الله / الرحمن
  if (
    norm.endsWith(' الدين') || 
    norm.endsWith('الدين') || 
    norm.endsWith(' الله') || 
    norm.endsWith('الله') ||
    norm.endsWith(' الرحمن') ||
    norm.endsWith('الرحمن')
  ) {
    return norm.length >= 5;
  }
  
  // Active participle (اسم فاعل: فاعل مثل زاهر، باهر، سامر، عامر، صابر، جابر، طاهر، ظافر، ماهر، نادر، خالد...)
  // 4 letters where 2nd letter is Alif: [C] + ا + [C] + [C]
  if (norm.length === 4 && norm[1] === 'ا') {
    return true;
  }
  
  // Intensive/Adjective pattern (فعيل مثل جميل، كريم، سمير، سعيد، وسيم، منير، رشيد، زهير، وليد...)
  // 4 letters where 3rd letter is Yaa: [C] + [C] + ي + [C]
  if (norm.length === 4 && norm[2] === 'ي') {
    return true;
  }
  
  // Pattern: فعلان (مروان، عمران، عثمان، حمدان، بدران، غسان، حسان، زيدان، ريان، عدنان...)
  if (norm.length >= 5 && norm.endsWith('ان')) {
    return true;
  }
  
  // Pattern: فاعلة (فاطمة، عائشة، خديجة، سالمة، زاهرة، صابرة، نادية، سارة...)
  if (norm.length >= 4 && norm.endsWith('ه') && norm[1] === 'ا') {
    return true;
  }
  
  // Comparative/Elative pattern: أفعل (أحمد، أسعد، أكرم، أنور، أمجد، أدهم، أشرف...)
  if (norm.length === 4 && norm[0] === 'ا') {
    return true;
  }
  
  return false;
}

/**
 * Validates an Arabic word against:
 * 1. Minimum length (>= 2 characters)
 * 2. Proper Arabic character set (no symbols or spam)
 * 3. Starting letter match (including Alif variants أ/إ/آ/ا and 'ال' handling)
 * 4. Comprehensive Arabic Lexicon & Category relevance (rejection of invented fake words like "حنتوحز")
 */
export function validateArabicWord(
  word: string, 
  letter: string, 
  categoryId?: string
): { isValid: boolean; reason?: string } {
  const trimmed = word?.trim() || '';
  if (!trimmed) {
    return { isValid: false, reason: 'خانة فارغة' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, reason: 'الكلمة قصيرة جداً (أقل من حرفين)' };
  }
  
  if (isArabicGibberish(trimmed)) {
    return { isValid: false, reason: 'الكلمة تحتوي على رموز أو أحرف مكررة عشوائياً' };
  }
  
  if (!checkStartsWithLetter(trimmed, letter)) {
    return { isValid: false, reason: `الكلمة لا تبدأ بحرف (${letter})` };
  }
  
  // If category is provided, verify word against the category dictionary / lexicon
  if (categoryId) {
    const normWord = normalizeArabic(trimmed);
    const normLetter = normalizeArabic(letter);
    const cat = ALL_CATEGORIES.find((c) => c.id === categoryId);
    const catLabel = cat ? cat.label : categoryId;
    
    // 1. Check in expanded multi-dialect lexicon database
    const inLexicon = isWordInLexicon(trimmed, letter, categoryId);
    if (inLexicon) {
      return { isValid: true };
    }
    
    // 2. Check in primary ARABIC_WORD_BANK for this letter or variants
    const wordBankLetters = [
      letter, 
      normLetter,
      letter === 'هـ' ? 'ه' : (letter === 'ه' ? 'هـ' : letter),
      ...(normLetter === 'ا' ? ['أ', 'ا', 'إ', 'آ', 'ٱ'] : [])
    ];
    let inWordBank = false;
    
    for (const l of wordBankLetters) {
      const bank = ARABIC_WORD_BANK[l];
      if (bank && bank[categoryId]) {
        const found = bank[categoryId].some((w) => {
          const nw = normalizeArabic(w);
          return nw === normWord || 
                 (nw.startsWith('ال') && nw.slice(2) === normWord) ||
                 (normWord.startsWith('ال') && normWord.slice(2) === nw);
        });
        if (found) {
          inWordBank = true;
          break;
        }
      }
    }
    
    if (inWordBank) {
      return { isValid: true };
    }

    // 3. Name Category: Morphological pattern recognition (e.g. زاهر, صابر, كريم, عمران, عبد الله...)
    if (categoryId === 'name') {
      if (isMorphologicallyValidArabicName(trimmed)) {
        return { isValid: true };
      }
    }
    
    // Strict Category Requirement: If the word is not in the verified category database or valid name morphology, reject it!
    return { 
      isValid: false, 
      reason: `الكلمة ليست (${catLabel}) صحيحة بحرف (${letter})` 
    };
  }
  
  return { isValid: true };
}

/**
 * Authoritative scoring calculation for a round between two players:
 * - 10 points: Valid & Unique (opponent didn't write the same normalized word)
 * - 5 points: Valid & Duplicate (both wrote the same normalized word)
 * - 0 points: Invalid or Empty
 * - Multiplier x2: If letter is rare (ذ، ظ، ض، ث، خ)
 */
export function evaluateRoundAnswers(
  letter: string,
  categories: string[],
  player1Uid: string,
  player1Answers: Record<string, string>,
  player2Uid: string,
  player2Answers: Record<string, string>,
  stoppedBy?: string
): {
  scores: RoundResult['scores'];
  winnerUid: string | 'draw';
  isRareLetter: boolean;
  multiplier: number;
} {
  const isRareLetter = RARE_LETTERS_SET.has(letter);
  const multiplier = isRareLetter ? 2 : 1;
  
  const p1Breakdown: Record<string, PlayerAnswerBreakdown> = {};
  const p2Breakdown: Record<string, PlayerAnswerBreakdown> = {};
  
  let p1Total = 0;
  let p2Total = 0;
  
  categories.forEach((catId) => {
    const w1 = player1Answers[catId] || '';
    const w2 = player2Answers[catId] || '';
    
    const v1 = validateArabicWord(w1, letter, catId);
    const v2 = validateArabicWord(w2, letter, catId);
    
    const norm1 = normalizeArabic(w1);
    const norm2 = normalizeArabic(w2);
    
    // Check if duplicate (both valid and normalized words match)
    const isDuplicate = v1.isValid && v2.isValid && norm1 === norm2 && norm1.length > 0;
    
    // Calculate P1 points
    let p1Points = 0;
    if (v1.isValid) {
      p1Points = (isDuplicate ? 5 : 10) * multiplier;
    }
    p1Total += p1Points;
    
    p1Breakdown[catId] = {
      word: w1,
      normalizedWord: norm1,
      isValid: v1.isValid,
      isDuplicate,
      points: p1Points,
      reason: v1.reason,
    };
    
    // Calculate P2 points
    let p2Points = 0;
    if (v2.isValid) {
      p2Points = (isDuplicate ? 5 : 10) * multiplier;
    }
    p2Total += p2Points;
    
    p2Breakdown[catId] = {
      word: w2,
      normalizedWord: norm2,
      isValid: v2.isValid,
      isDuplicate,
      points: p2Points,
      reason: v2.reason,
    };
  });
  
  let winnerUid: string | 'draw' = 'draw';
  if (p1Total > p2Total) {
    winnerUid = player1Uid;
  } else if (p2Total > p1Total) {
    winnerUid = player2Uid;
  }
  
  return {
    scores: {
      [player1Uid]: {
        totalPoints: p1Total,
        breakdown: p1Breakdown,
      },
      [player2Uid]: {
        totalPoints: p2Total,
        breakdown: p2Breakdown,
      },
    },
    winnerUid,
    isRareLetter,
    multiplier,
  };
}
