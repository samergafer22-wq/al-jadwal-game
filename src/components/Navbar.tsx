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
  onOpenShop: () => void;
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

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Logo & Sidebar Toggle & Home Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="open-sidebar-menu-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenSidebar();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center"
            title="فتح القائمة الجانبية"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Home / Lobby Quick Button */}
          {onGoHome && (
            <button
              id="navbar-go-home-btn"
              onClick={handleHomeClick}
              className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                !isInGame
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500/40'
              }`}
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black font-['Cairo'] hidden md:inline">
                الرئيسية
              </span>
            </button>
          )}

          <div 
            className="flex items-center gap-2.5 cursor-pointer group" 
            onClick={handleHomeClick}
            title="العودة للقائمة الرئيسية"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-extrabold text-2xl font-['Cairo'] group-hover:scale-105 transition-transform">
              جـ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xl font-['Cairo'] text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                  الجدول
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                  تحدي مباشر
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                تحدي الكلمات العربية اللحظي
              </p>
            </div>
          </div>
        </div>

        {/* Wallets & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Tasks Button */}
          {onOpenTasks && (
            <button
              id="navbar-tasks-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenTasks();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/40 via-slate-800 to-indigo-950/40 hover:from-amber-900/60 hover:to-indigo-900/50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 transition-all shadow-sm group relative"
              title="مهام الجدول اليومية والأسبوعية"
            >
              <Gift className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black font-['Cairo'] hidden sm:inline text-white group-hover:text-amber-200">
                المهام
              </span>
              {unclaimedTasksCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                  {unclaimedTasksCount}
                </span>
              )}
            </button>
          )}

          {/* Quick Daily Challenge Button */}
          {onOpenDailyChallenge && (
            <button
              id="navbar-daily-challenge-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenDailyChallenge();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 transition-all shadow-sm group"
              title="تحدي اليوم الموحّد لجميع اللاعبين"
            >
              <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black font-['Cairo'] text-white group-hover:text-amber-200">
                تحدي اليوم
              </span>
              <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1 py-0.2 rounded-full hidden sm:inline">
                +30 ⭐
              </span>
            </button>
          )}

          {/* Quick Leaderboard Button in Navbar */}
          <button
            id="navbar-leaderboard-btn"
            onClick={() => {
              soundManager.playClick();
              onOpenLeaderboard();
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/40 to-slate-800 hover:from-amber-900/60 hover:to-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 transition-all shadow-sm group"
            title="لوحة المتصدرين"
          >
            <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black font-['Cairo'] hidden sm:inline text-white group-hover:text-amber-200">
              المتصدرون
            </span>
          </button>

          {/* Challenge Stars (Free Currency) */}
          <div 
            id="stars-wallet-badge"
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer group"
            onClick={onOpenRewardedAd}
            title="نجوم التحدي: عملة مجانية للمراهنة في المباريات. اضغط للحصول على المزيد!"
          >
            <span className="text-lg animate-bounce">⭐</span>
            <div className="text-right">
              <span className="text-xs text-amber-300/80 block leading-tight font-medium">النجوم</span>
              <span className="text-sm font-black text-amber-400 font-['Cairo']">
                {userProfile?.stars ?? 100}
              </span>
            </div>
            <button
              id="claim-ad-quick-btn"
              className="mr-1 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 text-[11px] font-bold px-1.5 py-0.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Tv className="w-3 h-3" />
              <span className="hidden md:inline">+20</span>
            </button>
          </div>

          {/* Gems (Purchased Currency) */}
          <div 
            id="gems-wallet-badge"
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition-all cursor-pointer group"
            onClick={onOpenShop}
            title="الجواهر: عملة مدفوعة لفتح فئات إضافية ومظاهر، غير قابلة للمراهنة"
          >
            <span className="text-lg">💎</span>
            <div className="text-right">
              <span className="text-xs text-cyan-300/80 block leading-tight font-medium">الجواهر</span>
              <span className="text-sm font-black text-cyan-400 font-['Cairo']">
                {userProfile?.gems ?? 0}
              </span>
            </div>
            <button
              id="open-shop-quick-btn"
              className="mr-1 bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 text-[11px] font-bold px-1.5 py-0.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-3 h-3" />
              <span className="hidden md:inline">متجر</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Admin Dashboard Button (Only for Admins) */}
          {userProfile && checkIsAdmin(userProfile) && onOpenAdmin && (
            <button
              id="navbar-admin-btn"
              onClick={() => {
                soundManager.playClick();
                onOpenAdmin();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/30 via-slate-800 to-amber-500/20 hover:from-amber-500/50 hover:to-amber-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/60 text-amber-300 transition-all shadow-md group animate-pulse"
              title="لوحة تحكم الآدمن"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black font-['Cairo'] text-amber-300">
                لوحة الآدمن
              </span>
            </button>
          )}

          {/* User Profile / Auth */}
          {userProfile ? (
            <div className="relative">
              <button
                id="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                <img
                  src={userProfile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.uid}`}
                  alt={userProfile.displayName}
                  className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 object-cover"
                />
                <span className="text-xs font-bold text-slate-200 hidden sm:inline max-w-[90px] truncate">
                  {userProfile.displayName}
                </span>
                {checkIsAdmin(userProfile) && (
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
                      <p className="text-xs font-bold text-white truncate">{userProfile.displayName}</p>
                      {checkIsAdmin(userProfile) && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                          آدمن
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      أعلى نتيجة: <span className="text-amber-300 font-bold">{userProfile.stats.highestScore || 0}</span> نقطة
                    </p>
                  </div>

                  {checkIsAdmin(userProfile) && onOpenAdmin && (
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
                    onClick={onOpenShop}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <span>متجر الفئات والجواهر</span>
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    id="menu-reward-btn"
                    onClick={onOpenRewardedAd}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <span>نجوم مجانية (إعلان مكافأة)</span>
                    <Tv className="w-4 h-4 text-amber-400" />
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
          ) : (
            <button
              id="navbar-login-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md shadow-emerald-600/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

