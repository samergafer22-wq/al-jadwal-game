import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Loader2, 
  AlertCircle,
  Smartphone,
  Info,
  ExternalLink
} from 'lucide-react';
import { GemShopPack, UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { 
  getGooglePlayDigitalGoodsService,
  executeGooglePlayPurchase,
  DigitalGoodsService
} from '../lib/paymentService';

interface GooglePlayBillingSheetProps {
  pack: GemShopPack;
  userProfile: UserProfile;
  onClose: () => void;
  onSuccess: (pack: GemShopPack) => Promise<void>;
}

export const GooglePlayBillingSheet: React.FC<GooglePlayBillingSheetProps> = ({
  pack,
  userProfile,
  onClose,
  onSuccess,
}) => {
  const [isCheckingService, setIsCheckingService] = useState(true);
  const [digitalGoodsAvailable, setDigitalGoodsAvailable] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'ready' | 'processing' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalGems = pack.gems + pack.bonusGems;

  useEffect(() => {
    let isMounted = true;
    async function checkPlayBilling() {
      setIsCheckingService(true);
      const service: DigitalGoodsService | null = await getGooglePlayDigitalGoodsService();
      if (isMounted) {
        setDigitalGoodsAvailable(!!service);
        setIsCheckingService(false);
      }
    }
    checkPlayBilling();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExecutePlayBilling = async () => {
    try {
      setIsProcessing(true);
      setStep('processing');
      soundManager.playClick();

      // Execute Google Play In-App Purchase via Digital Goods API
      await executeGooglePlayPurchase(pack, userProfile);

      // Call parent success handler to update local state and play sound
      await onSuccess(pack);

      setStep('success');
      soundManager.playReward();

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err?.message || 'تعذر استكمال عملية الشراء عبر Google Play');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      id="google-play-billing-sheet-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        id="google-play-billing-container"
        className="w-full sm:max-w-md bg-[#1e2024] text-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Top Header - Google Play Official Branding */}
        <div className="bg-[#16171a] px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {/* Google Play Logo Badge */}
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 3.5C4 2.67 4.92 2.18 5.6 2.63L20.2 11.13C20.87 11.52 20.87 12.48 20.2 12.87L5.6 21.37C4.92 21.82 4 21.33 4 20.5V3.5Z" fill="url(#play_gradient)" />
                <defs>
                  <linearGradient id="play_gradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00C1A4" />
                    <stop offset="0.33" stopColor="#01875F" />
                    <stop offset="0.66" stopColor="#FFA000" />
                    <stop offset="1" stopColor="#FF3333" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200 font-['Cairo']">
                  Google Play Billing
                </span>
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                  In-App Product
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                SKU: {pack.id}
              </span>
            </div>
          </div>

          <button
            id="close-play-billing-btn"
            disabled={isProcessing}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {isCheckingService ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#01875f] animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-['Cairo']">
                جارٍ التحقق من خدمة Google Play Billing...
              </p>
            </div>
          ) : step === 'processing' ? (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#01875f] animate-spin" />
                <span className="text-lg absolute">💎</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-white font-['Cairo']">
                  جارٍ معالجة وتأكيد الشراء عبر Google Play...
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-['Cairo']">
                  سيتم إضافة الجواهر فور تأكيد الدفع من Google Play
                </p>
              </div>
            </div>
          ) : step === 'success' ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-in zoom-in-75">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-emerald-400 font-['Cairo']">
                تم الشراء بنجاح عبر Google Play!
              </h4>
              <p className="text-xs text-slate-300 font-['Cairo']">
                تمت إضافة <strong className="text-cyan-400">{totalGems} جوهرة</strong> إلى رصيدك.
              </p>
            </div>
          ) : step === 'error' ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-400 font-['Cairo']">
                  لم تكتمل عملية الشراء
                </h4>
                <p className="text-xs text-slate-300 mt-1 font-['Cairo']">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setStep('ready')}
                className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all font-['Cairo'] cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : digitalGoodsAvailable ? (
            /* Digital Goods Service is Available (Inside Android TWA Google Play App) */
            <>
              {/* Item Card Details */}
              <div className="bg-[#27292e] rounded-2xl p-4 border border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shadow-inner">
                    💎
                  </div>
                  <div className="text-right">
                    <h3 className="font-extrabold text-sm text-white font-['Cairo'] flex items-center gap-1.5">
                      <span>باقة {pack.gems} جوهرة</span>
                      {pack.bonusGems > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          +{pack.bonusGems} مجانًا
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {pack.id}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="font-black text-base text-white block font-['Cairo']">
                    ${pack.priceUsd}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-['Cairo']">
                    {pack.priceFormatted}
                  </span>
                </div>
              </div>

              {/* Policy & Security Notice */}
              <div className="flex items-start gap-2.5 bg-[#17181a] p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 text-right">
                <ShieldCheck className="w-4 h-4 text-[#01875f] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  تتم عملية الشراء عبر <strong>Google Play Billing</strong> المعتمدة من Google، وسيتم خصم المبلغ عبر وسيلة الدفع المحفوظة في حسابك على متجر Play.
                </p>
              </div>

              {/* Execute Purchase Button */}
              <button
                id="google-play-execute-purchase-btn"
                disabled={isProcessing}
                onClick={handleExecutePlayBilling}
                className="w-full py-3.5 rounded-xl bg-[#01875f] hover:bg-[#017250] active:scale-[0.98] text-white font-extrabold text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <span>متابعة الشراء عبر Google Play (${pack.priceUsd})</span>
              </button>
            </>
          ) : (
            /* Digital Goods Service is Unavailable (Standard Browser / Non-TWA Context) */
            <div className="space-y-4">
              {/* Product Info Summary */}
              <div className="bg-[#27292e] rounded-2xl p-4 border border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl">
                    💎
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-white font-['Cairo']">
                      باقة {totalGems} جوهرة
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Product ID: {pack.id}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm text-white font-mono">
                    ${pack.priceUsd}
                  </span>
                </div>
              </div>

              {/* Google Play Payments Policy Notice */}
              <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 text-right space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-['Cairo']">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>الشراء متاح حصريًا عبر تطبيق Google Play</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-['Cairo']">
                  وفقًا لسياسات <strong>Google Play Payments Policy</strong>، تتم جميع عمليات شراء المحتوى الرقمي والجواهر حصريًا عبر نظام <strong>Google Play Billing</strong> المدمج في تطبيق أندرويد.
                </p>
                <div className="bg-slate-900/60 rounded-xl p-2.5 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>لإتمام الشراء داخل اللعبة:</span>
                  </div>
                  <p>
                    افتح اللعبة عبر تطبيق <strong>Google Play</strong> المثبت على هاتفك الأندرويد للشراء بأمان بضغطة واحدة.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="close-play-notice-btn"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-['Cairo'] transition-colors cursor-pointer"
              >
                فهمت ذلك، إغلاق
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
