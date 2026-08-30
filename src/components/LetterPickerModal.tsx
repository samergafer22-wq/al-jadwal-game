import React, { useState, useEffect } from 'react';
import { Sparkles, Dices, Flame, Check, Loader2, Home } from 'lucide-react';
import { ARABIC_LETTERS, RARE_LETTERS_SET } from '../data/categories';
import { soundManager } from '../lib/audio';

interface LetterPickerModalProps {
  roundNumber: number;
  isMyTurn: boolean;
  pickerName: string;
  onLetterSelected: (letter: string) => void;
  onGoHome?: () => void;
}

export const LetterPickerModal: React.FC<LetterPickerModalProps> = ({
  roundNumber,
  isMyTurn,
  pickerName,
  onLetterSelected,
  onGoHome,
}) => {
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spunChar, setSpunChar] = useState<string>('أ');

  // Random spin animation
  const handleRandomSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundManager.playClick();

    let counter = 0;
    const totalSteps = 25;
    const interval = setInterval(() => {
      counter++;
      const randIdx = Math.floor(Math.random() * ARABIC_LETTERS.length);
      const current = ARABIC_LETTERS[randIdx].char;
      setSpunChar(current);
      soundManager.playSpinTick();

      if (counter >= totalSteps) {
        clearInterval(interval);
        setIsSpinning(false);
        setSelectedChar(current);
      }
    }, 80);
  };

  const handleConfirm = () => {
    if (!selectedChar) return;
    soundManager.playClick();
    onLetterSelected(selectedChar);
  };

  const isRare = selectedChar ? RARE_LETTERS_SET.has(selectedChar) : false;

  return (
    <div 
      id="letter-picker-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative">
          {onGoHome && (
            <button
              id="letter-picker-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onGoHome();
              }}
              className="absolute left-0 top-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold font-['Cairo'] transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30 mb-2">
            <span>الجولة {roundNumber} من 3</span>
          </div>
          <h2 className="text-2xl font-black text-white font-['Cairo']">
            {isMyTurn ? 'دورك في اختيار حرف الجولة' : `ينتظر اختيار الحرف من (${pickerName})`}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isMyTurn 
              ? 'اختر حرفًا أو اضغط على التدوير العشوائي، وتذكر أن الحروف النادرة تضاعف النقاط ×2!' 
              : 'اللاعب المنافس يختار الحرف الآن، استعد بسرعة للكتابة!'}
          </p>
        </div>

        {/* If Not My Turn */}
        {!isMyTurn ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-sm font-bold text-slate-300 font-['Cairo']">
              جاري اختيار الحرف...
            </p>
          </div>
        ) : (
          /* Letter Picker Controls */
          <div className="space-y-6">
            
            {/* Random Spin Widget */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl font-black font-['Cairo'] text-white shadow-lg shadow-emerald-600/30">
                  {isSpinning ? spunChar : selectedChar || '؟'}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">الحرف المحدد:</p>
                  <p className="text-lg font-bold text-white font-['Cairo']">
                    {selectedChar ? `حرف (${selectedChar})` : 'لم يتم الاختيار بعد'}
                  </p>
                  {isRare && (
                    <span className="text-[11px] font-black text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      حرف نادر — مضاعفة النقاط (×2)!
                    </span>
                  )}
                </div>
              </div>

              <button
                id="spin-random-letter-btn"
                disabled={isSpinning}
                onClick={handleRandomSpin}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs font-['Cairo'] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Dices className="w-4 h-4" />
                <span>{isSpinning ? 'جاري التدوير...' : 'تدوير عشوائي'}</span>
              </button>
            </div>

            {/* Arabic Alphabet Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>أو اختر الحرف يدويًا من القائمة:</span>
                <span className="text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                  <Flame className="w-3 h-3" /> الحروف بالذهبي نادرة (×2)
                </span>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-2xl border border-slate-800">
                {ARABIC_LETTERS.map((item) => {
                  const isSelected = selectedChar === item.char;
                  return (
                    <button
                      key={item.char}
                      id={`select-letter-${item.char}`}
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedChar(item.char);
                      }}
                      className={`h-11 rounded-xl font-bold font-['Cairo'] text-base transition-all flex flex-col items-center justify-center relative ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105 z-10'
                          : item.isRare
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <span>{item.char}</span>
                      {item.isRare && (
                        <span className="text-[8px] leading-none text-amber-400 font-extrabold">
                          ×2
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm Start Round Button */}
            <button
              id="confirm-letter-start-btn"
              disabled={!selectedChar || isSpinning}
              onClick={handleConfirm}
              className={`w-full py-4 rounded-2xl font-black text-base font-['Cairo'] flex items-center justify-center gap-2 shadow-xl transition-all ${
                !selectedChar
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 active:scale-98 animate-pulse'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>بدء الجولة بالحرف ({selectedChar || '...'}) وتفعيل عداد الـ45 ثانية!</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
