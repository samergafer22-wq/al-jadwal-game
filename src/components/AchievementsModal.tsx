import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Trophy, 
  Zap, 
  Sparkles, 
  Star, 
  Gem, 
  CheckCircle2, 
  Swords, 
  Crown, 
  BookOpen, 
  Target, 
  CalendarCheck, 
  Dices,
  Home
} from 'lucide-react';
import { UserProfile, AchievementDef } from '../types';
import { ACHIEVEMENTS_LIST, getAchievementProgress } from '../data/achievements';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { triggerConfetti } from '../lib/celebration';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onClaimAchievementReward: (achievementId: string, rewardStars: number, rewardGems: number) => Promise<void>;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onClaimAchievementReward,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6' };
    switch (iconName) {
      case 'Trophy': return <Trophy {...props} className="w-6 h-6 text-amber-400" />;
      case 'Swords': return <Swords {...props} className="w-6 h-6 text-indigo-400" />;
      case 'Crown': return <Crown {...props} className="w-6 h-6 text-amber-300" />;
      case 'Zap': return <Zap {...props} className="w-6 h-6 text-yellow-400" />;
      case 'Sparkles': return <Sparkles {...props} className="w-6 h-6 text-emerald-400" />;
      case 'CalendarCheck': return <CalendarCheck {...props} className="w-6 h-6 text-cyan-400" />;
      case 'Dices': return <Dices {...props} className="w-6 h-6 text-fuchsia-400" />;
      case 'BookOpen': return <BookOpen {...props} className="w-6 h-6 text-emerald-300" />;
      case 'Target': return <Target {...props} className="w-6 h-6 text-rose-400" />;
      default: return <Award {...props} className="w-6 h-6 text-amber-400" />;
    }
  };

  const handleClaim = async (achievement: AchievementDef) => {
    soundManager.playClick();
    haptics.success();
    setClaimingId(achievement.id);
    try {
      await onClaimAchievementReward(achievement.id, achievement.rewardStars, achievement.rewardGems);
      triggerConfetti();
    } catch (err) {
      console.error('Error claiming achievement:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const totalAchievements = ACHIEVEMENTS_LIST.length;
  const completedAchievements = ACHIEVEMENTS_LIST.filter(a => {
    const current = getAchievementProgress(a, userProfile);
    return current >= a.targetCount;
  }).length;

  const filteredList = ACHIEVEMENTS_LIST.filter(a => {
    const current = getAchievementProgress(a, userProfile);
    const isCompleted = current >= a.targetCount;
    if (filter === 'unlocked') return isCompleted;
    if (filter === 'locked') return !isCompleted;
    return true;
  });

  return (
    <div 
      id="achievements-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden font-['Cairo'] animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-amber-950/80 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              id="achievements-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-achievements-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-black text-indigo-300 flex items-center gap-1.5 justify-end">
                <span>أوسمة الإنجازات والتفوق</span>
                <Award className="w-5 h-5 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                أكملت {completedAchievements} من أصل {totalAchievements} إنجازاً
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { soundManager.playClick(); setFilter('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              الكل ({totalAchievements})
            </button>
            <button
              onClick={() => { soundManager.playClick(); setFilter('unlocked'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'unlocked' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              المكتملة ({completedAchievements})
            </button>
            <button
              onClick={() => { soundManager.playClick(); setFilter('locked'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'locked' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              قيد التقدم ({totalAchievements - completedAchievements})
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            اكسب النجوم والجواهر عند إتمام كل وسام 💎
          </div>
        </div>

        {/* Badges List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredList.map((item) => {
            const current = getAchievementProgress(item, userProfile);
            const isCompleted = current >= item.targetCount;
            const state = userProfile?.achievements?.[item.id];
            const isClaimed = state?.claimed;
            const progressPct = Math.min(100, Math.round((current / item.targetCount) * 100));

            return (
              <div 
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-slate-900 to-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                    : 'bg-slate-900/60 border-slate-800 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                    isCompleted 
                      ? 'bg-indigo-500/20 border-indigo-500/40 shadow-inner' 
                      : 'bg-slate-800 border-slate-700 grayscale'
                  }`}>
                    {renderIcon(item.iconName)}
                  </div>

                  <div className="text-right flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{item.title}</h4>
                      {isCompleted && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          مكتمل ✅
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-2 w-full max-w-xs">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">
                        {current} / {item.targetCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward & Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-800 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>+{item.rewardStars}</span>
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                      <Gem className="w-3.5 h-3.5 fill-cyan-400" />
                      <span>+{item.rewardGems}</span>
                    </span>
                  </div>

                  {isCompleted ? (
                    isClaimed ? (
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>تم الاستلام</span>
                      </span>
                    ) : (
                      <button
                        id={`claim-achievement-${item.id}-btn`}
                        disabled={claimingId === item.id}
                        onClick={() => handleClaim(item)}
                        className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                      >
                        {claimingId === item.id ? 'جاري الاستلام...' : 'استلام المكافأة 🎁'}
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded-lg">
                      {progressPct}%
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
