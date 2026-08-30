import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Smile, 
  X, 
  Send, 
  Sparkles,
  Zap,
  Flame,
  ThumbsUp,
  Heart
} from 'lucide-react';
import { MatchData, MatchQuickChat, UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';

export interface QuickPhrase {
  id: string;
  text: string;
  emoji: string;
  category: 'sportsmanship' | 'reaction' | 'challenge';
}

export const PRESET_QUICK_PHRASES: QuickPhrase[] = [
  // Phrases specifically requested
  { id: 'luck', text: 'حظ أوفر', emoji: '🤝', category: 'sportsmanship' },
  { id: 'welldone', text: 'أحسنت!', emoji: '👏', category: 'sportsmanship' },
  { id: 'surprised', text: 'لقد فاجأتني!', emoji: '😲', category: 'reaction' },
  { id: 'wow', text: 'واو!', emoji: '🔥', category: 'reaction' },
  
  // Competitive & exciting Arabic phrases
  { id: 'fast', text: 'سريع جداً!', emoji: '⚡', category: 'reaction' },
  { id: 'strong', text: 'تحدي قوي!', emoji: '💪', category: 'challenge' },
  { id: 'great_game', text: 'لعبة رائعة!', emoji: '⭐', category: 'sportsmanship' },
  { id: 'next_round', text: 'انتظر الجولة القادمة!', emoji: '😉', category: 'challenge' },
  { id: 'thanks', text: 'شكراً لك!', emoji: '🌟', category: 'sportsmanship' },
  { id: 'laugh', text: 'هههههه!', emoji: '😂', category: 'reaction' },
  { id: 'focus', text: 'ركّز جيداً!', emoji: '🧠', category: 'challenge' },
  { id: 'gg', text: 'مستوى أسطوري!', emoji: '👑', category: 'reaction' },
];

export const PRESET_EMOJIS = ['🔥', '👏', '😲', '🤝', '⚡', '💪', '😂', '⭐', '🧠', '😉', '👑', '🛑'];

interface QuickChatWidgetProps {
  match: MatchData;
  currentUser: UserProfile;
  onSendChat: (message: string, emoji?: string) => void;
  position?: 'bottom-right' | 'top-right' | 'inline';
}

export const QuickChatWidget: React.FC<QuickChatWidgetProps> = ({
  match,
  currentUser,
  onSendChat,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBubble, setActiveBubble] = useState<MatchQuickChat | null>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHandledChatIdRef = useRef<string | null>(null);

  // Watch incoming chat from match
  useEffect(() => {
    if (match.lastChat && match.lastChat.id !== lastHandledChatIdRef.current) {
      lastHandledChatIdRef.current = match.lastChat.id;
      setActiveBubble(match.lastChat);

      // Play audio notification
      if (match.lastChat.senderUid !== currentUser.uid) {
        soundManager.playSparkle();
        haptics.tap();
      }

      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setActiveBubble(null);
      }, 4000);
    }
  }, [match.lastChat, currentUser.uid]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const handleSelectPhrase = (phrase: QuickPhrase) => {
    soundManager.playClick();
    haptics.success();
    onSendChat(phrase.text, phrase.emoji);
    setIsOpen(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    soundManager.playClick();
    haptics.tap();
    onSendChat(emoji, emoji);
    setIsOpen(false);
  };

  const isMyBubble = activeBubble?.senderUid === currentUser.uid;

  return (
    <div className="relative z-30 font-['Cairo']">
      
      {/* Active Floating Speech Bubble */}
      {activeBubble && (
        <div 
          id="active-quick-chat-bubble"
          className={`fixed sm:absolute z-50 transition-all duration-300 pointer-events-none ${
            position === 'inline' 
              ? 'top-[-50px] right-2 sm:right-auto' 
              : 'bottom-20 right-4 sm:right-6'
          } animate-in fade-in zoom-in-90 slide-in-from-bottom-2`}
        >
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border-2 ${
            isMyBubble 
              ? 'bg-emerald-950/95 border-emerald-400/80 text-emerald-100 shadow-emerald-500/25' 
              : 'bg-indigo-950/95 border-indigo-400/80 text-indigo-100 shadow-indigo-500/25'
          }`}>
            <span className="text-xl shrink-0 animate-bounce">
              {activeBubble.emoji || '💬'}
            </span>
            <div className="text-right">
              <span className="text-[10px] font-bold opacity-80 block">
                {isMyBubble ? 'أنت' : activeBubble.senderName}:
              </span>
              <span className="text-sm font-black tracking-wide">
                {activeBubble.message}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Trigger Button */}
      <button
        id="open-quick-chat-btn"
        type="button"
        onClick={() => {
          soundManager.playClick();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all shadow-lg active:scale-95 cursor-pointer ${
          isOpen
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
            : 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 hover:text-amber-200 border-amber-500/40 hover:border-amber-400'
        }`}
        title="محادثة وتفاعلات سريعة"
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-black hidden sm:inline">
          محادثة سريعة
        </span>
        <span className="text-xs">💬</span>
      </button>

      {/* Quick Chat Popup Tray */}
      {isOpen && (
        <div 
          id="quick-chat-tray-popup"
          className="absolute bottom-12 right-0 w-72 sm:w-80 bg-slate-900/95 border-2 border-slate-700 rounded-3xl p-4 shadow-2xl backdrop-blur-md space-y-3 z-50 animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white">
                تفاعل وعبارات سريعة
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Emojis Strip */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 scrollbar-none">
            {PRESET_EMOJIS.map((emo, idx) => (
              <button
                key={idx}
                id={`chat-emoji-${idx}`}
                type="button"
                onClick={() => handleSelectEmoji(emo)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 hover:scale-125 transition-all text-base flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
              >
                {emo}
              </button>
            ))}
          </div>

          {/* Quick Phrases Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {PRESET_QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase.id}
                id={`quick-phrase-${phrase.id}`}
                type="button"
                onClick={() => handleSelectPhrase(phrase)}
                className={`px-2.5 py-2 rounded-xl text-right text-xs font-bold transition-all flex items-center justify-between gap-1 border active:scale-95 cursor-pointer ${
                  phrase.category === 'sportsmanship'
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/30 text-emerald-200'
                    : phrase.category === 'reaction'
                    ? 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-500/30 text-indigo-200'
                    : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/30 text-amber-200'
                }`}
              >
                <span className="truncate">{phrase.text}</span>
                <span className="text-sm shrink-0">{phrase.emoji}</span>
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-800">
            تظهر العبارة فوراً للخصم مع تنبيه صوتي ✨
          </div>
        </div>
      )}

    </div>
  );
};
