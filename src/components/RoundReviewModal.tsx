import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Flame, 
  AlertTriangle, 
  MessageSquare, 
  Timer, 
  ArrowLeft, 
  Trophy, 
  ShieldAlert,
  Sparkles,
  Home
} from 'lucide-react';
import { RoundResult, UserProfile, MatchData } from '../types';
import { ALL_CATEGORIES } from '../data/categories';
import { soundManager } from '../lib/audio';
import { fireRoundWinConfetti } from '../lib/celebration';
import { QuickChatWidget } from './QuickChatWidget';

interface RoundReviewModalProps {
  match: MatchData;
  currentUser: UserProfile;
  latestRound: RoundResult;
  onNextRoundOrFinish: () => void;
  onRaiseDispute: (categoryId: string, word: string) => void;
  onWithdrawWord: (categoryId: string) => void;
  onJustifyWord: (categoryId: string, justification: string) => void;
  onGoHome?: () => void;
  onSendChat?: (message: string, emoji?: string) => void;
}

export const RoundReviewModal: React.FC<RoundReviewModalProps> = ({
  match,
  currentUser,
  latestRound,
  onNextRoundOrFinish,
  onRaiseDispute,
  onWithdrawWord,
  onJustifyWord,
  onGoHome,
  onSendChat,
}) => {
  const [reviewTimeLeft, setReviewTimeLeft] = useState<number>(15);
  const [justificationInput, setJustificationInput] = useState<string>('');
  const [activeDisputeCatId, setActiveDisputeCatId] = useState<string | null>(null);

  const opponentId = match.players.find((p) => p !== currentUser.uid) || 'bot';
  const opponentDetails = match.playerDetails[opponentId] || {
    displayName: 'الخصم',
    photoURL: undefined,
  };

  const myScores = latestRound.scores[currentUser.uid] || { totalPoints: 0, breakdown: {} };
  const opponentScores = latestRound.scores[opponentId] || { totalPoints: 0, breakdown: {} };

  const isRoundWinner = myScores.totalPoints > opponentScores.totalPoints;
  const isRoundDraw = myScores.totalPoints === opponentScores.totalPoints && myScores.totalPoints > 0;

  // Trigger celebratory confetti when winning the round
  useEffect(() => {
    if (isRoundWinner) {
      soundManager.playVictory();
      fireRoundWinConfetti();
    }
  }, [isRoundWinner]);

  // 15-second review timer
  useEffect(() => {
    const interval = setInterval(() => {
      setReviewTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const activeCategories = ALL_CATEGORIES.filter((c) => match.categories.includes(c.id));
  const isLastRound = match.currentRound >= match.maxRounds;

  // Check if I am stoppedBy
  const stoppedByName = latestRound.stoppedBy === currentUser.uid 
    ? 'أنت' 
    : opponentDetails.displayName;

  return (
    <div 
      id="round-review-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header HUD */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4 text-center sm:text-right">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-500/30">
                نتائج الجولة {latestRound.roundNumber} من {match.maxRounds}
              </span>
              <span className="text-xs font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                الحرف: ({latestRound.letter})
              </span>
              {latestRound.isRareLetter && (
                <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-400" /> مضاعفة (×2)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {latestRound.stoppedBy 
                ? `تم إيقاف الجولة بواسطة: (${stoppedByName}) عبر زر توقف` 
                : 'انتهت الجولة بانتهاء الـ 45 ثانية'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onSendChat && (
              <QuickChatWidget
                match={match}
                currentUser={currentUser}
                onSendChat={onSendChat}
                position="inline"
              />
            )}

            {/* 15s Dispute Countdown */}
            <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-700">
              <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block leading-tight">مهلة الاعتراض:</span>
                <span className="text-xs font-black text-amber-400 font-['Cairo']">
                  {reviewTimeLeft} ثوانٍ متبقية
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Round Totals Scoreboard */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
          <div className={`p-2.5 rounded-xl border transition-all ${
            isRoundWinner 
              ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50' 
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {isRoundWinner && <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
              <span className={`text-xs font-bold ${isRoundWinner ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isRoundWinner ? 'فزت بهذه الجولة! 🎉' : 'مجموعك بهذه الجولة'}
              </span>
            </div>
            <span className="text-2xl font-black text-white font-['Cairo']">
              {myScores.totalPoints} نقطة
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border transition-all ${
            !isRoundWinner && !isRoundDraw && opponentScores.totalPoints > myScores.totalPoints
              ? 'bg-rose-950/30 border-rose-500/40' 
              : 'bg-slate-900/90 border-slate-700'
          }`}>
            <span className="text-xs text-slate-400 font-bold block mb-0.5">مجموع {opponentDetails.displayName}</span>
            <span className="text-2xl font-black text-white font-['Cairo']">
              {opponentScores.totalPoints} نقطة
            </span>
          </div>
        </div>

        {/* Active Dispute Banner if any */}
        {match.activeDisputes && Object.keys(match.activeDisputes).length > 0 && (
          <div className="space-y-2">
            {Object.entries(match.activeDisputes).map(([key, rawDispute]) => {
              const dispute = rawDispute as {
                categoryId: string;
                raisedBy: string;
                targetUid: string;
                word: string;
                status: 'open' | 'withdrawn' | 'justified';
                justification?: string;
                expiresAt: number;
              };
              const isTargetingMe = dispute.targetUid === currentUser.uid;
              const catDef = ALL_CATEGORIES.find((c) => c.id === dispute.categoryId);

              return (
                <div
                  key={key}
                  className="bg-amber-950/60 border border-amber-500/50 p-3.5 rounded-2xl space-y-2 text-right animate-in fade-in"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      اعتراض على فئة ({catDef?.label}): كلمة "{dispute.word}"
                    </span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">
                      {isTargetingMe ? 'أنت المُعترض عليه' : 'اعتراضك قيد النظر'}
                    </span>
                  </div>

                  {dispute.justification && (
                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <strong>تبرير الخصم:</strong> {dispute.justification}
                    </p>
                  )}

                  {isTargetingMe && dispute.status === 'open' && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="اكتب تبريرك للكلمة هنا..."
                        value={justificationInput}
                        onChange={(e) => setJustificationInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onJustifyWord(dispute.categoryId, justificationInput || 'الكلمة صحيحة لغوياً');
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap"
                        >
                          تأكيد وتبرير
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onWithdrawWord(dispute.categoryId);
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/30 text-xs font-bold whitespace-nowrap"
                        >
                          سحب الكلمة (0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison Table by Category */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {activeCategories.map((cat) => {
            const p1Ans = myScores.breakdown?.[cat.id] || {
              word: '',
              isValid: false,
              isDuplicate: false,
              points: 0,
            };
            const p2Ans = opponentScores.breakdown?.[cat.id] || {
              word: '',
              isValid: false,
              isDuplicate: false,
              points: 0,
            };

            const canObjectToOpponent =
              p2Ans.isValid &&
              p2Ans.word &&
              p2Ans.points > 0 &&
              reviewTimeLeft > 0 &&
              !match.activeDisputes?.[cat.id];

            return (
              <div
                key={cat.id}
                id={`review-row-${cat.id}`}
                className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/80 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="font-['Cairo'] text-white">{cat.label}</span>
                  <span className="text-[11px] text-slate-400">
                    {p1Ans.isDuplicate && p1Ans.isValid ? 'كلمة مكررة (5 نقاط لكل منكما)' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  
                  {/* Your Word Card */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 ${
                    p1Ans.isValid 
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                      : 'bg-rose-950/30 border-rose-500/40 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">إجابتك:</span>
                        <span className={`font-bold text-sm font-['Cairo'] ${p1Ans.isValid ? 'text-white' : 'text-rose-200 line-through'}`}>
                          {p1Ans.word || '— فارغة —'}
                        </span>
                      </div>
                      <span className={`font-black text-xs font-['Cairo'] ${p1Ans.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {p1Ans.isValid ? `+${p1Ans.points}` : '0'}
                      </span>
                    </div>
                    {!p1Ans.isValid && p1Ans.word && (
                      <span className="text-[10px] text-rose-400 font-medium">
                        {p1Ans.reason || 'إجابة غير صحيحة'}
                      </span>
                    )}
                  </div>

                  {/* Opponent's Word Card with Dispute button */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 ${
                    p2Ans.isValid 
                      ? 'bg-slate-900/80 border-slate-700 text-slate-200' 
                      : 'bg-rose-950/20 border-rose-500/30 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{opponentDetails.displayName}:</span>
                        <span className={`font-bold text-sm font-['Cairo'] ${p2Ans.isValid ? 'text-white' : 'text-slate-400'}`}>
                          {p2Ans.word || '— فارغة —'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black text-xs font-['Cairo'] ${p2Ans.isValid ? 'text-slate-300' : 'text-rose-400'}`}>
                          {p2Ans.isValid ? `+${p2Ans.points}` : '0'}
                        </span>
                        {canObjectToOpponent && (
                          <button
                            id={`dispute-btn-${cat.id}`}
                            onClick={() => {
                              soundManager.playClick();
                              onRaiseDispute(cat.id, p2Ans.word);
                            }}
                            className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/40 transition-colors"
                            title="اعتراض على الكلمة"
                          >
                            اعتراض
                          </button>
                        )}
                      </div>
                    </div>
                    {!p2Ans.isValid && p2Ans.word && (
                      <span className="text-[10px] text-rose-400 font-medium">
                        {p2Ans.reason || 'إجابة غير صحيحة'}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onGoHome && (
              <button
                id="round-review-go-home-btn"
                onClick={() => {
                  soundManager.playClick();
                  onGoHome();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs font-['Cairo'] flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="العودة للقائمة الرئيسية"
              >
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span>الرئيسية</span>
              </button>
            )}
            <p className="text-xs text-slate-400">
              {isLastRound ? 'اكتملت الـ 3 جولات! حان وقت النتيجة النهائية' : 'استعد للجولة التالية واختيار الحرف'}
            </p>
          </div>

          <button
            id="next-round-continue-btn"
            onClick={() => {
              soundManager.playClick();
              onNextRoundOrFinish();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <span>{isLastRound ? 'عرض النتيجة النهائية للمباراة 🏆' : 'متابعة للجولة التالية ⬅️'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
