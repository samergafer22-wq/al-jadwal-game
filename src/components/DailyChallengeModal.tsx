import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trophy, 
  Sparkles, 
  Clock, 
  Send, 
  Check, 
  HelpCircle, 
  Users, 
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award,
  Crown,
  Medal,
  Zap,
  Target,
  Gift,
  ArrowRight
} from 'lucide-react';
import { 
  UserProfile, 
  WeeklyTournamentConfig,
  WeeklyChallengeSubmission,
  LetterRoundSubmission,
  WeeklyLetterChallenge
} from '../types';
import { 
  getWeeklyTournamentConfig, 
  evaluateLetterRound, 
  compileWeeklySubmission,
  submitWeeklyChallenge, 
  fetchUserWeeklySubmission, 
  fetchWeeklyLeaderboard,
  WEEKLY_PODIUM_PRIZES,
  getWeekKey
} from '../lib/dailyChallenge';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { getCategoryHint } from '../lib/hints';
import { fireGrandMatchVictoryConfetti } from '../lib/celebration';

interface DailyChallengeModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onRewardStars?: (amount: number) => Promise<void> | void;
  onRewardGems?: (amount: number) => Promise<void> | void;
  onDailyChallengeCompleted?: () => void;
  onOpenAuth?: () => void;
}

type ModalTab = 'overview' | 'playing' | 'round_summary' | 'tournament_result' | 'leaderboard' | 'prizes_info';

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  currentUser,
  onClose,
  onRewardStars,
  onRewardGems,
  onDailyChallengeCompleted,
  onOpenAuth,
}) => {
  const weekKey = getWeekKey();
  const [tournamentConfig, setTournamentConfig] = useState<WeeklyTournamentConfig>(() => getWeeklyTournamentConfig(weekKey));
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  
  // Tournament Progress State
  const [currentLetterIndex, setCurrentLetterIndex] = useState<number>(0);
  const [roundResults, setRoundResults] = useState<LetterRoundSubmission[]>([]);
  const [currentRoundAnswers, setCurrentRoundAnswers] = useState<Record<string, string>>({});
  
  // Timer per letter (45s default)
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  
  // Existing submission & Leaderboard
  const [existingSubmission, setExistingSubmission] = useState<WeeklyChallengeSubmission | null>(null);
  const [finalSubmission, setFinalSubmission] = useState<WeeklyChallengeSubmission | null>(null);
  const [leaderboard, setLeaderboard] = useState<WeeklyChallengeSubmission[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasClaimedWeeklyBonus, setHasClaimedWeeklyBonus] = useState(false);

  // Active inputs focus tracking
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLetterChallenge: WeeklyLetterChallenge = tournamentConfig.letters[currentLetterIndex] || tournamentConfig.letters[0];

  // 1. Initial Load: Check if player already completed this week's tournament
  useEffect(() => {
    async function initCheck() {
      if (currentUser?.uid) {
        const sub = await fetchUserWeeklySubmission(weekKey, currentUser.uid);
        if (sub) {
          setExistingSubmission(sub);
          setFinalSubmission(sub);
          setRoundResults(sub.roundResults || []);
        }
      }
      loadWeeklyLeaderboard();
    }
    initCheck();
  }, [currentUser?.uid, weekKey]);

  // 2. Timer Loop during active round
  useEffect(() => {
    if (activeTab === 'playing') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as NodeJS.Timeout);
            handleAutoSubmitLetterRound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTab, currentLetterIndex]);

  // Load Leaderboard
  const loadWeeklyLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const list = await fetchWeeklyLeaderboard(weekKey, 30);
      setLeaderboard(list);
    } catch (e) {
      console.warn('Error loading weekly leaderboard:', e);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Start Tournament
  const handleStartTournament = () => {
    soundManager.playClick();
    setCurrentLetterIndex(0);
    setRoundResults([]);
    setCurrentRoundAnswers({});
    setTimeLeft(tournamentConfig.timeLimitPerLetter);
    setRoundStartTime(Date.now());
    setActiveTab('playing');
  };

  // Handle Input Changes
  const handleAnswerChange = (categoryId: string, val: string) => {
    setCurrentRoundAnswers((prev) => ({
      ...prev,
      [categoryId]: val,
    }));
  };

  // Fill in Smart Hint
  const handleUseHint = (categoryId: string) => {
    if ((currentUser?.hints ?? 0) <= 0) {
      alert('ليس لديك تلميحات كافية حالياً!');
      return;
    }
    const hintRes = getCategoryHint(currentLetterChallenge.letter, categoryId);
    if (hintRes) {
      soundManager.playClick();
      haptics.tap();
      setCurrentRoundAnswers((prev) => ({
        ...prev,
        [categoryId]: hintRes.hintWord,
      }));
    }
  };

  // Auto Submit when letter timer reaches 0
  const handleAutoSubmitLetterRound = () => {
    finalizeCurrentLetterRound();
  };

  // Process & Evaluate current letter round
  const finalizeCurrentLetterRound = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    soundManager.playClick();
    haptics.tap();

    const timeSpent = Math.min(
      tournamentConfig.timeLimitPerLetter,
      Math.max(1, Math.round((Date.now() - roundStartTime) / 1000))
    );

    const evaluated = evaluateLetterRound(currentLetterChallenge, currentRoundAnswers, timeSpent);
    const updatedRoundResults = [...roundResults, evaluated];
    setRoundResults(updatedRoundResults);

    if (evaluated.isPerfect) {
      soundManager.playVictory();
      fireGrandMatchVictoryConfetti();
    }

    const nextIdx = currentLetterIndex + 1;

    // Check if this was the final (12th) letter
    if (nextIdx >= tournamentConfig.totalLettersCount) {
      // Tournament Complete! Compile and save
      await handleCompleteTournament(updatedRoundResults);
    } else {
      // Move to next letter
      setCurrentLetterIndex(nextIdx);
      setCurrentRoundAnswers({});
      setTimeLeft(tournamentConfig.timeLimitPerLetter);
      setRoundStartTime(Date.now());
      setIsSubmitting(false);
      haptics.tap();
    }
  };

  // Finish and compile 12-Letter Tournament
  const handleCompleteTournament = async (allRounds: LetterRoundSubmission[]) => {
    const submission = compileWeeklySubmission(
      currentUser?.uid || 'guest_user',
      currentUser?.displayName || 'لاعب الجدول',
      currentUser?.photoURL,
      weekKey,
      allRounds
    );

    setFinalSubmission(submission);
    setExistingSubmission(submission);
    setActiveTab('tournament_result');
    setIsSubmitting(false);

    soundManager.playVictory();
    fireGrandMatchVictoryConfetti();

    // Reward stars and trigger task progress
    if (onRewardStars && !hasClaimedWeeklyBonus) {
      await onRewardStars(50);
      setHasClaimedWeeklyBonus(true);
    }
    if (onRewardGems) {
      await onRewardGems(10);
    }
    if (onDailyChallengeCompleted) {
      onDailyChallengeCompleted();
    }

    // Persist to Firestore
    if (currentUser?.uid) {
      await submitWeeklyChallenge(submission);
      loadWeeklyLeaderboard();
    }
  };

  const filledCount = Object.values(currentRoundAnswers).filter((v) => (v ? String(v).trim().length > 0 : false)).length;
  const isAllFilled = filledCount === currentLetterChallenge.categories.length;

  return (
    <div 
      id="daily-challenge-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div 
        id="daily-challenge-modal-container"
        className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 text-white shadow-2xl shadow-amber-500/10 overflow-hidden my-auto"
      >
        {/* Background decorative luxury accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-xl">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  تحدي الأسبوع • 12 حرفاً
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {tournamentConfig.weekKey}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-['Cairo']">
                بطولة الأسبوع الكبرى (12 حرفاً) 🌟
              </h2>
            </div>
          </div>

          <button
            id="close-daily-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Overview / Leaderboard / Prizes) */}
        {activeTab !== 'playing' && (
          <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-800/60 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab(existingSubmission ? 'tournament_result' : 'overview')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs font-['Cairo'] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'overview' || activeTab === 'tournament_result'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{existingSubmission ? 'نتائج بطولتي' : 'خوض التحدي (12 حرفاً)'}</span>
            </button>

            <button
              id="tab-weekly-leaderboard-btn"
              onClick={() => {
                setActiveTab('leaderboard');
                loadWeeklyLeaderboard();
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs font-['Cairo'] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>لوحة الصدارة ومنصة التتويج 👑</span>
            </button>

            <button
              id="tab-prizes-info-btn"
              onClick={() => setActiveTab('prizes_info')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs font-['Cairo'] transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'prizes_info'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>جوائز المراكز الـ 3 🎁</span>
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW / WELCOME */}
        {activeTab === 'overview' && (
          <div className="space-y-4 pt-4 relative z-10 text-right">
            {/* Grand Banner */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 p-5 rounded-3xl border border-amber-500/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-amber-400 block font-['Cairo']">
                    🏆 تنافس أسبوعي ملحمي
                  </span>
                  <h3 className="text-xl font-black text-white font-['Cairo'] mt-0.5">
                    خُض 12 حرفاً متتالياً واعتلِ منصة التتويج!
                  </h3>
                </div>
                <div className="text-3xl">✨</div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                ستخوض 12 حرفاً عربياً متتالياً (45 ثانية لكل حرف). تحتسب نقاطك وفقاً لـ:
                <strong className="text-emerald-400"> دقة وصحة الكلمات</strong>، 
                <strong className="text-amber-400"> سرعة توفير الوقت والضغط على STOP</strong>، 
                و<strong className="text-yellow-300"> مضاعفات الحروف الذهبية (×2)</strong>.
              </p>

              {/* 12 Letters Preview Strip */}
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 font-bold block mb-1.5">
                  حروف بطولة هذا الأسبوع (12 حرفاً):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tournamentConfig.letters.map((lc, i) => (
                    <div 
                      key={i}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-['Cairo'] border ${
                        lc.isRareLetter
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                      title={lc.isRareLetter ? `حرف ذهبي (${lc.letterName}) - مضاعف ×2` : lc.letterName}
                    >
                      {lc.letter}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 3 Prizes Summary Pill */}
            <div className="grid grid-cols-3 gap-2">
              {WEEKLY_PODIUM_PRIZES.map((prize) => (
                <div 
                  key={prize.rank} 
                  className={`p-3 rounded-2xl border text-center ${
                    prize.rank === 1 
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                      : prize.rank === 2 
                      ? 'bg-slate-800/60 border-slate-600 text-slate-300' 
                      : 'bg-amber-950/20 border-amber-700/40 text-amber-400'
                  }`}
                >
                  <span className="text-lg block mb-0.5">{prize.icon}</span>
                  <span className="text-[10px] text-slate-400 block font-bold">المركز {prize.rank}</span>
                  <span className="text-xs font-black block font-['Cairo']">+{prize.stars} ⭐</span>
                  <span className="text-[10px] text-cyan-300 block">+{prize.gems} 💎</span>
                </div>
              ))}
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                id="start-weekly-tournament-btn"
                onClick={handleStartTournament}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base font-['Cairo'] shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 ring-2 ring-amber-400/50"
              >
                <Sparkles className="w-5 h-5 fill-slate-950" />
                <span>بدء بطولة الـ 12 حرفاً الآن 🚀</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE GAMEPLAY (12-LETTER TOURNAMENT) */}
        {activeTab === 'playing' && (
          <div className="space-y-4 pt-3 relative z-10">
            {/* Letter Progress Header (1 to 12) */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 font-['Cairo']">
                  الحرف <strong className="text-white text-sm">{currentLetterIndex + 1}</strong> من <strong className="text-amber-400">{tournamentConfig.totalLettersCount}</strong>
                </span>
                {currentLetterChallenge.isRareLetter && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                    حرف ذهبي نادِر (مضاعف ×2) ⭐
                  </span>
                )}
              </div>

              {/* Countdown Timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-sm font-black border ${
                timeLeft <= 10 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' 
                  : 'bg-slate-900 border-slate-700 text-amber-400'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Letter Progress Bar */}
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden flex">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                style={{ width: `${((currentLetterIndex) / tournamentConfig.totalLettersCount) * 100}%` }}
              />
            </div>

            {/* Letter Big Display Box */}
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-4 rounded-3xl border border-amber-500/40 flex items-center justify-between">
              <div className="text-right">
                <span className="text-xs text-slate-400 font-['Cairo'] block">الحرف الحالي:</span>
                <h3 className="text-xl font-black text-amber-300 font-['Cairo']">
                  حرف ({currentLetterChallenge.letter}) - {currentLetterChallenge.letterName}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/30">
                {currentLetterChallenge.letter}
              </div>
            </div>

            {/* Inputs for Categories */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {currentLetterChallenge.categories.map((cat, idx) => {
                const val = currentRoundAnswers[cat.id] || '';
                const isFilled = val.trim().length > 0;

                return (
                  <div 
                    key={cat.id}
                    id={`daily-input-group-${cat.id}`}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-[90px] text-right">
                      <span className="text-base">{cat.iconName || '📝'}</span>
                      <span className="text-xs font-bold text-slate-300 font-['Cairo']">{cat.label}</span>
                    </div>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleAnswerChange(cat.id, e.target.value)}
                        placeholder={`يبدأ بحرف (${currentLetterChallenge.letter})...`}
                        dir="rtl"
                        autoComplete="off"
                        className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-['Cairo'] outline-none transition-colors"
                      />
                      {isFilled && (
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      )}
                    </div>

                    {/* Hint Button */}
                    <button
                      type="button"
                      onClick={() => handleUseHint(cat.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold font-['Cairo'] border border-slate-700 shrink-0"
                      title="استخدام تلميح"
                    >
                      💡
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Next Letter or STOP */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-400 font-['Cairo']">
                ملأت {filledCount} من {currentLetterChallenge.categories.length} خانات
              </span>

              <button
                id="daily-submit-next-letter-btn"
                onClick={finalizeCurrentLetterRound}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm font-['Cairo'] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                {currentLetterIndex + 1 < tournamentConfig.totalLettersCount ? (
                  <>
                    <span>الحرف التالي ({currentLetterIndex + 2}/12)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إنهاء البطولة وحساب السكور (STOP) 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: TOURNAMENT RESULT & SCORE BREAKDOWN */}
        {activeTab === 'tournament_result' && finalSubmission && (
          <div className="space-y-4 pt-3 relative z-10 text-center">
            {/* Score Trophy Banner */}
            <div className="bg-gradient-to-b from-emerald-950/60 to-slate-950 p-5 rounded-3xl border border-emerald-500/40 shadow-xl space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Cairo']">
                أداء بطولي في بطولة الـ 12 حرفاً! 🌟
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">مجموع النقاط</span>
                  <span className="text-xl font-black text-emerald-400 font-['Cairo']">
                    {finalSubmission.totalScore} نقطة
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">نسبة الدقة</span>
                  <span className="text-xl font-black text-cyan-400 font-['Cairo']">
                    {finalSubmission.accuracyPercentage}%
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">الكلمات الصحيحة</span>
                  <span className="text-xl font-black text-amber-300 font-['Cairo']">
                    {finalSubmission.totalValidWords} / {finalSubmission.totalWordsPossible}
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 block font-bold">مكافأة المشاركة</span>
                  <span className="text-xl font-black text-yellow-400 font-['Cairo']">
                    +50 ⭐ +10 💎
                  </span>
                </div>
              </div>
            </div>

            {/* 12 Letters Accordion Breakdown */}
            <div className="space-y-1.5 text-right max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 px-1 block">
                نتائج الـ 12 حرفاً بالتفصيل:
              </span>
              {finalSubmission.roundResults.map((r, i) => (
                <div 
                  key={i}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    r.isPerfect 
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-white' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-black flex items-center justify-center text-xs">
                      {r.letter}
                    </span>
                    <span className="font-bold text-white font-['Cairo']">الحرف {i + 1}: ({r.letter})</span>
                    {r.isPerfect && (
                      <span className="text-[10px] text-emerald-400 font-bold">كمال الحرف ⭐</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-['Cairo']">
                    <span className="text-[11px] text-slate-400">⏱️ {r.timeTakenSeconds}ث</span>
                    <span className="text-emerald-400 font-black">+{r.score} نقطة</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="view-tournament-leaderboard-btn"
                onClick={() => {
                  setActiveTab('leaderboard');
                  loadWeeklyLeaderboard();
                }}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs font-['Cairo'] shadow-md hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-4 h-4 fill-slate-950" />
                <span>عرض منصة التتويج ولوحة الصدارة 🏆</span>
              </button>

              <button
                id="finish-weekly-modal-btn"
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-['Cairo'] transition-all"
              >
                العودة للردهة
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: TOP 3 PODIUM & LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4 pt-3 relative z-10 text-right">
            {/* Header info */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 block font-['Cairo']">
                  {tournamentConfig.formattedWeekArabic}
                </span>
                <span className="text-[11px] text-slate-400">
                  معايير الترتيب: مجموع سكور الـ 12 حرفاً • نسبة دقة الكلمات • السرعة وتوفير الثواني
                </span>
              </div>

              <button
                id="refresh-weekly-leaderboard-btn"
                onClick={loadWeeklyLeaderboard}
                disabled={isLoadingLeaderboard}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="تحديث القائمة"
              >
                <RotateCcw className={`w-4 h-4 ${isLoadingLeaderboard ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {/* TOP 3 PODIUM STAGE */}
            {leaderboard.length >= 1 && (
              <div className="bg-gradient-to-b from-amber-950/30 to-slate-950 p-4 rounded-3xl border border-amber-500/30">
                <div className="flex items-end justify-center gap-2 sm:gap-4 pt-2 pb-1">
                  
                  {/* 2nd Place (Left / Silver) */}
                  {leaderboard[1] ? (
                    <div className="flex-1 max-w-[150px] flex flex-col items-center">
                      <div className="relative mb-2">
                        <img 
                          src={leaderboard[1].photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${leaderboard[1].uid}`} 
                          alt={leaderboard[1].displayName} 
                          className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-300 object-cover shadow-lg"
                        />
                        <span className="absolute -bottom-2 -right-1 text-sm">🥈</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200 truncate w-full text-center font-['Cairo']">
                        {leaderboard[1].displayName}
                      </span>
                      <span className="text-xs font-black text-slate-300 font-['Cairo']">
                        {leaderboard[1].totalScore} نقطة
                      </span>
                      <div className="w-full h-16 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t border-slate-400 shadow-md">
                        <span className="text-xs font-black text-slate-300">المركز 2</span>
                        <span className="text-[10px] text-amber-300 font-bold">+300 ⭐</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 max-w-[150px] opacity-40 text-center text-xs text-slate-500">
                      بانتظار وصيف 🥈
                    </div>
                  )}

                  {/* 1st Place (Center / Gold Champion) */}
                  {leaderboard[0] ? (
                    <div className="flex-1 max-w-[170px] flex flex-col items-center">
                      <div className="relative mb-2">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl animate-bounce">
                          👑
                        </div>
                        <img 
                          src={leaderboard[0].photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${leaderboard[0].uid}`} 
                          alt={leaderboard[0].displayName} 
                          className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-amber-400 object-cover shadow-xl shadow-amber-500/20"
                        />
                        <span className="absolute -bottom-2 -right-1 text-base">🥇</span>
                      </div>
                      <span className="text-xs font-black text-amber-300 truncate w-full text-center font-['Cairo']">
                        {leaderboard[0].displayName}
                      </span>
                      <span className="text-sm font-black text-amber-400 font-['Cairo']">
                        {leaderboard[0].totalScore} نقطة
                      </span>
                      <div className="w-full h-24 bg-gradient-to-t from-amber-600/90 to-amber-500 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t border-yellow-200 shadow-lg text-slate-950 font-black">
                        <span className="text-xs">المركز 1 🥇</span>
                        <span className="text-[11px] font-black">+500 ⭐ +100 💎</span>
                      </div>
                    </div>
                  ) : null}

                  {/* 3rd Place (Right / Bronze) */}
                  {leaderboard[2] ? (
                    <div className="flex-1 max-w-[150px] flex flex-col items-center">
                      <div className="relative mb-2">
                        <img 
                          src={leaderboard[2].photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${leaderboard[2].uid}`} 
                          alt={leaderboard[2].displayName} 
                          className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-amber-700 object-cover shadow-lg"
                        />
                        <span className="absolute -bottom-2 -right-1 text-sm">🥉</span>
                      </div>
                      <span className="text-xs font-bold text-amber-200 truncate w-full text-center font-['Cairo']">
                        {leaderboard[2].displayName}
                      </span>
                      <span className="text-xs font-black text-amber-300 font-['Cairo']">
                        {leaderboard[2].totalScore} نقطة
                      </span>
                      <div className="w-full h-12 bg-gradient-to-t from-amber-900 to-amber-800 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-t border-amber-600 shadow-md">
                        <span className="text-xs font-black text-amber-200">المركز 3</span>
                        <span className="text-[10px] text-yellow-300 font-bold">+150 ⭐</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 max-w-[150px] opacity-40 text-center text-xs text-slate-500">
                      بانتظار مركز ثالث 🥉
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* List of remaining participants */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {isLoadingLeaderboard ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-7 h-7 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">جاري تحميل قائمة الصدارة الأسبوعية...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                  <Users className="w-7 h-7 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">كن أول من ينهي الـ 12 حرفاً ويتصدر قائمة الأسبوع!</p>
                </div>
              ) : (
                leaderboard.map((player, idx) => {
                  const isMe = currentUser?.uid === player.uid;
                  return (
                    <div
                      key={player.uid || idx}
                      id={`weekly-leaderboard-item-${idx + 1}`}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                        isMe
                          ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/50 shadow-md'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300 font-['Cairo']">
                          {idx + 1}
                        </div>

                        <img
                          src={player.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                          alt={player.displayName}
                          className="w-8 h-8 rounded-xl bg-slate-800 object-cover border border-slate-700"
                        />

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white font-['Cairo']">
                              {player.displayName}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 rounded-full">
                                أنت
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-['Cairo']">
                            🎯 الدقة: {player.accuracyPercentage}% • ⏱️ الوقت: {player.totalTimeSeconds}ث
                          </span>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-sm font-black text-amber-300 font-['Cairo'] block">
                          {player.totalScore} نقطة
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PRIZES & SCORING RULES */}
        {activeTab === 'prizes_info' && (
          <div className="space-y-4 pt-3 relative z-10 text-right">
            <div className="bg-slate-950/80 p-4 rounded-3xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-amber-400 font-['Cairo'] flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span>جوائز المراكز الـ 3 الأولى في بطولة الأسبوع</span>
              </h4>

              <div className="space-y-2">
                {WEEKLY_PODIUM_PRIZES.map((p) => (
                  <div 
                    key={p.rank}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <span className="text-xs font-black text-white block font-['Cairo']">
                          {p.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          وسام: <strong className="text-amber-300">{p.badgeTitle}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-['Cairo']">
                      <span className="text-xs font-black text-amber-300 block">+{p.stars} ⭐</span>
                      <span className="text-[10px] text-cyan-300 font-bold block">+{p.gems} 💎 +{p.hints} 💡</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules Card */}
            <div className="bg-slate-950/80 p-4 rounded-3xl border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <h5 className="font-bold text-white font-['Cairo'] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>معايير احتساب النقاط والسرعة:</span>
              </h5>
              <p>• <strong className="text-emerald-400">10 نقاط</strong> لكل إجابة صحيحة تبدأ بالحرف المطلوب.</p>
              <p>• <strong className="text-amber-400">مضاعف الحروف الذهبية (×2)</strong> على جميع الكلمات بتلك الجولة.</p>
              <p>• <strong className="text-cyan-400">مكافأة السرعة</strong>: نقطة إضافية عن كل 3 ثوانٍ توفرها عند الضغط على زر STOP.</p>
              <p>• <strong className="text-yellow-300">مكافأة كمال الحرف (+15 نقطة)</strong> عند تعبئة كافة الخانات الـ 5 بإجابات صحيحة 100%.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
