import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Dices, 
  Sparkles, 
  Flame, 
  Timer, 
  Home, 
  CheckCircle2, 
  RotateCw,
  ShieldCheck,
  Lock,
  Hourglass
} from 'lucide-react';
import { UserProfile, LuckySpinReward } from '../types';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { triggerConfetti } from '../lib/celebration';
import { 
  OFFICIAL_WHEEL_SEGMENTS, 
  WheelSegmentDef, 
  checkSpinEligibility, 
  sanitizeAndValidateSpinReward,
  pickRandomWinningSegmentIndex
} from '../lib/luckySpin';

interface DailyLuckySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onRewardGranted: (reward: LuckySpinReward) => Promise<void>;
}

export const DailyLuckySpinModal: React.FC<DailyLuckySpinModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onRewardGranted,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonSegment, setWonSegment] = useState<WheelSegmentDef | null>(null);
  const [eligibility, setEligibility] = useState(() => checkSpinEligibility(userProfile));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSpinningLockRef = useRef<boolean>(false);

  // Live real-time ticking countdown every second
  useEffect(() => {
    if (!isOpen) return;

    // Initial check
    setEligibility(checkSpinEligibility(userProfile));

    const interval = setInterval(() => {
      setEligibility(checkSpinEligibility(userProfile));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, userProfile]);

  // Draw the high-fidelity Wheel on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = size / 2 - 10;
    const numSegments = OFFICIAL_WHEEL_SEGMENTS.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, size, size);

    // Outer Gold Rim with Metallic Finish
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#0b0f19';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Slices
    OFFICIAL_WHEEL_SEGMENTS.forEach((segment, i) => {
      const startAngle = i * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      // Label & Icon inside slice
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = segment.textColor;
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(segment.label, radius - 20, 5);

      // Icon Representation
      ctx.font = '15px sans-serif';
      const iconSymbol = segment.type === 'gems' ? '💎' : segment.type === 'hints' ? '💡' : '⭐';
      ctx.fillText(iconSymbol, radius - 88, 5);

      ctx.restore();
    });

    // Center Hub / Cap
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', center, center);
  }, []);

  if (!isOpen) return null;

  const streak = userProfile?.luckySpinStreak || 1;

  // Security hardened spin trigger
  const handleStartSpin = async () => {
    // 1. Anti-cheat & Atomic Lock check
    if (isSpinning || isSpinningLockRef.current) return;
    
    // Re-verify eligibility instantly against real timestamp
    const currentStatus = checkSpinEligibility(userProfile);
    if (!currentStatus.canSpin) {
      soundManager.playError();
      haptics.error();
      return;
    }

    // Lock spin to prevent race conditions or double clicks
    isSpinningLockRef.current = true;
    setIsSpinning(true);
    setWonSegment(null);

    soundManager.playClick();
    haptics.tap();

    // 2. Select winning segment mathematically on client & validate
    const winningIndex = pickRandomWinningSegmentIndex();
    const targetSegment = OFFICIAL_WHEEL_SEGMENTS[winningIndex];

    // 3. Rotation calculation (pointer at top 270 degrees)
    const segmentAngle = 360 / OFFICIAL_WHEEL_SEGMENTS.length;
    const sliceCenterAngle = winningIndex * segmentAngle + segmentAngle / 2;
    const targetAngle = 270 - sliceCenterAngle;
    
    // Add 6 full rotations (2160 degrees) for smooth suspense
    const extraSpins = 360 * 6;
    const finalDegrees = rotationDegrees + extraSpins + ((targetAngle - (rotationDegrees % 360) + 360) % 360);

    setRotationDegrees(finalDegrees);

    // Audio & Haptic tick simulation during wheel rotation
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      soundManager.playTick();
      haptics.tick();
      tickCount++;
      if (tickCount > 24) {
        clearInterval(tickInterval);
      }
    }, 160);

    // 4. Resolve spin after animation
    setTimeout(async () => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      isSpinningLockRef.current = false;
      setWonSegment(targetSegment);

      soundManager.playVictory();
      haptics.victory();
      triggerConfetti();

      // Secure payload creation & execution
      try {
        const sanitizedReward = sanitizeAndValidateSpinReward(targetSegment.id);
        await onRewardGranted(sanitizedReward);
        // Refresh local status
        setEligibility(checkSpinEligibility({
          ...userProfile!,
          lastLuckySpinTime: Date.now(),
          lastLuckySpinDate: new Date().toISOString().split('T')[0],
        }));
      } catch (err) {
        console.error('Failed to grant spin reward:', err);
      }
    }, 4200);
  };

  return (
    <div 
      id="daily-lucky-spin-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden font-['Cairo'] animate-in fade-in zoom-in-95 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              id="lucky-spin-go-home-btn"
              onClick={() => {
                if (isSpinning) return;
                soundManager.playClick();
                onClose();
              }}
              disabled={isSpinning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-colors disabled:opacity-40"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-lucky-spin-btn"
              onClick={() => {
                if (isSpinning) return;
                soundManager.playClick();
                onClose();
              }}
              disabled={isSpinning}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1.5 justify-end">
                <span>عجلة الحظ اليومية</span>
                <Dices className="w-5 h-5 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>مرة واحدة كل 24 ساعة بدقة</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 text-center">
          
          {/* Daily Streak Indicator */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-black">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>تتابع الحظ: اليوم {streak} من 7</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border transition-all ${
                    day <= streak
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold scale-105'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Wheel Container with Pointer */}
          <div className="relative w-[280px] h-[280px] sm:w-[310px] sm:h-[310px] mx-auto flex items-center justify-center my-2">
            
            {/* Top Pointer Indicator */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 w-8 h-8 flex items-center justify-center filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400" />
            </div>

            {/* Rotating Wheel Canvas */}
            <div 
              className="w-full h-full rounded-full transition-transform duration-[4000ms] cubic-bezier(0.15, 0.9, 0.25, 1.0)"
              style={{ transform: `rotate(${rotationDegrees}deg)` }}
            >
              <canvas 
                ref={canvasRef} 
                className="w-full h-full rounded-full shadow-2xl border-4 border-slate-950"
              />
            </div>
          </div>

          {/* Reward Winner Alert */}
          {wonSegment && (
            <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-indigo-500/20 border-2 border-amber-500/50 rounded-2xl p-3.5 animate-in zoom-in-95">
              <h4 className="text-sm font-black text-amber-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>مبروك! ربحت {wonSegment.label}</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                تمت إضافة الجائزة إلى رصيد حسابك بأمان 🎉
              </p>
            </div>
          )}

          {/* Cooldown Timer Card (When unavailable) */}
          {!eligibility.canSpin && !isSpinning && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>اللفة المجانية القادمة تفتح بعد:</span>
              </div>

              {/* Exact Live Countdown Display */}
              <div className="flex items-center justify-center gap-2 text-2xl font-black font-mono text-amber-300 bg-slate-900/90 py-2 px-4 rounded-xl border border-amber-500/30 shadow-inner">
                <Hourglass className="w-5 h-5 text-amber-400 animate-spin" />
                <span dir="ltr">{eligibility.formattedCountdown}</span>
              </div>

              {/* 24-hour Cooldown Progress Bar */}
              <div className="space-y-1">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-1000"
                    style={{ width: `${eligibility.progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>تم التدوير</span>
                  <span>{eligibility.progressPercentage}% من 24 ساعة</span>
                  <span>اكتمال التبريد</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                ⚖️ نظام الحماية مفعل: لفة واحدة لكل لاعب كل 24 ساعة لضمان عدالة اللعبة.
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            {eligibility.canSpin ? (
              <button
                id="spin-wheel-free-btn"
                disabled={isSpinning}
                onClick={handleStartSpin}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'جاري تدوير العجلة...' : 'تدوير العجلة الآن 🎁'}</span>
              </button>
            ) : (
              <button
                id="spin-wheel-locked-btn"
                disabled
                className="w-full py-3 px-5 rounded-2xl bg-slate-800 text-slate-500 font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                <span>مقفلة (انتظر انتهاء عداد الـ 24 ساعة)</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
