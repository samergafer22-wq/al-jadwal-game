import React, { useState } from 'react';
import { 
  Zap, 
  Users, 
  Bot, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  Plus, 
  Tv, 
  HelpCircle, 
  Clock, 
  Flame, 
  ShieldCheck,
  Award,
  ArrowUpRight,
  ShoppingBag,
  Calendar,
  Sparkles,
  Gift
} from 'lucide-react';
import { UserProfile, MatchHistoryItem, UserTasksState } from '../types';
import { ALL_CATEGORIES, STANDARD_CATEGORIES } from '../data/categories';
import { soundManager } from '../lib/audio';
import { getWeeklyTournamentConfig, getWeekKey } from '../lib/dailyChallenge';
import { DAILY_TASKS, WEEKLY_TASKS, countUnclaimedTasks } from '../lib/tasks';
import { checkSpinEligibility } from '../lib/luckySpin';
import { checkIsAdmin, PRIMARY_ADMIN_EMAIL } from '../lib/adminAuth';
import { Dices, Crown } from 'lucide-react';

interface LobbyViewProps {
  userProfile: UserProfile;
  selectedCategoryIds: string[];
  onToggleCategory: (catId: string) => void;
  onStartQuickMatch: () => void;
  onOpenFriendChallenge: () => void;
  onStartBotMatch: () => void;
  onOpenRewardedAd: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenDailyChallenge: () => void;
  onOpenTasks?: () => void;
  onOpenLuckySpin?: () => void;
  onOpenAchievements?: () => void;
  onOpenAdmin?: () => void;
  tasksState?: UserTasksState;
  recentMatches: MatchHistoryItem[];
  isSearchingMatch: boolean;
  onCancelMatchmaking: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  userProfile,
  selectedCategoryIds,
  onToggleCategory,
  onStartQuickMatch,
  onOpenFriendChallenge,
  onStartBotMatch,
  onOpenRewardedAd,
  onOpenShop,
  onOpenLeaderboard,
  onOpenDailyChallenge,
  onOpenTasks,
  onOpenLuckySpin,
  onOpenAchievements,
  onOpenAdmin,
  tasksState,
  recentMatches,
  isSearchingMatch,
  onCancelMatchmaking,
}) => {
  const [showRules, setShowRules] = useState(false);
  const weekKey = getWeekKey();
  const weeklyConfig = getWeeklyTournamentConfig(weekKey);
  const unclaimedCount = tasksState ? countUnclaimedTasks(tasksState) : 0;

  const completedDailyCount = tasksState
    ? DAILY_TASKS.filter((t) => tasksState.tasks[t.id]?.completed).length
    : 0;

  const winRate = userProfile.stats.totalMatches > 0
    ? Math.round((userProfile.stats.wins / userProfile.stats.totalMatches) * 100)
    : 0;

  const hasEnoughStars = userProfile.stars >= 20;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* Search Matchmaking Overlay Bar if Active */}
      {isSearchingMatch && (
        <div 
          id="matchmaking-search-banner"
          className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-2 border-emerald-500/50 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden animate-pulse"
        >
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-emerald-300 font-['Cairo']">
              جاري البحث عن لاعب منافس متصل...
            </h3>
            <p className="text-xs text-slate-300">
              قائمة الانتظار اللحظية • الرهان: 20 نجمة ⭐ • الجائزة للفائز: 40 نجمة ⭐
            </p>
            <button
              id="cancel-matchmaking-btn"
              onClick={() => {
                soundManager.playClick();
                onCancelMatchmaking();
              }}
              className="mt-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-md"
            >
              إلغاء البحث
            </button>
          </div>
        </div>
      )}

      {/* Admin Quick Control Banner (Visible only to Admin Accounts) */}
      {checkIsAdmin(userProfile) && onOpenAdmin && (
        <div
          id="lobby-admin-banner"
          className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in"
        >
          <div className="flex items-center gap-3 text-center sm:text-right flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  مدير النظام المعتمد
                </span>
                <span className="text-xs text-amber-300 font-mono hidden sm:inline">
                  {PRIMARY_ADMIN_EMAIL}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-1">
                لوحة تحكم وصلاحيات لعبة الجدول الشاملة 👑
              </h3>
              <p className="text-xs text-slate-300">
                إدارة أرصدة اللاعبين، الغرف النشطة، إعدادات الاقتصاد ومعجم الكلمات المخصص
              </p>
            </div>
          </div>

          <button
            id="lobby-open-admin-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenAdmin();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0 hover:scale-105"
          >
            <span>فتح لوحة الآدمن ⚡</span>
          </button>
        </div>
      )}

      {/* Featured Weekly 12-Letter Tournament Banner */}
      <div 
        id="lobby-daily-challenge-banner"
        className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/50 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 group"
      >
        {/* Glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

        <div className="flex items-center gap-4 text-center sm:text-right flex-col sm:flex-row">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex flex-col items-center justify-center font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 shrink-0">
            <span className="text-2xl font-black font-['Cairo']">12</span>
            <span className="text-[9px] font-extrabold uppercase">حرفاً أسبوعياً</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-500/40">
                بطولة الأسبوع الكبرى 🏆
              </span>
              <span className="text-xs text-slate-400">
                {weeklyConfig.formattedWeekArabic}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white font-['Cairo']">
              خُض بطولة الـ 12 حرفاً وتصدر منصة التتويج! 🌟
            </h3>
            <p className="text-xs text-slate-300 max-w-lg">
              تنافس بالسرعة ودقة الكلمات للمراكز الـ 3 الأولى: 
              <strong className="text-amber-300 font-bold"> الأول 500⭐</strong> • 
              <strong className="text-slate-300 font-bold"> الثاني 300⭐</strong> • 
              <strong className="text-amber-400 font-bold"> الثالث 150⭐</strong> + أوسمة وجواهر!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            id="lobby-play-daily-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenDailyChallenge();
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-sm font-['Cairo'] shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 ring-2 ring-amber-400/40"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>خوض بطولة الـ 12 حرفاً 🏆</span>
          </button>
        </div>
      </div>

      {/* Featured Tasks Banner */}
      {onOpenTasks && (
        <div 
          id="lobby-tasks-banner"
          className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-amber-950/40 border border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-center sm:text-right flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  مهام الجدول 📜
                </span>
                {unclaimedCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white font-black px-2 py-0.5 rounded-full animate-bounce">
                    {unclaimedCount} جوائز جاهزة للاستلام!
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white font-['Cairo'] mt-0.5">
                المهام اليومية والأسبوعية
              </h4>
              <p className="text-xs text-slate-300">
                أنجزت <strong className="text-amber-300">{completedDailyCount}</strong> من أصل <strong className="text-white">{DAILY_TASKS.length}</strong> مهام يومية • جوائز نجوم مجانية ⭐
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              id="lobby-open-tasks-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenTasks();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl text-xs font-['Cairo'] shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-indigo-400/30"
            >
              <Gift className="w-4 h-4 text-amber-300" />
              <span>استعراض المهام {unclaimedCount > 0 ? `(${unclaimedCount} 🎁)` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Power & Rewards Shortcuts: Lucky Spin & Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Daily Lucky Spin */}
        {onOpenLuckySpin && (
          <div 
            id="lobby-lucky-spin-card"
            onClick={() => {
              soundManager.playClick();
              onOpenLuckySpin();
            }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-fuchsia-950/30 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between group shadow-md"
          >
            {(() => {
              const spinElig = checkSpinEligibility(userProfile);
              return (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-fuchsia-500 text-slate-950 flex items-center justify-center font-black group-hover:rotate-12 transition-transform shadow-md">
                    <Dices className="w-5 h-5 text-slate-950" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white font-['Cairo'] group-hover:text-amber-300 transition-colors">
                        عجلة الحظ اليومية 🎡
                      </h4>
                      {spinElig.canSpin ? (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
                          جاهزة الآن!
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded-lg border border-amber-500/30">
                          {spinElig.formattedCountdown}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {spinElig.canSpin 
                        ? 'دوّر العجلة واربح نجوم وجواهر وتلميحات' 
                        : `لفة واحدة كل 24 ساعة (متبقي ${spinElig.formattedCountdown})`}
                    </p>
                  </div>
                </div>
              );
            })()}
            <span className="text-xs font-black text-amber-400 group-hover:translate-x-[-2px] transition-transform">
              تدوير ←
            </span>
          </div>
        )}

        {/* Achievements Badges */}
        {onOpenAchievements && (
          <div 
            id="lobby-achievements-card"
            onClick={() => {
              soundManager.playClick();
              onOpenAchievements();
            }}
            className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-between group shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-slate-950 flex items-center justify-center font-black group-hover:scale-105 transition-transform shadow-md">
                <Award className="w-5 h-5 text-slate-950" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black text-white font-['Cairo'] group-hover:text-indigo-300 transition-colors">
                  أوسمة الإنجازات 🏆
                </h4>
                <p className="text-[11px] text-slate-400">
                  تحديات تراكمية ومكافآت نجوم وجواهر
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-400 group-hover:translate-x-[-2px] transition-transform">
              الأوسمة ←
            </span>
          </div>
        )}
      </div>

      {/* Hero Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Quick Match Card */}
        <div 
          id="quick-match-card"
          className="relative bg-gradient-to-br from-emerald-900/60 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                مباراة سريعة
              </span>
            </div>
            <h3 className="text-xl font-black text-white font-['Cairo'] mb-1">
              تحدي لاعب عشوائي
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              طابق فورًا مع لاعب متصل حاليًا في جولة تنافسية حماسية Best of 3!
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>الرهان المطلوب:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1 font-['Cairo']">
                20 ⭐
              </span>
            </div>
            <button
              id="start-quick-match-btn"
              disabled={isSearchingMatch || !hasEnoughStars}
              onClick={() => {
                soundManager.playClick();
                onStartQuickMatch();
              }}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg transition-all ${
                !hasEnoughStars
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-98'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{hasEnoughStars ? 'ابدأ البحث الآن (20 ⭐)' : 'رصيد النجوم غير كافٍ'}</span>
            </button>
          </div>
        </div>

        {/* Challenge Friend Card */}
        <div 
          id="friend-challenge-card"
          className="relative bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-6 shadow-xl hover:border-indigo-400 transition-all flex flex-col justify-between group overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-black bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                غرفة خاصة
              </span>
            </div>
            <h3 className="text-xl font-black text-white font-['Cairo'] mb-1">
              تحدي صديق
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              أنشئ غرفة برمز خاص أو انضم لغرفة صديقك وتحدَّه مباشرة عبر الرابط!
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>الرهان المطلوب:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1 font-['Cairo']">
                20 ⭐
              </span>
            </div>
            <button
              id="start-friend-challenge-btn"
              disabled={isSearchingMatch || !hasEnoughStars}
              onClick={() => {
                soundManager.playClick();
                onOpenFriendChallenge();
              }}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg transition-all ${
                !hasEnoughStars
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 active:scale-98'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إنشاء أو انضمام لغرفة</span>
            </button>
          </div>
        </div>

        {/* AI Bot Match Card */}
        <div 
          id="bot-match-card"
          className="relative bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between group overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
                تدريب ذكي
              </span>
            </div>
            <h3 className="text-xl font-black text-white font-['Cairo'] mb-1">
              تحدي روبوت الجدول
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              تدرب وطوّر سرعتك ضد الذكاء الاصطناعي بدون انتظار (تحدي بدون رهان).
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>نوع الجولة:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 font-['Cairo']">
                تدريب مجاني 🎮
              </span>
            </div>
            <button
              id="start-bot-match-btn"
              onClick={() => {
                soundManager.playClick();
                onStartBotMatch();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
            >
              <Bot className="w-4 h-4" />
              <span>العب ضد الروبوت الآن</span>
            </button>
          </div>
        </div>

      </div>

      {/* Middle Row: Free Stars Banner & Player Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Rewarded Ad Card (Free +20 Stars) - Marked 'قريباً' */}
        <div 
          id="rewarded-ad-banner"
          className="md:col-span-1 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🎁</span>
                <h4 className="font-bold text-white font-['Cairo'] text-sm">
                  بوابة إعلانات المكافآت
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                شاهد إعلانات قصيرة لكسب نجوم وجواهر إضافية لحسابك مجاناً!
              </p>
            </div>
            <span className="text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40 shadow-sm animate-pulse">
              قريباً ⏳
            </span>
          </div>

          <div className="mt-4">
            <button
              id="claim-reward-ad-btn"
              disabled={true}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs font-['Cairo'] flex items-center justify-center gap-1.5 bg-slate-800/80 text-slate-400 border border-slate-700 cursor-not-allowed opacity-90 transition-all"
              title="ستتوفر بوابة الإعلانات الرسمية قريباً في تحديث متجر Google Play"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400/60" />
              <span>ستتوفر الإعلانات قريباً (+20 ⭐)</span>
            </button>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div 
          id="player-stats-card"
          className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 font-['Cairo'] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              إحصائياتك وإنجازاتك
            </span>
            <button
              id="lobby-open-leaderboard-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenLeaderboard();
              }}
              className="text-xs text-amber-300 hover:text-amber-200 font-bold font-['Cairo'] flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 transition-all"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>عرض لوحة المتصدرين 🏆</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">المباريات</span>
              <span className="text-xl font-black text-white font-['Cairo']">
                {userProfile.stats.totalMatches}
              </span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-emerald-400/90 block mb-1">الانتصارات</span>
              <span className="text-xl font-black text-emerald-400 font-['Cairo']">
                {userProfile.stats.wins}
              </span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">نسبة الفوز</span>
              <span className="text-xl font-black text-cyan-400 font-['Cairo']">
                {winRate}%
              </span>
            </div>

            <div 
              className="bg-slate-800/60 p-3 rounded-2xl border border-amber-500/30 text-center cursor-pointer hover:bg-amber-950/30 transition-all group"
              onClick={() => {
                soundManager.playClick();
                onOpenLeaderboard();
              }}
              title="اضغط لعرض الترتيب العام في لوحة الشرف"
            >
              <span className="text-xs text-amber-400/90 block mb-1 font-bold group-hover:text-amber-300">أعلى سكور 🏆</span>
              <span className="text-xl font-black text-amber-400 font-['Cairo'] group-hover:scale-105 inline-block transition-transform">
                {userProfile.stats.highestScore || 0}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Category Selection Manager */}
      <div 
        id="active-categories-card"
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-white font-['Cairo'] flex items-center gap-2">
              <span>فئات جدول التحدي</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {selectedCategoryIds.length} فئات نشطة
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              الفئات الـ5 الكلاسيكية مفعلة تلقائيًا، ويمكنك تفعيل فئاتك الإضافية المفتوحة
            </p>
          </div>

          <button
            id="open-shop-categories-btn"
            onClick={onOpenShop}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>متجر الفئات</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ALL_CATEGORIES.map((cat) => {
            const isUnlocked = !cat.isExtra || (userProfile.unlockedCategories && (
              userProfile.unlockedCategories.includes(cat.id) ||
              (cat.id === 'foods' && userProfile.unlockedCategories.includes('food')) ||
              (cat.id === 'tv_shows' && userProfile.unlockedCategories.includes('series')) ||
              (cat.id === 'professions' && userProfile.unlockedCategories.includes('profession'))
            ));
            const isSelected = selectedCategoryIds.includes(cat.id);
            const price = cat.gemPrice || 40;

            return (
              <div
                key={cat.id}
                id={`category-item-${cat.id}`}
                onClick={() => {
                  if (isUnlocked) {
                    soundManager.playClick();
                    onToggleCategory(cat.id);
                  } else {
                    onOpenShop();
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[95px] ${
                  !isUnlocked
                    ? 'bg-slate-800/40 border-slate-800 opacity-70 hover:opacity-100 hover:border-cyan-500/40'
                    : isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-['Cairo'] text-white">
                    {cat.label}
                  </span>
                  {isUnlocked ? (
                    isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-600" />
                    )
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[100px] text-[10px]">
                    {cat.placeholder.split(' ')[0]}
                  </span>
                  {!isUnlocked && (
                    <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                      <span>{price}</span>
                      <span>💎</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Recent Matches History & How to Play Collapsible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recent Matches */}
        <div 
          id="recent-matches-history"
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-white font-['Cairo'] flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>سجل آخر المباريات</span>
            </h4>
            <span className="text-xs text-slate-400">
              {recentMatches.length} مباريات مسجلة
            </span>
          </div>

          {recentMatches.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              لم تلعب أي مباراة بعد. اضغط على "مباراة سريعة" لبدء أول تحدٍ لك!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${m.isWin ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'}`} />
                    <div>
                      <p className="font-bold text-white">ضد: {m.opponentName}</p>
                      <p className="text-[10px] text-slate-400">{m.date}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold font-['Cairo'] text-white">
                      {m.playerScore} - {m.opponentScore}
                    </p>
                    <span className={`text-[11px] font-bold ${m.starsDelta >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {m.starsDelta > 0 ? `+${m.starsDelta}` : m.starsDelta} ⭐
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How to Play Rules */}
        <div 
          id="how-to-play-card"
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-white font-['Cairo'] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>قواعد اللعب والنقاط</span>
            </h4>
            <button
              id="toggle-rules-details-btn"
              onClick={() => setShowRules(!showRules)}
              className="text-xs text-cyan-400 hover:underline"
            >
              {showRules ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <div className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-emerald-400">⏱️ العداد:</span>
              <span>45 ثانية متزامنة لكل لاعب لتعبئة الخانات بالحرف المحدد.</span>
            </div>

            <div className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-amber-400">🛑 زر توقف:</span>
              <span>يتاح فقط بعد تعبئة جميع الخانات، ويوقف العداد فورًا للجميع.</span>
            </div>

            <div className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-cyan-400">🎯 النقاط:</span>
              <span>10 نقاط للكلمة الفريدة، 5 للمكررة مع الخصم، 0 لغير الصحيحة.</span>
            </div>

            {showRules && (
              <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <p>• <strong className="text-amber-300">الحروف النادرة (ذ، ظ، ض، ث، خ):</strong> تضاعف نقاط جميع الكلمات بتلك الجولة (×2)!</p>
                <p>• <strong className="text-indigo-300">ميزة الاعتراض:</strong> مهلة 15 ثانية بعد الجولة للاعتراض وتبرير الكلمات المشكوك فيها.</p>
                <p>• <strong className="text-emerald-300">نظام المباراة:</strong> Best of 3 جولات، صاحب أعلى مجموع نقاط يفوز بالرهان (40 ⭐).</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
