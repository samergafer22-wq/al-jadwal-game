import React, { useState } from 'react';
import { 
  Sparkles, 
  Coins, 
  Volume2, 
  VolumeX, 
  Tv, 
  ShoppingBag, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  Crown,
  Trophy,
  Menu,
  Calendar,
  Gift,
  Home,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { checkIsAdmin } from '../lib/adminAuth';

interface NavbarProps {
  userProfile: UserProfile | null;
  onOpenShop: (tab?: 'chests' | 'avatars' | 'categories' | 'gems') => void;
  onOpenRewardedAd: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenLeaderboard: () => void;
  onOpenDailyChallenge?: () => void;
  onOpenTasks?: () => void;
  unclaimedTasksCount?: number;
  onOpenSidebar: () => void;
  onGoHome?: () => void;
  onOpenAdmin?: () => void;
  isInGame?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  onOpenShop,
  onOpenRewardedAd,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
  onOpenDailyChallenge,
  onOpenTasks,
  unclaimedTasksCount = 0,
  onOpenSidebar,
  onGoHome,
  onOpenAdmin,
  isInGame = false,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    soundManager.playClick();
  };

  const handleHomeClick = () => {
    soundManager.playClick();
    if (onGoHome) {
      onGoHome();
    }
  };

  const isGuest = !userProfile || userProfile.isAnonymous || !userProfile.email;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 w-full max-w-full overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2">
        
        {/* Brand / Logo & Sidebar Toggle & Home Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            id="open-sidebar-menu-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenSidebar();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center"
            title="فتح القائمة الجانبية"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </button>

          {/* Home / Lobby Quick Button */}
          {onGoHome && (
            <button
              id="navbar-go-home-btn"
              onClick={handleHomeClick}
              className={`p-1.5 sm:p-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                !isInGame
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500/40'
              }`}
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black font-['Cairo'] hidden lg:inline">
                الرئيسية
              </span>
            </button>
          )}

          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={handleHomeClick}
            title="العودة للقائمة الرئيسية"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-lg sm:text-xl font-['Cairo'] group-hover:scale-105 transition-transform">
              جـ
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-extrabold text-base sm:text-lg font-['Cairo'] text-white tracking-wide group-hover:text-emerald-300 transition-colors leading-tight">
                  الجدول
                </h1>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1 py-0.2 rounded-full border border-emerald-500/30 hidden xs:inline">
                  مباشر
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallets & Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Quick Tasks Button (Desktop / Tablet) */}
          {onOpenTasks && (
            <button
              id="navbar-tasks-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenTasks();
              }}
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-amber-950/40 via-slate-800 to-indigo-950/40 hover:from-amber-900/60 hover:to-indigo-900/50 px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 transition-all shadow-sm group relative"
              title="مهام الجدول اليومية والأسبوعية"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black font-['Cairo'] text-white group-hover:text-amber-200">
                المهام
              </span>
              {unclaimedTasksCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
                  {unclaimedTasksCount}
                </span>
              )}
            </button>
          )}

          {/* Quick Daily Challenge Button (Desktop) */}
          {onOpenDailyChallenge && (
            <button
              id="navbar-daily-challenge-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenDailyChallenge();
              }}
              className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 transition-all shadow-sm group"
              title="بطولة الـ 12 حرفاً الأسبوعية"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black font-['Cairo'] text-white group-hover:text-amber-200">
                12 حرفاً
              </span>
            </button>
          )}

          {/* Challenge Stars (Free Currency) */}
          <div 
            id="stars-wallet-badge"
            className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-800 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer group"
            onClick={onOpenRewardedAd}
            title="نجوم التحدي: عملة مجانية للمراهنة في المباريات. اضغط للحصول على المزيد!"
          >
            <span className="text-sm sm:text-base animate-bounce">⭐</span>
            <span className="text-xs sm:text-sm font-black text-amber-400 font-['Cairo']">
              {userProfile?.stars ?? 100}
            </span>
          </div>

          {/* Gems (Purchased Currency) with prominent Recharge button */}
          <button 
            id="gems-wallet-badge"
            onClick={() => {
              soundManager.playClick();
              onOpenShop('gems');
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/70 via-slate-800 to-slate-800 hover:from-cyan-900/90 hover:to-slate-700 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer group shadow-sm"
            title="متجر الجواهر: اضغط لشحن الرصيد وشراء الباقات 💎"
          >
            <span className="text-sm sm:text-base group-hover:scale-110 transition-transform">💎</span>
            <span className="text-xs sm:text-sm font-black text-cyan-300 font-['Cairo']">
              {userProfile?.gems ?? 0}
            </span>
            <span className="w-4 h-4 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-black flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors">
              +
            </span>
          </button>

          {/* Admin Dashboard Button (Only for Admins) */}
          {userProfile && checkIsAdmin(userProfile) && onOpenAdmin && (
            <button
              id="navbar-admin-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenAdmin();
              }}
              className="hidden sm:flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-1.5 rounded-xl border border-amber-500/60 text-amber-300 transition-all shadow-md group animate-pulse"
              title="لوحة تحكم الآدمن"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-black font-['Cairo'] text-amber-300">
                آدمن
              </span>
            </button>
          )}

          {/* User Profile / Auth */}
          {isGuest ? (
            <button
              id="navbar-login-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenAuth();
              }}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black font-['Cairo'] px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
              title="تسجيل الدخول أو إنشاء حساب بالبريد الإلكتروني"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>دخول / حساب</span>
            </button>
          ) : (
            <div className="relative">
              <button
                id="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 p-1 pl-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                <div className="relative">
                  <img
                    src={userProfile?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile?.uid}`}
                    alt={userProfile?.displayName || 'User'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-700 border border-slate-600 object-cover"
                  />
                  {userProfile?.selectedAvatar && (
                    <span 
                      className="absolute -bottom-1.5 -right-1.5 text-[9px] sm:text-[10px] bg-slate-900 border border-amber-500/40 rounded-full px-0.5 shadow leading-none"
                    >
                      {userProfile.selectedAvatar === 'avatar_crown' ? '👑' :
                       userProfile.selectedAvatar === 'avatar_falcon' ? '🦅' :
                       userProfile.selectedAvatar === 'avatar_diamond' ? '💎' :
                       userProfile.selectedAvatar === 'avatar_flame' ? '🔥' :
                       userProfile.selectedAvatar === 'avatar_lion' ? '🦁' : '👑'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-200 hidden sm:inline max-w-[80px] truncate">
                  {userProfile?.displayName}
                </span>
                {userProfile && checkIsAdmin(userProfile) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div 
                  id="user-dropdown-menu"
                  className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-right animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-700/60 mb-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate">{userProfile?.displayName}</p>
                      {userProfile && checkIsAdmin(userProfile) && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                          آدمن
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {userProfile?.email || 'حساب مسجل'}
                    </p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      أعلى نتيجة: <span className="text-amber-300 font-bold">{userProfile?.stats.highestScore || 0}</span> نقطة
                    </p>
                  </div>

                  {userProfile && checkIsAdmin(userProfile) && onOpenAdmin && (
                    <button
                      id="menu-admin-panel-btn"
                      onClick={onOpenAdmin}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-colors mb-1 border border-amber-500/30"
                    >
                      <span>لوحة تحكم الآدمن الشاملة</span>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                    </button>
                  )}

                  <button
                    id="menu-leaderboard-btn"
                    onClick={onOpenLeaderboard}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-300 hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <span>لوحة المتصدرين (Top 10)</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </button>
                  
                  <button
                    id="menu-shop-btn"
                    onClick={() => onOpenShop('categories')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <span>متجر الفئات والجواهر</span>
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    id="menu-logout-btn"
                    onClick={onLogout}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-1"
                  >
                    <span>تسجيل الخروج</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

