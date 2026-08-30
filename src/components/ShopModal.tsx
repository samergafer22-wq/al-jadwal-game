import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Tv, 
  Film,
  Utensils, 
  Globe2, 
  Compass, 
  Crown, 
  Trophy, 
  Briefcase, 
  Building, 
  Landmark, 
  Search, 
  CheckCircle2, 
  Gift,
  Package,
  Home,
  PartyPopper,
  Zap,
  Lightbulb
} from 'lucide-react';
import { UserProfile, GemShopPack, CategoryDef } from '../types';
import { EXTRA_CATEGORIES, ARABIC_WORD_BANK } from '../data/categories';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import { triggerSmallRewardConfetti, fireChestOpeningConfetti } from '../lib/celebration';

export interface ChestDef {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold';
  costType: 'stars' | 'gems';
  costAmount: number;
  description: string;
  badge: string;
  accentColor: string;
  iconBg: string;
  glowColor: string;
}

export const REWARD_CHESTS: ChestDef[] = [
  {
    id: 'chest_bronze',
    name: 'صندوق البداية البرونزي',
    tier: 'bronze',
    costType: 'stars',
    costAmount: 50,
    description: 'يحتوي على نجوم، تلميحات سريعة، وفرصة الحصول على جواهر.',
    badge: 'شائع 🥉',
    accentColor: 'border-amber-700/60',
    iconBg: 'from-amber-800 to-amber-950',
    glowColor: 'shadow-amber-700/20',
  },
  {
    id: 'chest_silver',
    name: 'صندوق الأبطال الفضي',
    tier: 'silver',
    costType: 'stars',
    costAmount: 150,
    description: 'يحتوي على مكافآت مضاعفة من النجوم، 3 تلميحات، وجواهر إضافية.',
    badge: 'نادر 🥈',
    accentColor: 'border-cyan-400/60',
    iconBg: 'from-cyan-700 to-blue-950',
    glowColor: 'shadow-cyan-500/30',
  },
  {
    id: 'chest_gold',
    name: 'صندوق الأساطير الذهبي',
    tier: 'gold',
    costType: 'gems',
    costAmount: 20,
    description: 'صندوق خرافي يمنح رصيداً هائلاً من النجوم والجواهر وفرصة فتح فئة مجاناً!',
    badge: 'أسطوري 👑',
    accentColor: 'border-amber-400',
    iconBg: 'from-amber-500 to-yellow-600',
    glowColor: 'shadow-amber-500/40',
  },
];

interface OpenedRewardResult {
  chestName: string;
  tier: 'bronze' | 'silver' | 'gold';
  stars: number;
  gems: number;
  hints: number;
  unlockedCategory?: CategoryDef;
}

interface ShopModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSelectPackToBuy: (pack: GemShopPack) => void;
  onUnlockCategory: (categoryId: string) => Promise<void>;
  onClaimChestReward?: (cost: { stars?: number; gems?: number }, reward: { stars: number; gems: number; hints: number; categoryId?: string }) => Promise<void>;
  preselectedCategory?: string | null;
  initialTab?: 'chests' | 'categories' | 'gems';
}

export const GEM_PACKS: GemShopPack[] = [
  {
    id: 'gems_50',
    gems: 50,
    bonusGems: 0,
    priceUsd: '0.99',
    priceFormatted: '$0.99 (حوالي 3.75 ر.س)',
  },
  {
    id: 'gems_150',
    gems: 150,
    bonusGems: 25,
    priceUsd: '2.49',
    priceFormatted: '$2.49 (حوالي 9.35 ر.س)',
    popular: true,
  },
  {
    id: 'gems_400',
    gems: 400,
    bonusGems: 100,
    priceUsd: '4.99',
    priceFormatted: '$4.99 (حوالي 18.75 ر.س)',
  },
  {
    id: 'gems_1000',
    gems: 1000,
    bonusGems: 350,
    priceUsd: '9.99',
    priceFormatted: '$9.99 (حوالي 37.50 ر.س)',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  userProfile,
  onClose,
  onSelectPackToBuy,
  onUnlockCategory,
  onClaimChestReward,
  preselectedCategory,
  initialTab = 'chests',
}) => {
  const [activeTab, setActiveTab] = useState<'chests' | 'categories' | 'gems'>(initialTab);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'media' | 'places' | 'culture' | 'general'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUnlockingCatId, setIsUnlockingCatId] = useState<string | null>(null);
  const [categoryToConfirm, setCategoryToConfirm] = useState<CategoryDef | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Chest opening states
  const [openingChest, setOpeningChest] = useState<ChestDef | null>(null);
  const [isChestOpeningAnim, setIsChestOpeningAnim] = useState<boolean>(false);
  const [openedReward, setOpenedReward] = useState<OpenedRewardResult | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getCategoryIcon = (iconName: string, id: string) => {
    switch (id) {
      case 'foods':
      case 'food':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'movies':
        return <Film className="w-5 h-5 text-purple-400" />;
      case 'tv_shows':
      case 'series':
        return <Tv className="w-5 h-5 text-cyan-400" />;
      case 'african_countries':
        return <Globe2 className="w-5 h-5 text-emerald-400" />;
      case 'asian_countries':
        return <Compass className="w-5 h-5 text-teal-400" />;
      case 'historical_figures':
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'sports_clubs':
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'professions':
      case 'profession':
        return <Briefcase className="w-5 h-5 text-blue-400" />;
      case 'space_nature':
        return <Sparkles className="w-5 h-5 text-indigo-400" />;
      case 'brands':
        return <Building className="w-5 h-5 text-rose-400" />;
      case 'capital':
        return <Landmark className="w-5 h-5 text-orange-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getSampleWords = (catId: string): string[] => {
    const samples: string[] = [];
    const letters = ['أ', 'ب', 'م', 'س', 'ك'];
    letters.forEach((l) => {
      const bank = ARABIC_WORD_BANK[l];
      if (bank && bank[catId] && bank[catId].length > 0) {
        samples.push(bank[catId][0]);
      }
    });
    return samples.slice(0, 3);
  };

  const handleConfirmUnlock = async () => {
    if (!categoryToConfirm) return;
    const cat = categoryToConfirm;
    const price = cat.gemPrice || 40;

    if (userProfile.gems < price) {
      soundManager.playError();
      showToast(`رصيد الجواهر غير كافٍ. تحتاج إلى ${price} 💎`);
      setActiveTab('gems');
      setCategoryToConfirm(null);
      return;
    }

    try {
      setIsUnlockingCatId(cat.id);
      soundManager.playClick();
      await onUnlockCategory(cat.id);
      triggerSmallRewardConfetti();
      showToast(`تم فتح فئة (${cat.label}) بنجاح وإضافتها لحسابك دائماً! 🎉`);
      setCategoryToConfirm(null);
    } catch (err: any) {
      showToast(err?.message || 'تعذر فتح الفئة');
    } finally {
      setIsUnlockingCatId(null);
    }
  };

  const isCategoryUnlocked = (id: string): boolean => {
    const list = userProfile.unlockedCategories || [];
    if (list.includes(id)) return true;
    if (id === 'foods' && list.includes('food')) return true;
    if (id === 'tv_shows' && list.includes('series')) return true;
    if (id === 'professions' && list.includes('profession')) return true;
    return false;
  };

  // Open Mystery Chest Logic with Confetti celebration
  const handleOpenChest = async (chest: ChestDef) => {
    const costAmount = chest.costAmount;
    if (chest.costType === 'stars') {
      if ((userProfile.stars || 0) < costAmount) {
        soundManager.playError();
        showToast(`رصيدك غير كافٍ. تحتاج إلى ${costAmount} ⭐`);
        return;
      }
    } else {
      if ((userProfile.gems || 0) < costAmount) {
        soundManager.playError();
        showToast(`رصيد الجواهر غير كافٍ. تحتاج إلى ${costAmount} 💎`);
        setActiveTab('gems');
        return;
      }
    }

    // Start opening sequence
    setOpeningChest(chest);
    setIsChestOpeningAnim(true);
    soundManager.playClick();
    haptics.tap();

    // Determine rewards based on tier
    let wonStars = 0;
    let wonGems = 0;
    let wonHints = 0;
    let wonCategory: CategoryDef | undefined = undefined;

    if (chest.tier === 'bronze') {
      wonStars = Math.floor(Math.random() * 50) + 30; // 30 - 80
      wonHints = Math.random() > 0.4 ? 1 : 0;
      wonGems = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
    } else if (chest.tier === 'silver') {
      wonStars = Math.floor(Math.random() * 120) + 100; // 100 - 220
      wonHints = Math.floor(Math.random() * 3) + 1; // 1 - 3
      wonGems = Math.floor(Math.random() * 6) + 3; // 3 - 8
    } else {
      // Gold
      wonStars = Math.floor(Math.random() * 300) + 250; // 250 - 550
      wonHints = Math.floor(Math.random() * 4) + 3; // 3 - 6
      wonGems = Math.floor(Math.random() * 15) + 10; // 10 - 25

      // Chance of random locked category unlock!
      const lockedCategories = EXTRA_CATEGORIES.filter((c) => !isCategoryUnlocked(c.id));
      if (lockedCategories.length > 0 && Math.random() > 0.4) {
        const randIdx = Math.floor(Math.random() * lockedCategories.length);
        wonCategory = lockedCategories[randIdx];
      }
    }

    // Delay for suspense animation
    setTimeout(async () => {
      setIsChestOpeningAnim(false);

      // Play victory sound & FIRE MAGICAL CONFETTI!
      soundManager.playVictory();
      haptics.victory();
      fireChestOpeningConfetti(chest.tier);

      const result: OpenedRewardResult = {
        chestName: chest.name,
        tier: chest.tier,
        stars: wonStars,
        gems: wonGems,
        hints: wonHints,
        unlockedCategory: wonCategory,
      };

      setOpenedReward(result);

      // Save to database
      if (onClaimChestReward) {
        await onClaimChestReward(
          chest.costType === 'stars' ? { stars: costAmount } : { gems: costAmount },
          {
            stars: wonStars,
            gems: wonGems,
            hints: wonHints,
            categoryId: wonCategory?.id,
          }
        );
      }
    }, 1200);
  };

  const filteredCategories = EXTRA_CATEGORIES.filter((cat) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchLabel = cat.label.toLowerCase().includes(q);
      const matchDesc = cat.description?.toLowerCase().includes(q) || false;
      if (!matchLabel && !matchDesc) return false;
    }

    if (selectedFilter === 'media') {
      return ['movies', 'tv_shows'].includes(cat.id);
    }
    if (selectedFilter === 'places') {
      return ['african_countries', 'asian_countries', 'capital'].includes(cat.id);
    }
    if (selectedFilter === 'culture') {
      return ['historical_figures', 'sports_clubs', 'professions'].includes(cat.id);
    }
    if (selectedFilter === 'general') {
      return ['foods', 'space_nature', 'brands'].includes(cat.id);
    }
    return true;
  });

  return (
    <div 
      id="shop-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header & Wallets */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="font-extrabold text-lg text-white font-['Cairo'] flex items-center gap-2">
                <span>متجر الجواهر وصناديق الجوائز</span>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  جوائز ومكافآت
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                افتح صناديق المكافآت السحرية واقتنِ فئات وباقات جواهر جديدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Stars Counter */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-amber-500/40 shadow-sm">
              <span className="text-base">⭐</span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block leading-none">نجومك</span>
                <span className="text-xs font-black text-amber-400 font-['Cairo']">
                  {userProfile.stars || 0}
                </span>
              </div>
            </div>

            {/* User Gems Counter */}
            <div 
              onClick={() => setActiveTab('gems')}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3.5 py-1.5 rounded-2xl border border-cyan-500/40 cursor-pointer transition-all shadow-sm group"
              title="اضغط لشراء المزيد من الجواهر عبر Google Play"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">💎</span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block leading-none">جواهرك</span>
                <span className="text-xs font-black text-cyan-400 font-['Cairo']">
                  {userProfile.gems || 0}
                </span>
              </div>
            </div>

            <button
              id="shop-modal-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black font-['Cairo'] transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-shop-modal-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Google Play Policy Compliance Disclaimer */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>التزام سياسة أمان Google Play:</strong> الجواهر تُستخدم حصريًا لفتح فئات ومحتوى إضافي دائم ومظاهر جمالية، ولا يمكن المراهنة بها في المباريات (المراهنات برصيد النجوم المجانية فقط ⭐).
          </span>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold p-3 rounded-2xl text-center animate-in fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-1">
          <button
            id="tab-chests-btn"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('chests');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black font-['Cairo'] transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'chests'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>صناديق الجوائز 🎁</span>
          </button>

          <button
            id="tab-extra-categories-btn"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('categories');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black font-['Cairo'] transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>فئات التحدي ({EXTRA_CATEGORIES.length})</span>
          </button>

          <button
            id="tab-buy-gems-btn"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('gems');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black font-['Cairo'] transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gems'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>باقات الجواهر</span>
          </button>
        </div>

        {/* CHESTS TAB */}
        {activeTab === 'chests' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-right">
              <h4 className="text-sm font-black text-white font-['Cairo'] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>افتح صناديق الكنز واكسب تلميحات وجواهر ونجوم إضافية:</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                كل صندوق يحتوي على مكافآت فورية مع تأثيرات ألعاب نارية واحتفالية حماسية!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {REWARD_CHESTS.map((chest) => {
                const canAfford = chest.costType === 'stars' 
                  ? (userProfile.stars || 0) >= chest.costAmount 
                  : (userProfile.gems || 0) >= chest.costAmount;

                return (
                  <div
                    key={chest.id}
                    className={`p-5 rounded-3xl border-2 bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 flex flex-col justify-between text-center space-y-3.5 transition-all relative overflow-hidden group shadow-lg ${chest.accentColor} ${chest.glowColor}`}
                  >
                    {/* Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {chest.badge}
                      </span>
                      <span className="text-xs font-black text-amber-300 font-['Cairo'] flex items-center gap-1">
                        {chest.costAmount} {chest.costType === 'stars' ? '⭐' : '💎'}
                      </span>
                    </div>

                    {/* 3D-Styled Chest Visual */}
                    <div className="relative py-2 flex items-center justify-center">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${chest.iconBg} border border-amber-400/40 flex items-center justify-center text-4xl shadow-xl group-hover:scale-110 group-hover:rotate-2 transition-transform`}>
                        {chest.tier === 'gold' ? '👑' : chest.tier === 'silver' ? '🎁' : '📦'}
                      </div>
                      <div className="absolute inset-0 bg-amber-400/10 blur-xl rounded-full pointer-events-none" />
                    </div>

                    <div>
                      <h4 className="font-black text-base text-white font-['Cairo']">
                        {chest.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {chest.description}
                      </p>
                    </div>

                    {/* Open Button */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        id={`open-chest-btn-${chest.id}`}
                        onClick={() => handleOpenChest(chest)}
                        className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs font-['Cairo'] flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                          canAfford
                            ? chest.tier === 'gold'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          {canAfford ? `فتح الصندوق (${chest.costAmount} ${chest.costType === 'stars' ? '⭐' : '💎'})` : 'الرصيد لا يكفي'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4 animate-in fade-in">
            
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="ابحث عن فئة (مثل: أفلام، أكلات، دول أفريقية)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedFilter === 'all'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedFilter('media')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedFilter === 'media'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎬 أفلام ومسلسلات
                </button>
                <button
                  onClick={() => setSelectedFilter('places')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedFilter === 'places'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🌍 دول وقارات
                </button>
                <button
                  onClick={() => setSelectedFilter('culture')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedFilter === 'culture'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👑 شخصيات ورياضة
                </button>
                <button
                  onClick={() => setSelectedFilter('general')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedFilter === 'general'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🍲 أكلات وطبيعة
                </button>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const isUnlocked = isCategoryUnlocked(cat.id);
                const price = cat.gemPrice || 40;
                const canAfford = userProfile.gems >= price;
                const sampleWords = getSampleWords(cat.id);

                return (
                  <div
                    key={cat.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                      isUnlocked
                        ? 'bg-slate-800/40 border-slate-800/80 hover:border-emerald-500/40'
                        : canAfford
                        ? 'bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-800/60 border-cyan-500/30 hover:border-cyan-400/70 shadow-lg'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
                          {getCategoryIcon(cat.iconName, cat.id)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white font-['Cairo'] flex items-center gap-2">
                            <span>{cat.label}</span>
                            {isUnlocked && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ملك لك
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sample Words Pills */}
                    {sampleWords.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-400">
                        <span className="text-[10px] text-slate-500">أمثلة:</span>
                        {sampleWords.map((w, idx) => (
                          <span key={idx} className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isUnlocked ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> مفتوحة دائمًا
                          </span>
                        ) : (
                          <span className="text-xs font-black text-cyan-400 font-['Cairo'] flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded-xl border border-cyan-500/20">
                            <span>{price}</span>
                            <span>💎</span>
                          </span>
                        )}
                      </div>

                      {isUnlocked ? (
                        <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                          جاهزة للعب
                        </span>
                      ) : (
                        <button
                          id={`unlock-cat-btn-${cat.id}`}
                          disabled={isUnlockingCatId === cat.id}
                          onClick={() => {
                            soundManager.playClick();
                            setCategoryToConfirm(cat);
                          }}
                          className={`px-4 py-1.5 rounded-xl font-bold text-xs font-['Cairo'] transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                            canAfford
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-95'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{canAfford ? 'فتح الفئة' : 'احصل على جواهر'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buy Gems Tab */}
        {activeTab === 'gems' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300">
                اختر باقة الجواهر المناسبة للشراء بأمان وفورية عبر متجر Google Play:
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Play Billing آمن</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GEM_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`p-4 rounded-3xl border relative flex flex-col justify-between text-center space-y-3 transition-all ${
                    pack.popular
                      ? 'bg-gradient-to-b from-cyan-950/70 via-slate-900 to-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/15'
                      : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                      الأكثر شعبية ⭐
                    </span>
                  )}

                  <div>
                    <span className="text-3xl block my-1">💎</span>
                    <h4 className="font-black text-xl text-white font-['Cairo']">
                      {pack.gems} جوهرة
                    </h4>
                    {pack.bonusGems > 0 ? (
                      <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 inline-block mt-1">
                        + {pack.bonusGems} مكافأة إضافية
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 block mt-1">
                        باقة البداية السريعة
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-2 font-bold">{pack.priceFormatted}</p>
                    <button
                      id={`buy-pack-btn-${pack.id}`}
                      onClick={() => {
                        soundManager.playClick();
                        onSelectPackToBuy(pack);
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-['Cairo'] flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>شراء عبر Google Play</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Interactive Chest Opening Overlay with Confetti */}
      {openingChest && isChestOpeningAnim && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-6xl flex items-center justify-center mx-auto shadow-2xl animate-bounce border-4 border-yellow-200">
                {openingChest.tier === 'gold' ? '👑' : openingChest.tier === 'silver' ? '🎁' : '📦'}
              </div>
              <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-amber-300 font-['Cairo'] animate-pulse">
              جاري فتح {openingChest.name}...
            </h3>
            <p className="text-xs text-slate-300 font-bold">
              استعد لاستلام مكافآتك السحرية! ✨
            </p>
          </div>
        </div>
      )}

      {/* Opened Reward Result Modal (With Celebratory Confetti fanfare) */}
      {openedReward && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 relative overflow-hidden">
            
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto text-3xl shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/40 animate-bounce">
              <PartyPopper className="w-8 h-8 text-slate-950" />
            </div>

            <div>
              <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-block mb-1">
                مكافأة {openedReward.chestName} 🎉
              </span>
              <h3 className="font-black text-xl text-white font-['Cairo']">
                مبروك! تم فتح الصندوق بنجاح
              </h3>
            </div>

            {/* Won Items Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-500/30 text-center">
                <span className="text-xl block mb-0.5">⭐</span>
                <span className="text-xs text-slate-400 block font-bold">نجوم</span>
                <span className="text-base font-black text-amber-400 font-['Cairo']">
                  +{openedReward.stars}
                </span>
              </div>

              {openedReward.gems > 0 && (
                <div className="bg-slate-900 p-2.5 rounded-xl border border-cyan-500/30 text-center">
                  <span className="text-xl block mb-0.5">💎</span>
                  <span className="text-xs text-slate-400 block font-bold">جواهر</span>
                  <span className="text-base font-black text-cyan-400 font-['Cairo']">
                    +{openedReward.gems}
                  </span>
                </div>
              )}

              {openedReward.hints > 0 && (
                <div className="bg-slate-900 p-2.5 rounded-xl border border-yellow-500/30 text-center">
                  <span className="text-xl block mb-0.5">💡</span>
                  <span className="text-xs text-slate-400 block font-bold">تلميحات</span>
                  <span className="text-base font-black text-yellow-400 font-['Cairo']">
                    +{openedReward.hints}
                  </span>
                </div>
              )}

              {openedReward.unlockedCategory && (
                <div className="col-span-2 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40 text-center">
                  <span className="text-xl block mb-0.5">🎉</span>
                  <span className="text-xs text-emerald-300 block font-bold">
                    فئة جديدة مفتوحة دائماً:
                  </span>
                  <span className="text-sm font-black text-white font-['Cairo']">
                    {openedReward.unlockedCategory.label}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                id="celebrate-chest-confetti-btn"
                onClick={() => {
                  soundManager.playVictory();
                  fireChestOpeningConfetti(openedReward.tier);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-xs font-['Cairo'] flex items-center justify-center gap-1.5 border border-amber-500/40 transition-colors"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                <span>إطلاق احتفال إضافي 🎉</span>
              </button>

              <button
                id="collect-chest-reward-btn"
                onClick={() => {
                  soundManager.playClick();
                  setOpenedReward(null);
                  setOpeningChest(null);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-['Cairo'] shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                استلام المكافأة والعودة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal to Spend Gems on a Category */}
      {categoryToConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mx-auto text-2xl">
              {getCategoryIcon(categoryToConfirm.iconName, categoryToConfirm.id)}
            </div>

            <div>
              <h3 className="font-black text-lg text-white font-['Cairo']">
                تأكيد فتح فئة: {categoryToConfirm.label}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                سيتم خصم <strong className="text-cyan-400 font-bold">{categoryToConfirm.gemPrice || 40} جوهرة</strong> من رصيدك وفتح الفئة في ملفك الشخصي بصفة دائمة.
              </p>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">رصيدك الحالي:</span>
              <span className="font-bold text-cyan-400">{userProfile.gems} 💎</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={isUnlockingCatId !== null}
                onClick={handleConfirmUnlock}
                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-['Cairo'] shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                تأكيد الفتح الآن
              </button>
              <button
                onClick={() => setCategoryToConfirm(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs font-['Cairo'] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

