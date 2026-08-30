import React, { useState } from 'react';
import { 
  X, 
  Home, 
  Trophy, 
  ShoppingBag, 
  Users, 
  Tv, 
  BookOpen, 
  Sparkles, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Volume2, 
  VolumeX,
  Flame,
  Star,
  ChevronLeft,
  Calendar,
  Gift,
  Dices,
  Award,
  Vibrate,
  Trash2,
  Settings,
  Crown
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { checkSpinEligibility } from '../lib/luckySpin';
import { checkIsAdmin } from '../lib/adminAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onGoHome?: () => void;
  onOpenAdmin?: () => void;
  onOpenLeaderboard: () => void;
  onOpenDailyChallenge: () => void;
  onOpenTasks?: () => void;
  unclaimedTasksCount?: number;
  onOpenLuckySpin?: () => void;
  onOpenAchievements?: () => void;
  onOpenShop: (tab?: 'chests' | 'categories' | 'gems') => void;
  onOpenFriendChallenge: () => void;
  onOpenRewardedAd: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenRules: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  userProfile,
  onGoHome,
  onOpenAdmin,
  onOpenLeaderboard,
  onOpenDailyChallenge,
  onOpenTasks,
  unclaimedTasksCount = 0,
  onOpenLuckySpin,
  onOpenAchievements,
  onOpenShop,
  onOpenFriendChallenge,
  onOpenRewardedAd,
  onOpenAuth,
  onLogout,
  onOpenRules,
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
}) => {
  const [hapticsOn, setHapticsOn] = useState(haptics.isEnabled());
  const [soundOn, setSoundOn] = useState(!soundManager.getMuted());

  if (!isOpen) return null;

  const spinEligibility = checkSpinEligibility(userProfile);
  const hasFreeSpin = spinEligibility.canSpin;

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    haptics.setEnabled(next);
    if (next) haptics.tap();
  };

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setSoundOn(!muted);
    if (!muted) soundManager.playClick();
  };

  const winRate = userProfile && userProfile.stats.totalMatches > 0
    ? Math.round((userProfile.stats.wins / userProfile.stats.totalMatches) * 100)
    : 0;

  return (
    <div 
      id="sidebar-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        id="sidebar-drawer-content"
        className="fixed inset-y-0 right-0 max-w-xs w-full bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between text-right animate-in slide-in-from-right duration-200 z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl font-['Cairo'] shadow-md shadow-emerald-500/20">
                جـ
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white font-['Cairo']">
                  لعبة الجدول
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold">
                  القائمة الرئيسية
                </span>
              </div>
            </div>

            <button
              id="sidebar-close-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Mini Profile Card */}
          {userProfile && (
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={userProfile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.uid}`}
                  alt={userProfile.displayName}
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-emerald-500/30 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white font-['Cairo'] truncate">
                    {userProfile.displayName}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    أعلى سكور: <span className="text-amber-300 font-bold">{userProfile.stats.highestScore || 0}</span> نقطة
                  </p>
                </div>
              </div>

              {/* Currency & Stat Pills */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-900 px-2.5 py-1.5 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-amber-300 font-bold font-['Cairo']">⭐ النجوم</span>
                  <span className="text-xs font-black text-white font-['Cairo']">{userProfile.stars}</span>
                </div>
                <div className="bg-slate-900 px-2.5 py-1.5 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-cyan-300 font-bold font-['Cairo']">💎 الجواهر</span>
                  <span className="text-xs font-black text-white font-['Cairo']">{userProfile.gems}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-1">
            
            {/* Admin Panel (If user is Admin) */}
            {userProfile && checkIsAdmin(userProfile) && onOpenAdmin && (
              <button
                id="sidebar-nav-admin"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/30 via-slate-800 to-yellow-500/20 hover:from-amber-500/40 hover:to-yellow-500/30 border-2 border-amber-500/60 text-amber-300 transition-all group shadow-lg shadow-amber-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm font-['Cairo'] text-white group-hover:text-amber-200 block">
                        لوحة تحكم الآدمن
                      </span>
                      <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                        صلاحيات كاملة
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      إدارة اللاعبين، الغرف، والمعايير 👑
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Home / Lobby Navigation Item */}
            <button
              id="sidebar-nav-home"
              onClick={() => {
                soundManager.playClick();
                onClose();
                if (onGoHome) onGoHome();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <span className="font-black text-sm font-['Cairo'] text-white group-hover:text-emerald-200 block">
                    القائمة الرئيسية (اللوبي)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    العودة لصفحة البداية
                  </span>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            
            {/* Daily & Weekly Tasks Button */}
            {onOpenTasks && (
              <button
                id="sidebar-nav-tasks"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenTasks();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-800 to-amber-950/30 hover:from-indigo-900/60 hover:to-amber-900/40 border border-amber-500/40 text-amber-300 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm font-['Cairo'] text-white group-hover:text-amber-200 block">
                      المهام اليومية والأسبوعية
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      جوائز نجوم مجانية ⭐
                    </span>
                  </div>
                </div>
                {unclaimedTasksCount > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                    {unclaimedTasksCount}
                  </span>
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
                )}
              </button>
            )}

            {/* Daily Lucky Spin Button (HIGHLIGHTED) */}
            {onOpenLuckySpin && (
              <button
                id="sidebar-nav-lucky-spin"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenLuckySpin();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-800 to-fuchsia-500/10 hover:from-amber-500/30 hover:to-fuchsia-500/20 border border-amber-500/40 text-amber-300 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Dices className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm font-['Cairo'] text-white group-hover:text-amber-200 block">
                      عجلة الحظ اليومية
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      جوائز وجواهر مجانية 🎡
                    </span>
                  </div>
                </div>
                {hasFreeSpin ? (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse shadow-md">
                    متاحة الآن!
                  </span>
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
                )}
              </button>
            )}

            {/* Achievements Badges Button */}
            {onOpenAchievements && (
              <button
                id="sidebar-nav-achievements"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenAchievements();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-slate-300 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm font-['Cairo'] text-white">
                    أوسمة الإنجازات (Badges)
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            {/* Weekly 12-Letter Challenge (HIGHLIGHTED GOLD) */}
            <button
              id="sidebar-nav-daily-challenge"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenDailyChallenge();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-800 to-indigo-500/10 hover:from-amber-500/30 hover:to-indigo-500/20 border border-amber-500/40 text-amber-300 transition-all group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <span className="font-black text-sm font-['Cairo'] text-white group-hover:text-amber-200 block">
                    بطولة الأسبوع (12 حرفاً)
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold block">
                    منصة تتويج لـ 3 مراكز 🏆
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-500/40">
                12 حرفاً
              </span>
            </button>

            {/* Leaderboard Button */}
            <button
              id="sidebar-nav-leaderboard"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenLeaderboard();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm font-['Cairo'] text-white">
                  لوحة المتصدرين (Leaderboard)
                </span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Shop */}
            <button
              id="sidebar-nav-shop"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenShop('categories');
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-slate-300 hover:text-white transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm font-['Cairo']">
                  متجر الفئات والجواهر
                </span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Friend Challenge */}
            <button
              id="sidebar-nav-friend"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenFriendChallenge();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm font-['Cairo']">
                  تحدي صديق برمز الغرفة
                </span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Rewarded Ad - Marked 'قريباً' */}
            <button
              id="sidebar-nav-rewarded-ad"
              disabled={true}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-850/50 border border-slate-800 text-slate-400 opacity-80 cursor-not-allowed transition-all group"
              title="بوابة الإعلانات قيد التجهيز وستتوفر قريباً في تحديث متجر Google Play"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400/70 flex items-center justify-center">
                  <Tv className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm font-['Cairo'] text-slate-300 block">
                    بوابة الإعلانات والمكافآت
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold block">
                    نجوم وجواهر مجانية
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-amber-300 font-black bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                قريباً ⏳
              </span>
            </button>

            {/* Rules */}
            <button
              id="sidebar-nav-rules"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenRules();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm font-['Cairo']">
                  قواعد اللعبة والتسجيل
                </span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Settings & Privacy Section */}
            <div className="pt-3 pb-1 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[11px] font-black text-slate-400 font-['Cairo']">
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span>الإعدادات والخصوصية</span>
              </div>

              {/* Quick Settings Bar (Sound & Haptics) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="toggle-sound-btn"
                  onClick={toggleSound}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-colors ${
                    soundOn 
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundOn ? 'الصوت: مفعّل' : 'الصوت: مكتوم'}</span>
                </button>

                <button
                  id="toggle-haptics-btn"
                  onClick={toggleHaptics}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-colors ${
                    hapticsOn 
                      ? 'bg-slate-800 text-indigo-400 border-indigo-500/30' 
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <Vibrate className="w-4 h-4" />
                  <span>{hapticsOn ? 'الاهتزاز: مفعّل' : 'الاهتزاز: متوقف'}</span>
                </button>
              </div>

              {/* Privacy Policy */}
              {onOpenPrivacyPolicy && (
                <button
                  id="sidebar-nav-privacy-policy"
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenPrivacyPolicy();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/80 border border-slate-800/60 text-slate-300 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs font-['Cairo']">
                      سياسة الخصوصية وأمان البيانات
                    </span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}

              {/* Direct Delete Account button inside Settings for logged in users */}
              {userProfile && onOpenDeleteAccount && (
                <button
                  id="sidebar-nav-delete-account"
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenDeleteAccount();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:text-rose-200 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs font-['Cairo'] block text-rose-300">
                        حذف الحساب والبيانات
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        حذف نهائي وفوري لجميع البيانات
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

          </nav>
        </div>

        {/* Footer Section */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          {userProfile ? (
            <div className="space-y-1.5">
              <button
                id="sidebar-logout-btn"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onLogout();
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-bold font-['Cairo'] flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>

              {onOpenDeleteAccount && (
                <button
                  id="sidebar-delete-account-btn"
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenDeleteAccount();
                  }}
                  className="w-full py-1.5 px-3 rounded-xl hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 text-[11px] font-bold font-['Cairo'] flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الحساب والبيانات</span>
                </button>
              )}
            </div>
          ) : (
            <button
              id="sidebar-login-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenAuth();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black font-['Cairo'] flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}

          <p className="text-[10px] text-center text-slate-500 font-['Cairo'] pt-1">
            لعبة الجدول • الإصدار التنافسي المباشر
          </p>
        </div>

      </div>
    </div>
  );
};
