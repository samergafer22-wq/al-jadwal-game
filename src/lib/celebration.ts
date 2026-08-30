import confetti from 'canvas-confetti';

/**
 * Fires a vibrant celebratory star & confetti burst when a player wins a round.
 */
export function fireRoundWinConfetti() {
  const count = 75;
  const defaults = {
    origin: { y: 0.65 },
    zIndex: 99999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Multi-layered celebratory burst: emerald, gold, turquoise, purple
  fire(0.25, {
    spread: 30,
    startVelocity: 55,
    colors: ['#10b981', '#fbbf24', '#38bdf8', '#a855f7'],
  });

  fire(0.2, {
    spread: 65,
    colors: ['#34d399', '#f59e0b', '#60a5fa'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.9,
    colors: ['#4ade80', '#eab308', '#22d3ee', '#f43f5e'],
  });

  fire(0.1, {
    spread: 130,
    startVelocity: 30,
    decay: 0.92,
    scalar: 1.3,
    shapes: ['star'],
    colors: ['#fbbf24', '#f59e0b', '#fef08a'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#10b981', '#06b6d4'],
  });
}

/**
 * Fires a grand, multi-cannon continuous fireworks celebration for the final match winner.
 */
export function fireGrandMatchVictoryConfetti() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: 99999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // Initial center blast
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#10b981', '#fbbf24', '#38bdf8', '#ec4899', '#8b5cf6', '#f59e0b'],
    zIndex: 99999,
  });

  // Left & right side cannons loop
  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Left cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#ffd700'],
      shapes: ['circle', 'star'],
    });

    // Right cannon
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#38bdf8', '#818cf8', '#fbbf24', '#f43f5e', '#ec4899'],
      shapes: ['circle', 'star'],
    });
  }, 220);
}

/**
 * Fires a spectacular magical chest opening confetti fanfare with golden stars, gems, coins, and sparkles.
 */
export function fireChestOpeningConfetti(chestTier: 'bronze' | 'silver' | 'gold' = 'silver') {
  const colors = chestTier === 'gold' 
    ? ['#fbbf24', '#f59e0b', '#ffd700', '#fef08a', '#ec4899', '#38bdf8']
    : chestTier === 'silver'
    ? ['#38bdf8', '#60a5fa', '#93c5fd', '#fbbf24', '#10b981']
    : ['#f97316', '#fb923c', '#fbbf24', '#10b981'];

  // Explosive starburst
  confetti({
    particleCount: chestTier === 'gold' ? 140 : 90,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.55 },
    colors,
    shapes: ['star', 'circle'],
    scalar: 1.2,
    zIndex: 99999,
  });

  // Secondary shower for high tiers
  if (chestTier === 'gold' || chestTier === 'silver') {
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 65,
        origin: { x: 0.2, y: 0.65 },
        colors: ['#fbbf24', '#10b981', '#06b6d4'],
        zIndex: 99999,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 65,
        origin: { x: 0.8, y: 0.65 },
        colors: ['#38bdf8', '#a855f7', '#fbbf24'],
        zIndex: 99999,
      });
    }, 200);
  }
}

/**
 * Fires a pleasant star burst for claiming task / quest rewards.
 */
export function triggerSmallRewardConfetti() {
  confetti({
    particleCount: 40,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8'],
    shapes: ['star', 'circle'],
    zIndex: 99999,
  });
}

export const triggerVictoryConfetti = fireGrandMatchVictoryConfetti;
export const triggerConfetti = fireRoundWinConfetti;

