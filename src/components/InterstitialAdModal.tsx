import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { soundManager } from '../lib/audio';

interface InterstitialAdModalProps {
  onClose: () => void;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({ onClose }) => {
  const [canSkip, setCanSkip] = useState(false);
  const [skipTimer, setSkipTimer] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setSkipTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      id="interstitial-ad-modal"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs text-slate-400">إعلان فاصل بين المباريات</span>
          
          <button
            id="skip-interstitial-ad-btn"
            disabled={!canSkip}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-['Cairo'] flex items-center gap-1 transition-all ${
              canSkip
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <span>{canSkip ? 'تخطي الإعلان ✕' : `تخطي بعد (${skipTimer})`}</span>
          </button>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-white font-['Cairo']">
            استمتع بلعبة "الجدول" بدون توقف
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            تحدَّ أصدقاءك في أي وقت واكسب النجوم مع كل فوز جديد!
          </p>
        </div>

        <button
          onClick={() => {
            if (canSkip) {
              soundManager.playClick();
              onClose();
            }
          }}
          disabled={!canSkip}
          className={`w-full py-3 rounded-xl font-black text-xs font-['Cairo'] transition-all ${
            canSkip 
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
              : 'bg-slate-850 text-slate-600'
          }`}
        >
          {canSkip ? 'متابعة اللعب' : `انتظر لحظات (${skipTimer})...`}
        </button>

      </div>
    </div>
  );
};
