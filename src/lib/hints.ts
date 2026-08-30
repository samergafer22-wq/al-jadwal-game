import { ARABIC_WORD_BANK } from '../data/categories';
import { normalizeArabic } from './arabicUtils';

/**
 * Gets a verified hint for a category and letter
 */
export function getCategoryHint(letter: string, categoryId: string): { hintWord: string; prefixHint: string } | null {
  const normLetter = normalizeArabic(letter);
  const possibleLetters = [
    letter,
    normLetter,
    letter === 'هـ' ? 'ه' : (letter === 'ه' ? 'هـ' : letter),
    ...(normLetter === 'ا' ? ['أ', 'ا', 'إ', 'آ'] : [])
  ];

  for (const l of possibleLetters) {
    const letterObj = ARABIC_WORD_BANK[l];
    if (letterObj) {
      // Direct category or fallback
      const words = (letterObj as any)[categoryId] || (letterObj as any)[categoryId.replace(/s$/, '')];
      if (Array.isArray(words) && words.length > 0) {
        // Pick a random word from the verified list
        const randomWord = words[Math.floor(Math.random() * words.length)];
        const cleanWord = randomWord.trim();
        
        // Prefix hint: first 2 characters or first letter + "..."
        const prefix = cleanWord.length > 2 
          ? cleanWord.substring(0, 2) + '...' 
          : cleanWord.substring(0, 1) + '...';

        return {
          hintWord: cleanWord,
          prefixHint: prefix,
        };
      }
    }
  }

  return null;
}
