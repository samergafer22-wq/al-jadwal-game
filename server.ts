import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { evaluateRoundAnswers, validateArabicWord, normalizeArabic } from './src/lib/arabicUtils.ts';
import { ALL_CATEGORIES, ARABIC_WORD_BANK } from './src/data/categories.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for PWA analysis tools and external crawlers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Direct assetlinks handler for Digital Asset Links verification (TWA / Android App)
  app.get('/.well-known/assetlinks.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json'));
  });

  // Direct manifest handler to guarantee correct headers for PWA tools and TWA
  const sendManifest = (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
  };

  app.get('/manifest.json', sendManifest);
  app.get('/manifest.webmanifest', sendManifest);
  app.get('/site.webmanifest', sendManifest);

  // Direct service worker handler
  app.get('/sw.js', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
  });

  app.use(express.static(path.join(process.cwd(), 'public')));

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Authoritative Round Score Calculation Endpoint
  app.post('/api/match/calculate-round', (req: Request, res: Response) => {
    try {
      const {
        letter,
        categories,
        player1Uid,
        player1Answers,
        player2Uid,
        player2Answers,
        stoppedBy
      } = req.body;

      if (!letter || !categories || !player1Uid || !player2Uid) {
        return res.status(400).json({ error: 'Missing required match parameters' });
      }

      const result = evaluateRoundAnswers(
        letter,
        categories,
        player1Uid,
        player1Answers || {},
        player2Uid,
        player2Answers || {},
        stoppedBy
      );

      return res.json({
        success: true,
        letter,
        isRareLetter: result.isRareLetter,
        multiplier: result.multiplier,
        scores: result.scores,
        winnerUid: result.winnerUid,
      });
    } catch (error: any) {
      console.error('Error calculating round:', error);
      return res.status(500).json({ error: 'Failed to calculate round score' });
    }
  });

  // Single Word Validation API
  app.post('/api/word/validate', (req: Request, res: Response) => {
    const { word, letter, categoryId } = req.body;
    if (!word || !letter) {
      return res.status(400).json({ error: 'Word and letter required' });
    }

    const validation = validateArabicWord(word, letter, categoryId);
    const normalized = normalizeArabic(word);

    // Also check if exists in word bank for smart validation hints
    const inBank = !!(ARABIC_WORD_BANK[letter]?.[categoryId]?.some(w => normalizeArabic(w) === normalized));

    return res.json({
      word,
      normalized,
      isValid: validation.isValid,
      reason: validation.reason,
      inDictionary: inBank,
    });
  });

  // Daily Rewarded Ad Verification & Star Grant (Max 3 / Day)
  app.post('/api/user/claim-daily-ad', (req: Request, res: Response) => {
    try {
      const { currentCount, lastRewardDate } = req.body;
      const today = new Date().toISOString().split('T')[0];

      let effectiveCount = currentCount || 0;
      if (lastRewardDate !== today) {
        effectiveCount = 0;
      }

      if (effectiveCount >= 3) {
        return res.status(400).json({
          error: 'تم استهلاك الحد اليومي لإعلانات المكافأة (3 إعلانات يومياً)',
          reachedLimit: true,
        });
      }

      const newCount = effectiveCount + 1;
      const starsEarned = 20;

      return res.json({
        success: true,
        starsEarned,
        rewardedAdsToday: newCount,
        lastRewardDate: today,
        remainingToday: 3 - newCount,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to process ad reward' });
    }
  });

  // Google Play Gems Purchase Simulation (Strict Separation: Real Money -> Gems Only)
  app.post('/api/shop/buy-gems', (req: Request, res: Response) => {
    try {
      const { packId, gemsAmount, priceUsd } = req.body;
      if (!packId || !gemsAmount) {
        return res.status(400).json({ error: 'Invalid pack selection' });
      }

      // Authoritative Play Billing receipt simulation
      return res.json({
        success: true,
        transactionId: `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Date.now()}`,
        gemsAdded: Number(gemsAmount),
        price: priceUsd,
        timestamp: Date.now(),
        message: `تم شراء ${gemsAmount} جوهرة بنجاح عبر Google Play Billing`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Billing error' });
    }
  });

  // Unlock Extra Category with Gems
  app.post('/api/shop/unlock-category', (req: Request, res: Response) => {
    try {
      const { categoryId, currentGems } = req.body;
      const category = ALL_CATEGORIES.find((c) => c.id === categoryId);

      if (!category) {
        return res.status(404).json({ error: 'الفئة غير موجودة' });
      }

      const price = category.gemPrice || 50;
      if (currentGems < price) {
        return res.status(400).json({
          error: `رصيد الجواهر غير كافٍ. تحتاج إلى ${price} جوهرة، ورصيدك الحالي ${currentGems}`,
        });
      }

      return res.json({
        success: true,
        categoryId,
        gemsDeducted: price,
        remainingGems: currentGems - price,
        message: `تم فتح فئة (${category.label}) بنجاح!`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to unlock category' });
    }
  });

  // Bot Auto-Play Generator (Produces realistic Arabic answers and natural typing delays)
  app.post('/api/bot/generate-answers', (req: Request, res: Response) => {
    const { letter, categories, difficulty } = req.body;
    if (!letter || !categories) {
      return res.status(400).json({ error: 'Letter and categories required' });
    }

    const answers: Record<string, string> = {};
    const bankForLetter = ARABIC_WORD_BANK[letter] || {};

    categories.forEach((catId: string) => {
      const words = bankForLetter[catId];
      if (words && words.length > 0) {
        // Chance of leaving empty based on difficulty (90% fill rate for normal)
        const willFill = Math.random() > 0.1;
        if (willFill) {
          const randIdx = Math.floor(Math.random() * words.length);
          answers[catId] = words[randIdx];
        } else {
          answers[catId] = '';
        }
      } else {
        // Fallback prefix word
        answers[catId] = `${letter}ـكلمة`;
      }
    });

    return res.json({
      success: true,
      answers,
    });
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
