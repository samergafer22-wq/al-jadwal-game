import React, { useState, useEffect } from 'react';
import { Tv, Sparkles, CheckCircle2, X, Star, Clock } from 'lucide-react';
import { soundManager } from '../lib/audio';

interface RewardedAdModalProps {
  onClose: () => void;
  onClaimReward: () => Promise<void>;
  currentCount: number;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  onClose,
  onClaimReward,
  currentCount,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClaim(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    setIsClaiming(true);
    soundManager.playVictory();
    await onClaimReward();
    setIsClaiming(false);
    onClose();
  };

  return (
    <div 
      id="rewarded-ad-modal"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header / Ad Label */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">
              إعلان مكافأة برعاية الجدول
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
              {currentCount + 1}/3 اليوم
            </span>
            {canClaim && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Simulated Ad Video Creative Screen */}
        <div className="bg-gradient-to-tr from-indigo-950 via-slate-900 to-emerald-950 rounded-2xl p-6 border border-slate-700 relative flex flex-col items-center justify-center min-h-[190px] shadow-inner">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 shadow-lg border border-emerald-500/30 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h4 className="text-base font-black text-white font-['Cairo']">
            تطبيق "الجدول" للكلمات العربية
          </h4>
          <p className="text-xs text-slate-300 max-w-xs mt-1">
            أكبر تجمع لعشاق ألعاب الكلمات والذكاء العربي التنافسي!
          </p>

          {/* Countdown Pill on Video */}
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1 text-[11px] font-bold text-amber-400">
            <Clock className="w-3 h-3" />
            <span>{countdown > 0 ? `مكافأة خلال ${countdown} ثانية` : 'المكافأة جاهزة!'}</span>
          </div>
        </div>

        {/* Claim Reward Button */}
        <div className="space-y-2">
          <button
            id="claim-ad-stars-btn"
            disabled={!canClaim || isClaiming}
            onClick={handleClaim}
            className={`w-full py-4 rounded-2xl font-black text-base font-['Cairo'] flex items-center justify-center gap-2 shadow-xl transition-all ${
              !canClaim
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/30 active:scale-98 animate-bounce'
            }`}
          >
            <Star className="w-5 h-5 fill-slate-950" />
            <span>
              {canClaim
                ? 'استلام المكافأة (+20 ⭐ نجوم تحدي)!'
                : `انتظر ${countdown} ثوانٍ لاستلام النجوم...`}
            </span>
          </button>

          <p className="text-[11px] text-slate-400">
            تُضاف النجوم لرصيدك فورًا ويمكن استخدامها في مراهنات المباريات.
          </p>
        </div>

      </div>
    </div>
  );
};
