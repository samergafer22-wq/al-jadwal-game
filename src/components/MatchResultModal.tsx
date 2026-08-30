import React, { useEffect } from 'react';
import { Trophy, Award, RotateCcw, Home, Star, Frown, Sparkles, PartyPopper } from 'lucide-react';
import { MatchData, UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { fireGrandMatchVictoryConfetti } from '../lib/celebration';
import { QuickChatWidget } from './QuickChatWidget';

interface MatchResultModalProps {
  match: MatchData;
  currentUser: UserProfile;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onSendChat?: (message: string, emoji?: string) => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  match,
  currentUser,
  onPlayAgain,
  onGoHome,
  onSendChat,
}) => {
  const opponentId = match.players.find((p) => p !== currentUser.uid) || 'bot';
  const opponentDetails = match.playerDetails[opponentId] || {
    displayName: 'الخصم',
    photoURL: undefined,
  };

  const myMatchScore = match.matchScores?.[currentUser.uid] || { totalPoints: 0, roundsWon: 0 };
  const opponentMatchScore = match.matchScores?.[opponentId] || { totalPoints: 0, roundsWon: 0 };

  const isWinner = match.winnerId === currentUser.uid;
  const isDraw = match.winnerId === 'draw' || myMatchScore.totalPoints === opponentMatchScore.totalPoints;

  // Trigger grand fireworks and confetti fanfare on load if winner
  useEffect(() => {
    if (isWinner) {
      soundManager.playVictory();
      fireGrandMatchVictoryConfetti();
    }
  }, [isWinner]);

  const handleCelebrateAgain = () => {
    soundManager.playVictory();
    fireGrandMatchVictoryConfetti();
  };

  return (
    <div 
      id="match-result-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200 my-auto relative overflow-hidden">
        
        {/* Glow effect for victory */}
        {isWinner && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Victory Icon / Badge */}
        <div className="flex flex-col items-center relative z-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl mb-3 ${
            isWinner 
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-amber-500/30 ring-4 ring-amber-400/40 animate-bounce' 
              : isDraw
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-slate-800 text-rose-400 border border-rose-500/30'
          }`}>
            {isWinner ? <Trophy className="w-10 h-10 text-slate-950" /> : isDraw ? '🤝' : <Frown className="w-10 h-10 text-rose-400" />}
          </div>

          <div className="flex items-center justify-center gap-2">
            {isWinner && <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />}
            <h2 className="text-3xl font-black font-['Cairo'] text-white">
              {isWinner ? 'مبروك! لقد فزت بالمباراة 🏆' : isDraw ? 'تعادل رائع بينكما!' : 'حظ أوفر في المباراة القادمة!'}
            </h2>
            {isWinner && <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />}
          </div>

          <p className="text-xs text-slate-300 mt-1">
            {isWinner 
              ? `ربحت جائزة الرهان كاملة (+${match.totalPot} ⭐ نجوم تحدي)!` 
              : isDraw 
              ? 'تمت إعادة النجوم المراهن بها (20 ⭐) لرصيدك' 
              : 'خسرت 20 ⭐ في هذه الجولة التنافسية'}
          </p>

          {isWinner && (
            <button
              id="celebrate-again-btn"
              onClick={handleCelebrateAgain}
              className="mt-2.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold font-['Cairo'] flex items-center gap-1.5 active:scale-95 transition-all shadow"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>إطلاق ألعاب نارية 🎉</span>
            </button>
          )}
        </div>

        {/* Final Scoreboard */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 relative z-10">
          
          {/* My Final Score */}
          <div className={`p-3 rounded-xl border ${isWinner ? 'bg-emerald-950/50 border-emerald-400 ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-bold text-slate-300 block mb-1">أنت</span>
            <span className="text-3xl font-black font-['Cairo'] text-emerald-400 block">
              {myMatchScore.totalPoints}
            </span>
            <span className="text-[11px] text-slate-400">
              فزت بـ {myMatchScore.roundsWon} جولات
            </span>
          </div>

          {/* Opponent Final Score */}
          <div className={`p-3 rounded-xl border ${!isWinner && !isDraw ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-bold text-slate-300 block mb-1">{opponentDetails.displayName}</span>
            <span className="text-3xl font-black font-['Cairo'] text-white block">
              {opponentMatchScore.totalPoints}
            </span>
            <span className="text-[11px] text-slate-400">
              فاز بـ {opponentMatchScore.roundsWon} جولات
            </span>
          </div>

        </div>

        {/* Rounds Breakdown Recap */}
        {match.roundsHistory && match.roundsHistory.length > 0 && (
          <div className="space-y-1.5 text-right relative z-10">
            <h4 className="text-xs font-bold text-slate-400 px-1">سجل الجولات (Best of 3):</h4>
            <div className="space-y-1">
              {match.roundsHistory.map((rh, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-xl text-xs border border-slate-800"
                >
                  <span className="font-bold text-white">
                    الجولة {rh.roundNumber} (حرف {rh.letter})
                  </span>
                  <span className="font-['Cairo'] font-extrabold text-slate-300">
                    {rh.scores[currentUser.uid]?.totalPoints || 0} - {rh.scores[opponentId]?.totalPoints || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Sportsmanship Chat Bar */}
        {onSendChat && (
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-300">
              تبادل التحية والتفاعل 🤝:
            </span>
            <QuickChatWidget
              match={match}
              currentUser={currentUser}
              onSendChat={onSendChat}
              position="inline"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 relative z-10">
          <button
            id="play-again-btn"
            onClick={() => {
              soundManager.playClick();
              onPlayAgain();
            }}
            className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>مباراة جديدة</span>
          </button>

          <button
            id="go-home-btn"
            onClick={() => {
              soundManager.playClick();
              onGoHome();
            }}
            className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm font-['Cairo'] flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        </div>

      </div>
    </div>
  );
};
