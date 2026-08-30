import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Timer, 
  Hand, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Zap,
  ArrowRight,
  Home,
  LogOut,
  AlertTriangle,
  X,
  Lightbulb,
  Sparkles,
  Gem
} from 'lucide-react';
import { MatchData, UserProfile } from '../types';
import { ALL_CATEGORIES, RARE_LETTERS_SET } from '../data/categories';
import { validateArabicWord } from '../lib/arabicUtils';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { getCategoryHint } from '../lib/hints';
import { QuickChatWidget } from './QuickChatWidget';

interface GameViewProps {
  match: MatchData;
  currentUser: UserProfile;
  onUpdateAnswers: (answers: Record<string, string>, filledCount: number) => void;
  onTriggerStop: (finalAnswers: Record<string, string>) => void;
  onTimeExpired: (finalAnswers: Record<string, string>) => void;
  onSurrender: () => void;
  onGoHome?: () => void;
  onUseHintItem?: (categoryId: string) => Promise<boolean>;
  onSendChat?: (message: string, emoji?: string) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  match,
  currentUser,
  onUpdateAnswers,
  onTriggerStop,
  onTimeExpired,
  onSurrender,
  onGoHome,
  onUseHintItem,
  onSendChat,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [isStopTriggeredLocally, setIsStopTriggeredLocally] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [activeHintCategory, setActiveHintCategory] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickSecondRef = useRef<number>(45);

  const opponentId = match.players.find((p) => p !== currentUser.uid) || 'bot';
  const opponentDetails = match.playerDetails[opponentId] || {
    displayName: 'الخصم',
    photoURL: undefined,
    stars: 100,
    isBot: match.isBotMatch,
  };

  const opponentProgress = match.progress?.[opponentId] || 0;
  const isRare = RARE_LETTERS_SET.has(match.currentLetter);

  // Active categories list
  const activeCategories = ALL_CATEGORIES.filter((c) => match.categories.includes(c.id));
  const totalCategoriesCount = activeCategories.length;

  // Count filled valid-length answers
  const filledCount = Object.values(answers).filter((v) => typeof v === 'string' && v.trim().length > 0).length;
  const allFieldsFilled = filledCount === totalCategoriesCount;

  // Initialize empty answers when letter or round changes
  useEffect(() => {
    const initObj: Record<string, string> = {};
    activeCategories.forEach((c) => {
      initObj[c.id] = '';
    });
    setAnswers(initObj);
    setIsStopTriggeredLocally(false);
  }, [match.currentRound, match.currentLetter]);

  // Synchronized 45s countdown timer
  useEffect(() => {
    if (match.status !== 'playing' || !match.roundStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - match.roundStartTime!) / 1000);
      const remaining = Math.max(0, match.roundDurationSec - elapsed);

      setTimeLeft(remaining);

      // Play tick sound during the last 10 seconds
      if (remaining <= 10 && remaining > 0 && remaining !== lastTickSecondRef.current) {
        lastTickSecondRef.current = remaining;
        soundManager.playTick(true);
      }

      if (remaining <= 0) {
        clearInterval(interval);
        if (!isStopTriggeredLocally) {
          onTimeExpired(answers);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [match.roundStartTime, match.status, answers, isStopTriggeredLocally]);

  // Handle player typing in category input
  const handleInputChange = (categoryId: string, value: string) => {
    const updated = { ...answers, [categoryId]: value };
    setAnswers(updated);

    const newFilledCount = Object.values(updated).filter((v) => typeof v === 'string' && v.trim().length > 0).length;
    onUpdateAnswers(updated, newFilledCount);
  };

  // Handle using Hint power-up for a category
  const handleTriggerHint = async (categoryId: string) => {
    const availableHints = currentUser.hints || 0;
    const availableGems = currentUser.gems || 0;

    if (availableHints <= 0 && availableGems < 5) {
      soundManager.playError();
      haptics.error();
      return;
    }

    const hintData = getCategoryHint(match.currentLetter, categoryId);
    if (!hintData) return;

    soundManager.playSparkle();
    haptics.success();

    if (onUseHintItem) {
      await onUseHintItem(categoryId);
    }

    // Fill in the hint word
    handleInputChange(categoryId, hintData.hintWord);
  };

  // Handle clicking the STOP button
  const handlePressStop = () => {
    if (!allFieldsFilled || isStopTriggeredLocally) return;
    setIsStopTriggeredLocally(true);
    soundManager.playStopAlert();
    haptics.stopAlarm();
    onTriggerStop(answers);
  };

  const handleConfirmExit = () => {
    soundManager.playClick();
    setShowExitConfirm(false);
    if (onGoHome) {
      onGoHome();
    } else {
      onSurrender();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      
      {/* Quick Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-2xl">
        <button
          id="game-back-to-lobby-btn"
          onClick={() => {
            soundManager.playClick();
            setShowExitConfirm(true);
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-700 transition-all group"
        >
          <Home className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>القائمة الرئيسية</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center gap-3">
          {onSendChat && (
            <QuickChatWidget
              match={match}
              currentUser={currentUser}
              onSendChat={onSendChat}
              position="inline"
            />
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-slate-300">
              {match.isBotMatch ? 'تدريب مع الذكاء الاصطناعي' : 'مباراة مباشرة'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Match Bar: Letter, Timer, Round, Opponent progress */}
      <div 
        id="match-top-hud"
        className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          
          {/* Active Round & Letter Badge */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl font-black font-['Cairo'] text-white shadow-xl shadow-emerald-500/20">
              {match.currentLetter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  الجولة {match.currentRound} من 3
                </span>
                {isRare && (
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    حرف نادر (×2)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                اكتب كلمات تبدأ بحرف <strong className="text-white text-sm">({match.currentLetter})</strong>
              </p>
            </div>
          </div>

          {/* 45-Second Countdown Timer Circle */}
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all ${
              timeLeft <= 10 
                ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse shadow-lg shadow-rose-500/30' 
                : timeLeft <= 20
                ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                : 'bg-slate-800 border-emerald-500 text-emerald-400'
            }`}>
              <div className="text-center font-['Cairo']">
                <span className="text-xl font-black leading-none">{timeLeft}</span>
                <span className="text-[9px] block text-slate-400">ثانية</span>
              </div>
            </div>
          </div>

        </div>

        {/* Live Opponent Progress Bar & Status */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <img
              src={opponentDetails.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${opponentId}`}
              alt={opponentDetails.displayName}
              className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700"
            />
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200 block">
                {opponentDetails.displayName} {opponentDetails.isBot && '(روبوت)'}
              </span>
              <span className="text-[10px] text-slate-400">
                عبّأ {opponentProgress} من {totalCategoriesCount} خانات
              </span>
            </div>
          </div>

          {/* Opponent Progress Indicator */}
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>تقدم الخصم:</span>
              <span className="font-bold text-emerald-400">
                {Math.round((opponentProgress / totalCategoriesCount) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(opponentProgress / totalCategoriesCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Inputs Grid for Player Categories */}
      <div 
        id="player-inputs-table"
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-white font-['Cairo'] flex items-center gap-2">
            <span>خانـات الجدول الخاصة بك</span>
            <span className="text-xs text-slate-400 font-normal">
              (لا يرى الخصم ما تكتبه)
            </span>
          </h3>
          <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
            {filledCount} / {totalCategoriesCount} مكتملة
          </span>
        </div>

        <div className="space-y-3">
          {activeCategories.map((cat, idx) => {
            const val = answers[cat.id] || '';
            const validation = val ? validateArabicWord(val, match.currentLetter) : { isValid: false };

            return (
              <div
                key={cat.id}
                id={`field-container-${cat.id}`}
                className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  val && validation.isValid
                    ? 'bg-slate-800/80 border-emerald-500/40'
                    : val && !validation.isValid
                    ? 'bg-slate-800/80 border-rose-500/40'
                    : 'bg-slate-800/40 border-slate-700/60 focus-within:border-emerald-500/60'
                }`}
              >
                {/* Category Label */}
                <div className="flex items-center gap-3 w-full sm:w-48 text-right">
                  <div className="w-8 h-8 rounded-xl bg-slate-700/70 flex items-center justify-center text-xs font-bold text-slate-300 font-['Cairo']">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white font-['Cairo']">
                      {cat.label}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      يبدأ بحرف ({match.currentLetter})
                    </p>
                  </div>
                </div>

                {/* Input Field + Hint button */}
                <div className="relative w-full sm:flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id={`input-category-${cat.id}`}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder={cat.placeholder}
                      value={val}
                      onChange={(e) => handleInputChange(cat.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    {val && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {validation.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" title={validation.reason} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hint Power-up Button */}
                  {(!val || !validation.isValid) && (
                    <button
                      id={`hint-btn-${cat.id}`}
                      type="button"
                      onClick={() => handleTriggerHint(cat.id)}
                      className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 transition-colors active:scale-95 cursor-pointer"
                      title={
                        (currentUser.hints || 0) > 0 
                          ? `استخدام تلميح (متبقي لديك ${currentUser.hints})` 
                          : 'استخدام 5 جواهر لتلميح الكلمة'
                      }
                    >
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black hidden sm:inline">
                        {(currentUser.hints || 0) > 0 ? `${currentUser.hints}` : '5💎'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar: The Famous "STOP" (توقف) Button */}
      <div 
        id="game-action-footer"
        className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="text-right">
          <p className="text-xs font-bold text-slate-200">
            {allFieldsFilled 
              ? '✨ أحسنت! عبّأت جميع الخانات، اضغط على زر توقف لإيقاف العداد فورًا!' 
              : `تبقى لك ${totalCategoriesCount - filledCount} خانات لتفعيل زر توقف`}
          </p>
          <p className="text-[11px] text-slate-400">
            الضغط على "توقف" ينهي الجولة لكلا اللاعبين فورًا ويحسب النقاط.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Surrender / Leave button */}
          <button
            id="surrender-match-btn"
            onClick={onSurrender}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-colors"
            title="انسحاب من المباراة"
          >
            انسحاب
          </button>

          {/* STOP BUTTON */}
          <button
            id="trigger-stop-round-btn"
            disabled={!allFieldsFilled || isStopTriggeredLocally}
            onClick={handlePressStop}
            className={`flex-1 sm:flex-initial px-8 py-4 rounded-2xl font-black font-['Cairo'] text-base flex items-center justify-center gap-2 shadow-2xl transition-all ${
              !allFieldsFilled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/40 active:scale-95 animate-bounce'
            }`}
          >
            <Hand className="w-5 h-5" />
            <span>تـوقـف (STOP)!</span>
          </button>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div 
          id="exit-confirm-modal"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 font-['Cairo'] animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div>
              <h4 className="text-lg font-black text-white">العودة للقائمة الرئيسية؟</h4>
              <p className="text-xs text-slate-300 mt-1">
                المباراة جارية حالياً، العودة للرئيسية ستؤدي إلى الانسحاب وإنهاء الجولة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="cancel-exit-btn"
                onClick={() => {
                  soundManager.playClick();
                  setShowExitConfirm(false);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                متابعة اللعب
              </button>
              
              <button
                id="confirm-exit-btn"
                onClick={handleConfirmExit}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>نعم، عودة للرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
