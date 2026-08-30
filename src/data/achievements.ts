import { AchievementDef, UserProfile } from '../types';

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  {
    id: 'first_win',
    title: 'أول انتصار 🏆',
    description: 'الفوز بأول مباراة تنافسية في الجدول',
    iconName: 'Trophy',
    category: 'matches',
    targetCount: 1,
    rewardStars: 50,
    rewardGems: 5,
  },
  {
    id: 'veteran_player',
    title: 'فارس الميدان ⚔️',
    description: 'الفوز في 10 مباريات تنافسية',
    iconName: 'Swords',
    category: 'matches',
    targetCount: 10,
    rewardStars: 200,
    rewardGems: 20,
  },
  {
    id: 'master_30_wins',
    title: 'سيد الحروف والكلمات 👑',
    description: 'الفوز في 30 مباراة ضد لاعبين أو الذكاء الاصطناعي',
    iconName: 'Crown',
    category: 'matches',
    targetCount: 30,
    rewardStars: 500,
    rewardGems: 50,
  },
  {
    id: 'fast_stop_master',
    title: 'البرق الخاطف ⚡',
    description: 'ضغط زر قف (STOP) وإنهاء الجولة كأول لاعب 5 مرات',
    iconName: 'Zap',
    category: 'speed',
    targetCount: 5,
    rewardStars: 150,
    rewardGems: 15,
  },
  {
    id: 'rare_letter_hero',
    title: 'صائد الحروف الذهبية 💎',
    description: 'الفوز في 3 جولات تبدأ بحروف نادرة (ض، ظ، غ، ذ، خ)',
    iconName: 'Sparkles',
    category: 'challenge',
    targetCount: 3,
    rewardStars: 200,
    rewardGems: 25,
  },
  {
    id: 'daily_challenge_champ',
    title: 'بطل التحدي اليومي 📅',
    description: 'إكمال التحدي اليومي الموحّد 3 مرات',
    iconName: 'CalendarCheck',
    category: 'challenge',
    targetCount: 3,
    rewardStars: 250,
    rewardGems: 20,
  },
  {
    id: 'lucky_spinner',
    title: 'سيد الحظ 🎡',
    description: 'تدوير عجلة الحظ اليومية 5 مرات',
    iconName: 'Dices',
    category: 'challenge',
    targetCount: 5,
    rewardStars: 100,
    rewardGems: 10,
  },
  {
    id: 'wordsmith_100',
    title: 'قاموس حي 📚',
    description: 'تسجيل 50 كلمة عربية صحيحة معتمدة في الجولات',
    iconName: 'BookOpen',
    category: 'vocabulary',
    targetCount: 50,
    rewardStars: 300,
    rewardGems: 30,
  },
  {
    id: 'high_score_round',
    title: 'العلامة الكاملة 🎯',
    description: 'تحقيق 50 نقطة أو أكثر في جولة واحدة',
    iconName: 'Target',
    category: 'speed',
    targetCount: 50,
    rewardStars: 150,
    rewardGems: 15,
  },
];

/**
 * Calculates current progress for a given achievement based on user profile
 */
export function getAchievementProgress(achievement: AchievementDef, profile: UserProfile | null): number {
  if (!profile) return 0;
  
  switch (achievement.id) {
    case 'first_win':
    case 'veteran_player':
    case 'master_30_wins':
      return profile.stats?.wins || 0;
      
    case 'fast_stop_master':
      return profile.stats?.fastStopsCount || 0;
      
    case 'rare_letter_hero':
      return profile.stats?.rareLetterWins || 0;
      
    case 'daily_challenge_champ':
      return (profile.achievements?.['daily_challenge_champ']?.progress) || 0;
      
    case 'lucky_spinner':
      return profile.totalSpinsCount || 0;
      
    case 'wordsmith_100':
      return profile.stats?.totalWordsAccepted || (profile.stats?.wins * 12) || 0;
      
    case 'high_score_round':
      return profile.stats?.highestScore || 0;
      
    default:
      return profile.achievements?.[achievement.id]?.progress || 0;
  }
}
