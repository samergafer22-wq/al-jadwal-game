import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  Zap, 
  Settings, 
  Trophy, 
  Megaphone, 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Crown, 
  Star, 
  Sparkles, 
  Clock, 
  Sliders, 
  UserCheck, 
  Unlock, 
  Lock, 
  AlertTriangle,
  X,
  Radio,
  Flame,
  Check,
  ChevronRight,
  UserX,
  Swords,
  Coins
} from 'lucide-react';
import { 
  UserProfile, 
  MatchData, 
  AdminSystemConfig, 
  GlobalAnnouncement, 
  WordBankOverrideItem 
} from '../types';
import { 
  PRIMARY_ADMIN_EMAIL,
  fetchAllUsers, 
  adminUpdateUser, 
  adminUnlockAllCategoriesForUser, 
  grantSuperAdminResources, 
  fetchAdminMatches, 
  adminForceMatchStatus, 
  adminDeleteMatch, 
  getAdminSystemConfig, 
  saveAdminSystemConfig, 
  fetchAnnouncements, 
  saveAnnouncement, 
  deleteAnnouncement, 
  fetchWordBankOverrides, 
  saveWordBankOverride, 
  deleteWordBankOverride 
} from '../lib/adminAuth';
import { EXTRA_CATEGORIES, STANDARD_CATEGORIES } from '../data/categories';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onRefreshProfile?: () => void;
}

type AdminTab = 'players' | 'matches' | 'system' | 'broadcast' | 'wordbank';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  onRefreshProfile,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('players');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Players Management state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [starsDelta, setStarsDelta] = useState<number>(500);
  const [gemsDelta, setGemsDelta] = useState<number>(100);
  const [hintsDelta, setHintsDelta] = useState<number>(10);

  // Matches State
  const [matchesList, setMatchesList] = useState<MatchData[]>([]);

  // System Config State
  const [sysConfig, setSysConfig] = useState<AdminSystemConfig>({
    roundDuration: 45,
    defaultStars: 100,
    maintenanceMode: false,
    doubleStarsActive: false,
    freeGemsEvent: false,
  });

  // Announcements State
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<'info' | 'success' | 'warning' | 'promo'>('info');

  // Word Bank State
  const [wordOverrides, setWordOverrides] = useState<WordBankOverrideItem[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [newWordCategory, setNewWordCategory] = useState('name');
  const [newWordAccepted, setNewWordAccepted] = useState(true);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Initial Data Fetch
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'players') {
        const users = await fetchAllUsers(100);
        setUsersList(users);
      } else if (activeTab === 'matches') {
        const matches = await fetchAdminMatches(40);
        setMatchesList(matches);
      } else if (activeTab === 'system') {
        const cfg = await getAdminSystemConfig();
        setSysConfig(cfg);
      } else if (activeTab === 'broadcast') {
        const ann = await fetchAnnouncements();
        setAnnouncements(ann);
      } else if (activeTab === 'wordbank') {
        const words = await fetchWordBankOverrides();
        setWordOverrides(words);
      }
    } catch (err) {
      console.error('Error loading admin tab data:', err);
      showToast('تعذر تحميل بعض البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Self Boost Action
  const handleSuperAdminBoost = async () => {
    if (!currentUserProfile?.uid) return;
    soundManager.playClick();
    haptics.heavy();
    setLoading(true);
    try {
      await grantSuperAdminResources(currentUserProfile.uid);
      showToast('⚡ تم شحن حسابك الأسطوري بنجاح (99,999 ⭐ + 9,999 💎 + فتح كل الفئات!)', 'success');
      if (onRefreshProfile) {
        onRefreshProfile();
      }
    } catch (err) {
      console.error('Super boost failed:', err);
      showToast('حدث خطأ أثناء الشحن الفوري', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Player Modifiers
  const handleModifyStars = async (user: UserProfile, delta: number) => {
    try {
      const newStars = Math.max(0, (user.stars || 0) + delta);
      await adminUpdateUser(user.uid, { stars: newStars });
      showToast(`تم تعديل نجوم ${user.displayName} إلى ${newStars} ⭐`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, stars: newStars } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, stars: newStars });
    } catch (err) {
      showToast('فشل تعديل النجوم', 'error');
    }
  };

  const handleModifyGems = async (user: UserProfile, delta: number) => {
    try {
      const newGems = Math.max(0, (user.gems || 0) + delta);
      await adminUpdateUser(user.uid, { gems: newGems });
      showToast(`تم تعديل جواهر ${user.displayName} إلى ${newGems} 💎`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, gems: newGems } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, gems: newGems });
    } catch (err) {
      showToast('فشل تعديل الجواهر', 'error');
    }
  };

  const handleModifyHints = async (user: UserProfile, delta: number) => {
    try {
      const newHints = Math.max(0, (user.hints || 3) + delta);
      await adminUpdateUser(user.uid, { hints: newHints });
      showToast(`تم تعديل تلميحات ${user.displayName} إلى ${newHints} 💡`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, hints: newHints } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, hints: newHints });
    } catch (err) {
      showToast('فشل تعديل التلميحات', 'error');
    }
  };

  const handleUnlockAllForUser = async (user: UserProfile) => {
    try {
      await adminUnlockAllCategoriesForUser(user.uid);
      const allCategoryIds = [
        'name', 'animal', 'plant', 'inanimate', 'country',
        ...EXTRA_CATEGORIES.map(c => c.id)
      ];
      showToast(`تم فتح جميع الفئات بنجاح للمستخدم ${user.displayName} 🔓`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, unlockedCategories: allCategoryIds } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, unlockedCategories: allCategoryIds });
    } catch (err) {
      showToast('فشل فتح الفئات', 'error');
    }
  };

  const handleToggleAdminRole = async (user: UserProfile) => {
    const isCurrentlyAdmin = user.role === 'admin' || user.isAdmin === true;
    const newRole = isCurrentlyAdmin ? 'player' : 'admin';
    try {
      await adminUpdateUser(user.uid, { role: newRole, isAdmin: !isCurrentlyAdmin });
      showToast(`تم ${!isCurrentlyAdmin ? 'ترقية' : 'تخفيض'} رتبة ${user.displayName} بنجاح`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole, isAdmin: !isCurrentlyAdmin } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, role: newRole, isAdmin: !isCurrentlyAdmin });
    } catch (err) {
      showToast('فشل تغيير الرتبة', 'error');
    }
  };

  const handleToggleBan = async (user: UserProfile) => {
    const newBanned = !user.isBanned;
    try {
      await adminUpdateUser(user.uid, { isBanned: newBanned });
      showToast(`تم ${newBanned ? 'حظر' : 'إلغاء حظر'} حساب ${user.displayName}`);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, isBanned: newBanned } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, isBanned: newBanned });
    } catch (err) {
      showToast('فشل تعديل حالة الحظر', 'error');
    }
  };

  const handleResetPlayerStats = async (user: UserProfile) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في تصفير إحصائيات اللاعب ${user.displayName}؟`)) return;
    try {
      await adminUpdateUser(user.uid, { resetStats: true });
      showToast(`تم تصفير إحصائيات ${user.displayName} بنجاح`);
      const zeroStats = {
        wins: 0,
        losses: 0,
        totalMatches: 0,
        roundsWon: 0,
        highestScore: 0,
      };
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, stats: zeroStats } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser({ ...selectedUser, stats: zeroStats });
    } catch (err) {
      showToast('فشل تصفير الإحصائيات', 'error');
    }
  };

  // Match Actions
  const handleForceFinishMatch = async (matchId: string, winnerId?: string) => {
    try {
      await adminForceMatchStatus(matchId, 'match_end', winnerId);
      showToast('تم إنهاء المباراة يدوياً');
      loadAllData();
    } catch {
      showToast('فشل إنهاء المباراة', 'error');
    }
  };

  const handleForceCancelMatch = async (matchId: string) => {
    try {
      await adminForceMatchStatus(matchId, 'cancelled');
      showToast('تم إلغاء المباراة');
      loadAllData();
    } catch {
      showToast('فشل إلغاء المباراة', 'error');
    }
  };

  const handleDeleteMatchDoc = async (matchId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف وثيقة هذه المباراة نهائياً؟')) return;
    try {
      await adminDeleteMatch(matchId);
      showToast('تم حذف المباراة بنجاح');
      setMatchesList(prev => prev.filter(m => m.id !== matchId));
    } catch {
      showToast('فشل حذف المباراة', 'error');
    }
  };

  // System Config Actions
  const handleSaveSystemConfig = async () => {
    if (!currentUserProfile?.uid) return;
    setLoading(true);
    try {
      await saveAdminSystemConfig(sysConfig, currentUserProfile.uid);
      showToast('تم حفظ إعدادات النظام بنجاح ⚙️');
    } catch {
      showToast('فشل حفظ إعدادات النظام', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Announcement Actions
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementText.trim()) return;
    try {
      const item: GlobalAnnouncement = {
        id: `ann_${Date.now()}`,
        message: newAnnouncementText.trim(),
        type: newAnnouncementType,
        isActive: true,
        createdAt: Date.now(),
      };
      await saveAnnouncement(item);
      setAnnouncements(prev => [item, ...prev]);
      setNewAnnouncementText('');
      showToast('تم نشر الإعلان العام بنجاح 📢');
    } catch {
      showToast('فشل نشر الإعلان', 'error');
    }
  };

  const handleToggleAnnouncementActive = async (ann: GlobalAnnouncement) => {
    try {
      const updated = { ...ann, isActive: !ann.isActive };
      await saveAnnouncement(updated);
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? updated : a));
      showToast('تم تحديث حالة الإعلان');
    } catch {
      showToast('فشل تحديث الإعلان', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showToast('تم حذف الإعلان');
    } catch {
      showToast('فشل حذف الإعلان', 'error');
    }
  };

  // Word Overrides Actions
  const handleAddWordOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWordInput.trim();
    if (!word) return;
    try {
      const item: WordBankOverrideItem = {
        id: `word_${newWordCategory}_${encodeURIComponent(word)}`,
        word: word,
        normalizedWord: word.toLowerCase(),
        categoryId: newWordCategory,
        isAccepted: newWordAccepted,
        addedBy: currentUserProfile?.email || PRIMARY_ADMIN_EMAIL,
        addedAt: Date.now(),
      };
      await saveWordBankOverride(item);
      setWordOverrides(prev => [item, ...prev]);
      setNewWordInput('');
      showToast(`تم ${newWordAccepted ? 'إضافة كلمة مقبولة' : 'حظر كلمة'} بنجاح 📖`);
    } catch {
      showToast('فشل إضافة الكلمة', 'error');
    }
  };

  const handleDeleteWordOverride = async (id: string) => {
    try {
      await deleteWordBankOverride(id);
      setWordOverrides(prev => prev.filter(w => w.id !== id));
      showToast('تم حذف الكلمة من القائمة المخصصة');
    } catch {
      showToast('فشل حذف الكلمة', 'error');
    }
  };

  if (!isOpen) return null;

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q))
    );
  });

  const allCategories = [...STANDARD_CATEGORIES, ...EXTRA_CATEGORIES];

  return (
    <div 
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="admin-panel-card"
        className="relative w-full max-w-5xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right font-['Cairo'] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 p-4 sm:p-5 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  لوحة تحكم الآدمن الشاملة
                </h2>
                <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Crown className="w-3.5 h-3.5" />
                  مدير النظام
                </span>
              </div>
              <p className="text-xs text-amber-200/80 flex items-center gap-1.5 mt-0.5">
                <span>الحساب الرئيسي المرتبط:</span>
                <span className="font-mono bg-slate-800/90 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 text-[11px]">
                  {PRIMARY_ADMIN_EMAIL}
                </span>
              </p>
            </div>
          </div>

          {/* Super Power Action & Close Button */}
          <div className="flex items-center gap-2">
            <button
              id="admin-super-boost-btn"
              onClick={handleSuperAdminBoost}
              disabled={loading}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              title="شحن فوري: 99,999 ⭐ + 9,999 💎 + فتح جميع الفئات"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span className="hidden sm:inline">شحن حسابي الأسطوري</span>
              <span className="sm:hidden">شحن أسطوري</span>
            </button>

            <button
              id="admin-refresh-data-btn"
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              id="admin-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between border-b ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
          }`}>
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          <button
            id="tab-players-btn"
            onClick={() => { soundManager.playClick(); setActiveTab('players'); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'players'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة اللاعبين</span>
            <span className="text-[10px] bg-slate-900/40 px-1.5 py-0.2 rounded-full">
              {usersList.length}
            </span>
          </button>

          <button
            id="tab-matches-btn"
            onClick={() => { soundManager.playClick(); setActiveTab('matches'); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>مراقبة الغرف والمباريات</span>
            <span className="text-[10px] bg-slate-900/40 px-1.5 py-0.2 rounded-full">
              {matchesList.length}
            </span>
          </button>

          <button
            id="tab-system-btn"
            onClick={() => { soundManager.playClick(); setActiveTab('system'); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>إعدادات النظام واللعبة</span>
          </button>

          <button
            id="tab-broadcast-btn"
            onClick={() => { soundManager.playClick(); setActiveTab('broadcast'); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>شريط الإعلانات العامة</span>
          </button>

          <button
            id="tab-wordbank-btn"
            onClick={() => { soundManager.playClick(); setActiveTab('wordbank'); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'wordbank'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>معجم الكلمات المخصص</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: PLAYERS MANAGEMENT */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، البريد أو المعرف..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>

                <div className="text-xs text-slate-400">
                  إجمالي الحسابات المسجلة: <span className="text-amber-400 font-bold">{usersList.length}</span> لاعب
                </div>
              </div>

              {/* Selected User Quick Action Panel (Modal/Drawer inside) */}
              {selectedUser && (
                <div className="bg-slate-950/90 border-2 border-amber-500/40 p-4 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.uid}`}
                        alt={selectedUser.displayName}
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-white">{selectedUser.displayName}</h3>
                          {(selectedUser.role === 'admin' || selectedUser.isAdmin) && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              آدمن
                            </span>
                          )}
                          {selectedUser.isBanned && (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              محظور
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">UID: {selectedUser.uid}</p>
                        {selectedUser.email && (
                          <p className="text-[11px] text-amber-300/80 font-mono">{selectedUser.email}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Player Quick Modifiers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Stars modifier */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-300 font-bold">⭐ النجوم</span>
                        <span className="text-sm font-black text-white">{selectedUser.stars || 0}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleModifyStars(selectedUser, 100)}
                          className="flex-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => handleModifyStars(selectedUser, 500)}
                          className="flex-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +500
                        </button>
                        <button
                          onClick={() => handleModifyStars(selectedUser, -100)}
                          className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          -100
                        </button>
                      </div>
                    </div>

                    {/* Gems modifier */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-cyan-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cyan-300 font-bold">💎 الجواهر</span>
                        <span className="text-sm font-black text-white">{selectedUser.gems || 0}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleModifyGems(selectedUser, 50)}
                          className="flex-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +50
                        </button>
                        <button
                          onClick={() => handleModifyGems(selectedUser, 200)}
                          className="flex-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +200
                        </button>
                        <button
                          onClick={() => handleModifyGems(selectedUser, -50)}
                          className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          -50
                        </button>
                      </div>
                    </div>

                    {/* Hints modifier */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-indigo-300 font-bold">💡 التلميحات</span>
                        <span className="text-sm font-black text-white">{selectedUser.hints || 3}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleModifyHints(selectedUser, 10)}
                          className="flex-1 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleModifyHints(selectedUser, 50)}
                          className="flex-1 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white text-xs font-bold py-1 rounded-lg transition-colors"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleUnlockAllForUser(selectedUser)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-500/30"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح جميع الفئات الـ 16 كاملة</span>
                    </button>

                    <button
                      onClick={() => handleToggleAdminRole(selectedUser)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-500/30"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>
                        {selectedUser.role === 'admin' || selectedUser.isAdmin ? 'سحب رتبة الآدمن' : 'ترقية إلى آدمن'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleToggleBan(selectedUser)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                        selectedUser.isBanned
                          ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border-emerald-500/30'
                          : 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border-rose-500/30'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{selectedUser.isBanned ? 'إلغاء الحظر' : 'حظر الحساب'}</span>
                    </button>

                    <button
                      onClick={() => handleResetPlayerStats(selectedUser)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>تصفير الإحصائيات</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Users Directory Table / Cards */}
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    لا يوجد مستخدمين مطابقين للبحث
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSuper = (user.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                    return (
                      <div
                        key={user.uid}
                        className={`p-3.5 rounded-2xl bg-slate-950/60 border hover:border-amber-500/50 transition-all flex flex-wrap items-center justify-between gap-3 ${
                          selectedUser?.uid === user.uid ? 'border-amber-500 bg-slate-950' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{user.displayName}</span>
                              {isSuper && (
                                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                  المدير الرئيسي
                                </span>
                              )}
                              {(user.role === 'admin' || user.isAdmin) && !isSuper && (
                                <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                                  آدمن
                                </span>
                              )}
                              {user.isBanned && (
                                <span className="bg-rose-500/20 text-rose-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                  محظور
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              {user.email && <span className="text-slate-300 font-mono">{user.email}</span>}
                              <span>فوز: <strong className="text-emerald-400">{user.stats?.wins || 0}</strong></span>
                              <span>مباريات: <strong className="text-white">{user.stats?.totalMatches || 0}</strong></span>
                              <span>أعلى سكور: <strong className="text-amber-300">{user.stats?.highestScore || 0}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Balances and Quick Select */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-900 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-bold">
                              ⭐ {user.stars || 0}
                            </span>
                            <span className="text-xs bg-slate-900 border border-cyan-500/30 px-2 py-1 rounded-lg text-cyan-300 font-bold">
                              💎 {user.gems || 0}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              soundManager.playClick();
                              setSelectedUser(user);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تحكم</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 2: LIVE MATCHES & ROOM CONTROLLER */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  عرض مباشر لأحدث الغرف والمباريات في قاعدة البيانات:
                </p>
                <button
                  onClick={loadAllData}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث الغرف</span>
                </button>
              </div>

              {matchesList.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  لا توجد مباريات مسجلة حالياً
                </div>
              ) : (
                <div className="space-y-3">
                  {matchesList.map(match => {
                    const p1 = match.playerDetails?.[match.creatorId]?.displayName || 'اللاعب 1';
                    const p2 = match.guestId ? (match.playerDetails?.[match.guestId]?.displayName || 'اللاعب 2') : 'في انتظار الخصم...';
                    
                    const statusText = 
                      match.status === 'playing' ? 'جارٍ اللعب ⏱️' :
                      match.status === 'choosing_letter' ? 'اختيار الحرف 🔤' :
                      match.status === 'round_review' ? 'مراجعة الإجابات 📝' :
                      match.status === 'waiting' ? 'بانتظار لاعب ⏳' :
                      match.status === 'match_end' ? 'انتهت 🏆' : 'ملغاة ❌';

                    const statusBadgeClass =
                      match.status === 'playing' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      match.status === 'waiting' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      match.status === 'round_review' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                      match.status === 'match_end' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                      'bg-rose-500/20 text-rose-300 border-rose-500/40';

                    return (
                      <div
                        key={match.id}
                        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-slate-900 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">
                              رمز الغرفة: {match.code || match.id.substring(0, 6)}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                              {statusText}
                            </span>
                            {match.isRareLetter && (
                              <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                                حرف ذهبي x2
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            جائزة الوعاء: <strong className="text-amber-400">{match.totalPot || (match.betStars * 2)} ⭐</strong>
                          </span>
                        </div>

                        {/* Match Details Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-bold">{p1}</span>
                            <span className="text-amber-400 font-black">VS</span>
                            <span className="text-slate-300">{p2}</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400">
                            <span>الجولة: <strong className="text-white">{match.currentRound || 1} / {match.maxRounds || 3}</strong></span>
                            {match.currentLetter && (
                              <span>الحرف: <strong className="text-amber-300 font-bold">{match.currentLetter}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons on Match */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-900">
                          {match.status !== 'match_end' && match.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleForceFinishMatch(match.id, match.creatorId)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold transition-colors"
                              >
                                إعلان فوز اللاعب 1
                              </button>
                              {match.guestId && (
                                <button
                                  onClick={() => handleForceFinishMatch(match.id, match.guestId)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white text-xs font-bold transition-colors"
                                >
                                  إعلان فوز اللاعب 2
                                </button>
                              )}
                              <button
                                onClick={() => handleForceCancelMatch(match.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold transition-colors"
                              >
                                إلغاء المباراة
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteMatchDoc(match.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-bold transition-colors mr-auto flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف السجل</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM CONFIG & ECONOMY */}
          {activeTab === 'system' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>معايير واقتصاد لعبة الجدول</span>
                </h3>

                {/* Round Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">
                    مدة الجولة التنافسية بالثواني
                  </label>
                  <div className="flex gap-2">
                    {[30, 45, 60].map(sec => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSysConfig({ ...sysConfig, roundDuration: sec })}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          sysConfig.roundDuration === sec
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {sec} ثانية
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Starting Stars */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">
                    رصيد النجوم الافتراضي للاعبين الجدد ⭐
                  </label>
                  <div className="flex gap-2">
                    {[100, 250, 500, 1000].map(stars => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setSysConfig({ ...sysConfig, defaultStars: stars })}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          sysConfig.defaultStars === stars
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {stars} ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Toggles */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-sm font-bold text-white block">حدث النجوم الذهبية المضاعفة (Double Stars)</span>
                      <span className="text-[11px] text-amber-300">مضاعفة جوائز وأرباح المباريات اليومية</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sysConfig.doubleStarsActive}
                      onChange={(e) => setSysConfig({ ...sysConfig, doubleStarsActive: e.target.checked })}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-sm font-bold text-white block">وضع الصيانة والتحديثات (Maintenance Mode)</span>
                      <span className="text-[11px] text-slate-400">إظهار شارة الصيانة وتعطيل بدء المباريات مؤقتاً</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sysConfig.maintenanceMode}
                      onChange={(e) => setSysConfig({ ...sysConfig, maintenanceMode: e.target.checked })}
                      className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleSaveSystemConfig}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    حفظ إعدادات النظام وتطبيقها 💾
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: BROADCAST ANNOUNCEMENTS */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              
              {/* Create Announcement Form */}
              <form onSubmit={handleCreateAnnouncement} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>إرسال تنبيه أو إعلان عام لجميع اللاعبين</span>
                </h3>

                <textarea
                  value={newAnnouncementText}
                  onChange={(e) => setNewAnnouncementText(e.target.value)}
                  placeholder="اكتب نص الإعلان (مثال: نرحب بجميع اللاعبين! تبدأ الليلة بطولة الأسبوع الكبرى بجوائز مضاعفة)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 h-20 resize-none"
                  required
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">نوع الإعلان:</span>
                    {(['info', 'success', 'promo', 'warning'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAnnouncementType(type)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          newAnnouncementType === type
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {type === 'info' ? 'معلومة ℹ️' : type === 'success' ? 'نجاح ✅' : type === 'promo' ? 'عرض ترويجي 🎉' : 'تنبيه ⚠️'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-colors shadow-md shadow-amber-500/20"
                  >
                    نشر الإعلان الآن 🚀
                  </button>
                </div>
              </form>

              {/* Published Announcements List */}
              <div className="space-y-2">
                <h4 className="text-xs text-slate-400 font-bold">الإعلانات المنشورة:</h4>
                {announcements.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    لا توجد إعلانات منشورة حالياً
                  </div>
                ) : (
                  announcements.map(ann => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${ann.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        <div>
                          <p className="text-xs font-bold text-white">{ann.message}</p>
                          <span className="text-[10px] text-slate-500">
                            النوع: {ann.type} • {new Date(ann.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAnnouncementActive(ann)}
                          className={`text-xs px-2 py-1 rounded-lg font-bold border ${
                            ann.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {ann.isActive ? 'مفعّل' : 'معطل'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 5: WORD BANK MANAGER */}
          {activeTab === 'wordbank' && (
            <div className="space-y-4">
              
              {/* Add Word Form */}
              <form onSubmit={handleAddWordOverride} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>إضافة كلمة جديدة إلى معجم التحقق أو حظر كلمة</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    placeholder="اكتب الكلمة باللغة العربية..."
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                    required
                  />

                  <select
                    value={newWordCategory}
                    onChange={(e) => setNewWordCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  >
                    {allCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.id})
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewWordAccepted(true)}
                      className={`flex-1 text-xs font-bold rounded-xl py-2 border transition-colors ${
                        newWordAccepted
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      قبول الكلمة ✅
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewWordAccepted(false)}
                      className={`flex-1 text-xs font-bold rounded-xl py-2 border transition-colors ${
                        !newWordAccepted
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      حظر الكلمة 🚫
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-colors shadow-md shadow-amber-500/20"
                  >
                    إضافة الكلمة للمصادقة ➕
                  </button>
                </div>
              </form>

              {/* Words Override List */}
              <div className="space-y-2">
                <h4 className="text-xs text-slate-400 font-bold">الكلمات المخصصة المضافة:</h4>
                {wordOverrides.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    لم تتم إضافة كلمات استثنائية بعد. المعجم الافتراضي قيد العمل.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wordOverrides.map(word => (
                      <div
                        key={word.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{word.word}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              word.isAccepted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {word.isAccepted ? 'مقبولة' : 'محظورة'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            الفئة: {allCategories.find(c => c.id === word.categoryId)?.label || word.categoryId}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteWordOverride(word.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>نظام الإدارة متصل بقاعدة بيانات Firebase ومحدث لحظياً</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
