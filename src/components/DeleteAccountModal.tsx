import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, Home, Loader2, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  userName?: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  userName,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    soundManager.playClick();
    haptics.warning();
    setIsDeleting(true);
    try {
      await onConfirmDelete();
      setIsSuccess(true);
      setTimeout(() => {
        setIsDeleting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Delete account error:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="delete-account-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-rose-600/50 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden font-['Cairo'] animate-in fade-in zoom-in-95 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <button
            id="close-delete-modal-btn"
            disabled={isDeleting}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-black text-rose-400 flex items-center gap-1.5 justify-end">
                <span>حذف الحساب والبيانات</span>
                <Trash2 className="w-5 h-5 text-rose-500" />
              </h3>
              <p className="text-[11px] text-slate-400">
                حذف فوري ودائم لجميع بياناتك
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-center">
          {isSuccess ? (
            <div className="py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-base font-black text-white">تم حذف الحساب بنجاح</h4>
              <p className="text-xs text-slate-400">تم مسح جميع بياناتك وجارٍ نقلك للبداية كضيف جديد...</p>
            </div>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-right">
                أهلاً <strong>{userName || 'يا بطل'}</strong>، سيؤدي هذا الإجراء إلى حذف ملفك الشخصي وجميع سجلاتك فوراً، ويشمل ذلك:
              </p>

              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3 text-right text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>جميع رصيدك من النجوم والجواهر والتلميحات.</span>
                </div>
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>سجل المباريات ومركزك في لوحة المتصدرين.</span>
                </div>
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>تقدم المهام اليومية وإنجازاتك المسجلة.</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-400 text-right font-bold">
                ⚠️ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه بأي شكل.
              </p>

              <div className="pt-2">
                <label className="block text-right text-xs text-slate-400 mb-1.5 font-bold">
                  لتأكيد الحذف، اكتب كلمة <span className="text-rose-400 font-black">حذف</span> أدناه:
                </label>
                <input
                  id="delete-account-confirm-input"
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="اكتب: حذف"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-bold text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  id="cancel-delete-account-btn"
                  disabled={isDeleting}
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
                >
                  إلغاء والتراجع
                </button>

                <button
                  id="confirm-delete-account-btn"
                  disabled={confirmationInput.trim() !== 'حذف' || isDeleting}
                  onClick={handleDelete}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الحساب نهائياً</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
