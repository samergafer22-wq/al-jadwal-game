import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Sparkles, 
  RotateCcw, 
  X, 
  Flame, 
  Star, 
  TrendingUp, 
  Award, 
  Zap,
  Users,
  Calendar,
  Clock,
  Home,
  ArrowRight
} from 'lucide-react';
import { UserProfile, DailyChallengeSubmission } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { soundManager } from '../lib/audio';
import { getDailyChallengeConfig, fetchDailyLeaderboard } from '../lib/dailyChallenge';

interface LeaderboardProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenQuickMatch?: () => void;
  onOpenDailyChallenge?: () => void;
  initialMode?: 'global' | 'daily';
}

type MainCategory = 'daily' | 'global';
type SortCriteria = 'highestScore' | 'wins' | 'stars';

export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentUser,
  onClose,
  onOpenQuickMatch,
  onOpenDailyChallenge,
  initialMode = 'daily',
}) => {
  const [mainMode, setMainMode] = useState<MainCategory>(initialMode);
  const [activeTab, setActiveTab] = useState<SortCriteria>('highestScore');
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [dailyPlayers, setDailyPlayers] = useState<DailyChallengeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dailyConfig = getDailyChallengeConfig();

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    setError(null);

    if (mainMode === 'daily') {
      try {
        const data = await fetchDailyLeaderboard(dailyConfig.dateKey, 20);
        setDailyPlayers(data);
      } catch (err: any) {
        console.error('Error fetching daily leaderboard:', err);
        setError('تعذر تحميل بيانات صدارة تحدي اليوم.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      // Global Leaderboard
      const usersRef = collection(db, 'users');
      let q;
      if (activeTab === 'highestScore') {
        q = query(usersRef, orderBy('stats.highestScore', 'desc'), limit(15));
      } else if (activeTab === 'wins') {
        q = query(usersRef, orderBy('stats.wins', 'desc'), limit(15));
      } else {
        q = query(usersRef, orderBy('stars', 'desc'), limit(15));
      }

      let fetchedPlayers: UserProfile[] = [];
      try {
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          fetchedPlayers.push(docSnap.data() as UserProfile);
        });
      } catch (queryErr) {
        console.warn('Firestore indexed query fallback, fetching all users:', queryErr);
        const snap = await getDocs(usersRef);
        snap.forEach((docSnap) => {
          fetchedPlayers.push(docSnap.data() as UserProfile);
        });
      }

      // Sort accurately based on activeTab
      fetchedPlayers.sort((a, b) => {
        if (activeTab === 'highestScore') {
          return (b.stats?.highestScore || 0) - (a.stats?.highestScore || 0);
        } else if (activeTab === 'wins') {
          return (b.stats?.wins || 0) - (a.stats?.wins || 0);
        } else {
          return (b.stars || 0) - (a.stars || 0);
        }
      });

      setPlayers(fetchedPlayers.slice(0, 15));
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError('تعذر تحميل بيانات المتصدرين حالياً. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [mainMode, activeTab]);

  // Determine current user rank
  const myRankIndex = currentUser 
    ? (mainMode === 'daily'
        ? dailyPlayers.findIndex((p) => p.uid === currentUser.uid)
        : players.findIndex((p) => p.uid === currentUser.uid))
    : -1;

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400">
          <Crown className="w-5 h-5 fill-slate-950" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 flex items-center justify-center font-black shadow-md ring-2 ring-slate-300">
          <Medal className="w-5 h-5 fill-slate-800" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 flex items-center justify-center font-black shadow-md ring-2 ring-amber-600/60">
          <Medal className="w-5 h-5 fill-amber-200" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-2xl bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center justify-center font-black text-sm font-['Cairo']">
        {index + 1}
      </div>
    );
  };

  return (
    <div 
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="leaderboard-modal-container"
        className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 text-right my-auto animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <Trophy className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white font-['Cairo'] tracking-wide">
                  لوحة الصدارة والمتصدرين
                </h2>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {mainMode === 'daily' ? 'تحدي اليوم 📅' : 'الترتيب العام 🏆'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {mainMode === 'daily' 
                  ? `أبطال تحدي اليوم الموحّد (${dailyConfig.formattedDateArabic})`
                  : 'أبرز أبطال لعبة الجدول بناءً على السجل التاريخي'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="leaderboard-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black font-['Cairo'] transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">القائمة الرئيسية</span>
            </button>

            <button
              id="refresh-leaderboard-btn"
              onClick={() => {
                soundManager.playClick();
                fetchLeaderboardData();
              }}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="تحديث البيانات"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              id="close-leaderboard-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Mode Tabs (Daily Challenge vs Global) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 relative z-10">
          <button
            id="tab-mode-daily"
            onClick={() => {
              soundManager.playClick();
              setMainMode('daily');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black font-['Cairo'] flex items-center justify-center gap-2 transition-all ${
              mainMode === 'daily'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>صدارة تحدي اليوم (Daily) ⭐</span>
          </button>

          <button
            id="tab-mode-global"
            onClick={() => {
              soundManager.playClick();
              setMainMode('global');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black font-['Cairo'] flex items-center justify-center gap-2 transition-all ${
              mainMode === 'global'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>لوحة الشرف العامة (All-Time)</span>
          </button>
        </div>

        {/* Global Sub-Tab Filters (Only for Global Mode) */}
        {mainMode === 'global' && (
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 relative z-10">
            <button
              id="tab-highest-score"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('highestScore');
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'highestScore'
                  ? 'bg-emerald-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>أعلى سكور</span>
            </button>

            <button
              id="tab-wins"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('wins');
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'wins'
                  ? 'bg-emerald-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>الأكثر فوزاً</span>
            </button>

            <button
              id="tab-stars"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('stars');
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'stars'
                  ? 'bg-emerald-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>النجوم</span>
            </button>
          </div>
        )}

        {/* Daily Challenge Info Banner (When in Daily Mode) */}
        {mainMode === 'daily' && (
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between relative z-10 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm font-['Cairo']">
                {dailyConfig.letter}
              </span>
              <div>
                <span className="font-bold text-white block">
                  حرف اليوم: ({dailyConfig.letter}) - {dailyConfig.letterName}
                </span>
                <span className="text-[10px] text-slate-400">
                  جميع اللاعبين خاضوا نفس الحرف والفئات
                </span>
              </div>
            </div>

            {onOpenDailyChallenge && (
              <button
                id="leaderboard-play-daily-btn"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenDailyChallenge();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs font-['Cairo'] shadow transition-all flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>العب تحدي اليوم 🌟</span>
              </button>
            )}
          </div>
        )}

        {/* Leaderboard List Content */}
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-spin">
                <RotateCcw className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 font-['Cairo'] font-bold">
                جاري جلب قائمة المتصدرين من قاعدة البيانات...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-center space-y-2">
              <p className="text-xs text-rose-300 font-bold">{error}</p>
              <button
                onClick={fetchLeaderboardData}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold font-['Cairo']"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : mainMode === 'daily' ? (
            dailyPlayers.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300 font-['Cairo']">
                  لم يسجل أي لاعب في تحدي اليوم حتى الآن
                </p>
                <p className="text-xs text-slate-400">
                  كن أول بطل يشارك في تحدي اليوم ويتصدر القائمة!
                </p>
                {onOpenDailyChallenge && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onClose();
                      onOpenDailyChallenge();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs font-['Cairo'] shadow-md"
                  >
                    ابدأ تحدي اليوم الآن 🌟
                  </button>
                )}
              </div>
            ) : (
              dailyPlayers.map((player, index) => {
                const isMe = currentUser?.uid === player.uid;
                return (
                  <div
                    key={player.uid || index}
                    id={`daily-leaderboard-rank-${index + 1}`}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-emerald-950/60 border-emerald-400/80 shadow-lg ring-1 ring-emerald-400/40'
                        : index === 0
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getRankBadge(index)}

                      <img
                        src={player.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                        alt={player.displayName}
                        className="w-10 h-10 rounded-xl bg-slate-800 object-cover border border-slate-700"
                      />

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white font-['Cairo']">
                            {player.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                              أنت
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-['Cairo']">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>أنجزه في {player.timeTakenSeconds} ثانية</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-lg sm:text-xl font-black text-amber-300 font-['Cairo']">
                          {player.score}
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold font-['Cairo']">نقطة</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-['Cairo']">سكور تحدي اليوم</span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            players.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-slate-950/50 rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300 font-['Cairo']">
                  لا توجد سجلات مسجلة حتى الآن
                </p>
              </div>
            ) : (
              players.map((player, index) => {
                const isMe = currentUser?.uid === player.uid;
                const highestScore = player.stats?.highestScore || 0;
                const wins = player.stats?.wins || 0;
                const totalMatches = player.stats?.totalMatches || 0;
                const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

                return (
                  <div
                    key={player.uid || index}
                    id={`leaderboard-item-${index + 1}`}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-emerald-950/60 border-emerald-400/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                        : index === 0
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-md'
                        : index === 1
                        ? 'bg-gradient-to-r from-slate-800/60 via-slate-900 to-slate-800/40 border-slate-400/40'
                        : index === 2
                        ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/10 border-amber-700/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getRankBadge(index)}

                      <div className="relative">
                        <img
                          src={player.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                          alt={player.displayName}
                          className={`w-10 h-10 rounded-xl bg-slate-800 object-cover border ${
                            index === 0
                              ? 'border-amber-400 ring-2 ring-amber-400/30'
                              : isMe
                              ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                              : 'border-slate-700'
                          }`}
                        />
                        {index === 0 && (
                          <span className="absolute -top-1.5 -right-1 text-xs">👑</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white font-['Cairo'] tracking-wide">
                            {player.displayName || 'لاعب'}
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                              أنت
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{wins} فوز</span>
                          <span>•</span>
                          <span>{winRate}% فوز</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      {activeTab === 'highestScore' && (
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-lg sm:text-xl font-black text-amber-300 font-['Cairo']">
                              {highestScore}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold font-['Cairo']">نقطة</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">أعلى سكور جولة</span>
                        </div>
                      )}

                      {activeTab === 'wins' && (
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-lg sm:text-xl font-black text-rose-300 font-['Cairo']">
                              {wins}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold font-['Cairo']">انتصار</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">من {totalMatches} مباريات</span>
                        </div>
                      )}

                      {activeTab === 'stars' && (
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-sm">⭐</span>
                            <span className="text-lg sm:text-xl font-black text-amber-400 font-['Cairo']">
                              {player.stars || 0}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">رصيد النجوم</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer: User Status & Motivation */}
        {currentUser && (
          <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 font-['Cairo']">
                    {mainMode === 'daily' ? 'حالتك في تحدي اليوم:' : 'أعلى سكور تاريخي لك:'}
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-['Cairo']">
                    {mainMode === 'daily' 
                      ? (myRankIndex >= 0 ? `#${myRankIndex + 1} في الترتيب` : 'لم تشارك بعد اليوم')
                      : `${currentUser.stats?.highestScore || 0} نقطة`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {myRankIndex >= 0 
                    ? `أنت في الترتيب #${myRankIndex + 1} بين المتصدرين! 🏆`
                    : (mainMode === 'daily' ? 'خض تحدي اليوم لتنضم لقائمة الشرف اليومية!' : 'حقق سكور أعلى في مبارياتك لتصل إلى قائمة المتصدرين!')}
                </p>
              </div>
            </div>

            {mainMode === 'daily' ? (
              onOpenDailyChallenge && (
                <button
                  id="leaderboard-footer-daily-btn"
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenDailyChallenge();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black font-['Cairo'] shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>خوض التحدي 🌟</span>
                </button>
              )
            ) : (
              onOpenQuickMatch && (
                <button
                  id="leaderboard-quick-play-btn"
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenQuickMatch();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black font-['Cairo'] shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>العب الآن للتصدر</span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
