import React, { useState } from 'react';
import { X, Copy, Check, Users, Plus, ArrowLeft, Share2, Play, Home, Gem, ShoppingBag } from 'lucide-react';
import { soundManager } from '../lib/audio';
import { UserProfile } from '../types';

interface FriendInviteModalProps {
  userProfile?: UserProfile | null;
  onClose: () => void;
  onCreateRoom: () => Promise<string>;
  onJoinRoom: (code: string) => Promise<void>;
  onOpenShop?: (tab?: 'chests' | 'avatars' | 'categories' | 'gems') => void;
  currentCreatedCode?: string | null;
}

export const FriendInviteModal: React.FC<FriendInviteModalProps> = ({
  userProfile,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onOpenShop,
  currentCreatedCode,
}) => {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(currentCreatedCode || null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasEnoughGems = (userProfile?.gems || 0) >= 15;
  const hasEnoughStars = (userProfile?.stars || 0) >= 20;

  const handleCreate = async () => {
    if (!hasEnoughGems) {
      soundManager.playError();
      setErrorMsg('رصيد الجواهر غير كافٍ. يتطلب إنشاء الغرفة 15 جوهرة 💎');
      return;
    }
    if (!hasEnoughStars) {
      soundManager.playError();
      setErrorMsg('رصيد نجوم التحدي غير كافٍ. تحتاج 20 ⭐ للرهان');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      soundManager.playClick();
      const code = await onCreateRoom();
      setCreatedRoomCode(code);
      setMode('create');
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إنشاء الغرفة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      soundManager.playClick();
      await onJoinRoom(code);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'رمز الغرفة غير صحيح أو الغرفة ممتلئة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    soundManager.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = () => {
    if (!createdRoomCode) return;
    const url = `${window.location.origin}?room=${createdRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    soundManager.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      id="friend-invite-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white font-['Cairo']">
                تحدي صديق خاص
              </h3>
              <p className="text-xs text-slate-400">
                العب مع صديق برمز الغرفة أو رابط المشاركة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="friend-modal-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black font-['Cairo'] transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-friend-modal-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="space-y-2">
            <div className="bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold p-3 rounded-xl text-center">
              {errorMsg}
            </div>
            {!hasEnoughGems && onOpenShop && (
              <button
                id="modal-quick-recharge-btn"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenShop('gems');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs font-['Cairo'] flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>شحن رصيد الجواهر الآن 💎</span>
              </button>
            )}
          </div>
        )}

        {/* Mode: Choose Create or Join */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">تصريح إنشاء الغرفة:</span>
                <span className="font-bold text-cyan-300">15 جوهرة 💎</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">رهان التحدي للفائز:</span>
                <span className="font-bold text-amber-400">20 نجمة ⭐ (الجائزة 40 ⭐)</span>
              </div>
              {userProfile && (
                <div className="pt-1.5 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>رصيدك الحالي:</span>
                  <span className="font-bold text-slate-200">
                    {userProfile.gems || 0} 💎 • {userProfile.stars || 0} ⭐
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="choose-create-room-btn"
                disabled={isProcessing}
                onClick={handleCreate}
                className={`p-5 rounded-2xl font-bold font-['Cairo'] text-sm flex flex-col items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                  hasEnoughGems && hasEnoughStars
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                    : 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:border-indigo-500/50'
                }`}
              >
                <Plus className="w-6 h-6 text-cyan-300" />
                <span>إنشاء غرفة (15 💎)</span>
                {!hasEnoughGems && (
                  <span className="text-[10px] text-rose-400 font-normal">رصيد الجواهر غير كافٍ</span>
                )}
              </button>

              <button
                id="choose-join-room-btn"
                onClick={() => {
                  soundManager.playClick();
                  setMode('join');
                }}
                className="p-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold font-['Cairo'] text-sm flex flex-col items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
              >
                <Play className="w-6 h-6 text-emerald-400" />
                <span>انضمام برمز الغرفة</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode: Created Room Code Display */}
        {mode === 'create' && createdRoomCode && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-2">
              <span className="text-xs text-slate-400 block">رمز غرفتك الخاص:</span>
              <div className="text-3xl font-black font-['Cairo'] text-indigo-300 tracking-widest bg-indigo-500/10 py-2 rounded-xl border border-indigo-500/30 select-all">
                {createdRoomCode}
              </div>
              <p className="text-[11px] text-slate-400">
                شارك هذا الرمز مع صديقك للدخول والبدء فوراً!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="copy-room-code-btn"
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرمز'}</span>
              </button>

              <button
                id="copy-room-link-btn"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-['Cairo'] flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>نسخ الرابط المباشر</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>في انتظار انضمام صديقك للغرفة...</span>
            </div>
          </div>
        )}

        {/* Mode: Join Room */}
        {mode === 'join' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block text-right">
                أدخل رمز الغرفة المكوّن من 6 خانات:
              </label>
              <input
                id="join-room-code-input"
                type="text"
                maxLength={9}
                placeholder="مثال: JDWL-4921"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-black tracking-widest text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="cancel-join-mode-btn"
                onClick={() => {
                  soundManager.playClick();
                  setMode('choose');
                }}
                className="py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                رجوع
              </button>

              <button
                id="submit-join-room-btn"
                disabled={!joinCodeInput.trim() || isProcessing}
                onClick={handleJoin}
                className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs font-['Cairo'] shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                انضمام للمباراة
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
