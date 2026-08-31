import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Loader2, 
  AlertCircle,
  Smartphone,
  Info,
  ExternalLink,
  Bug,
  Copy,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { GemShopPack, UserProfile } from '../types';
import { soundManager } from '../lib/audio';
import { 
  getGooglePlayDigitalGoodsService,
  executeGooglePlayPurchase,
  checkBillingEnvironment,
  fetchPlayStoreProductDetails,
  BillingEnvironmentStatus,
  DigitalGoodsService,
  DigitalGoodsItem
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
  const [envStatus, setEnvStatus] = useState<BillingEnvironmentStatus | null>(null);
  const [playStoreItem, setPlayStoreItem] = useState<DigitalGoodsItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'ready' | 'processing' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [copiedDebug, setCopiedDebug] = useState(false);

  const totalGems = pack.gems + pack.bonusGems;

  const runDiagnostics = async () => {
    setIsCheckingService(true);
    setErrorMessage(null);
    try {
      const status = await checkBillingEnvironment();
      setEnvStatus(status);

      if (status.isServiceAvailable) {
        const details = await fetchPlayStoreProductDetails([pack.id]);
        if (details && details.length > 0) {
          setPlayStoreItem(details[0]);
        }
      }
    } catch (err: any) {
      console.error('[Google Play Billing Sheet] Diagnostics error:', err);
    } finally {
      setIsCheckingService(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    runDiagnostics();
    return () => {
      isMounted = false;
    };
  }, [pack.id]);

  const handleExecutePlayBilling = async () => {
    try {
      setIsProcessing(true);
      setStep('processing');
      setErrorMessage(null);
      soundManager.playClick();

      console.log(`[Google Play Billing Sheet] Triggering executeGooglePlayPurchase for pack ${pack.id}`);
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
      console.error('[Google Play Billing Sheet] Purchase execution failed:', err);
      setStep('error');
      setErrorMessage(err?.message || 'تعذر استكمال عملية الشراء عبر Google Play');
      soundManager.playError();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      pack: { id: pack.id, price: pack.priceUsd, gems: totalGems },
      envStatus,
      playStoreItem,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      isSecureContext: window.isSecureContext,
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    setCopiedDebug(true);
    setTimeout(() => setCopiedDebug(false), 2000);
  };

  const isDigitalGoodsAvailable = envStatus?.isServiceAvailable ?? false;

  return (
    <div 
      id="google-play-billing-sheet-overlay"
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        id="google-play-billing-container"
        className="w-full sm:max-w-md bg-[#1e2024] text-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col"
      >
        {/* Top Header - Google Play Official Branding */}
        <div className="bg-[#16171a] px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
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
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {isCheckingService ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#01875f] animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-['Cairo']">
                جارٍ التحقق من خدمة Google Play Billing و Digital Goods API...
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
                  سيتم استهلاك المنتج وإضافة {totalGems} جوهرة فور تأكيد الدفع من Google Play
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
            <div className="py-4 space-y-4 text-center">
              <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-400 font-['Cairo']">
                  لم تكتمل عملية الشراء
                </h4>
                <p className="text-xs text-slate-300 mt-1 font-['Cairo'] leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-right">
                  {errorMessage}
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => setStep('ready')}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all font-['Cairo'] cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  onClick={() => setShowDevDetails(!showDevDetails)}
                  className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>تفاصيل التشخيص</span>
                </button>
              </div>
            </div>
          ) : isDigitalGoodsAvailable ? (
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
                      {pack.id} {playStoreItem?.title ? `(${playStoreItem.title})` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="font-black text-base text-white block font-['Cairo']">
                    {playStoreItem?.price ? `${playStoreItem.price.value} ${playStoreItem.price.currency}` : pack.priceFormatted}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-['Cairo']">
                    ${pack.priceUsd} USD
                  </span>
                </div>
              </div>

              {/* Policy & Security Notice */}
              <div className="flex items-start gap-2.5 bg-[#17181a] p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 text-right">
                <ShieldCheck className="w-4 h-4 text-[#01875f] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  تتم عملية الشراء عبر <strong>Google Play Billing</strong> المعتمدة من Google، وسيتم خصم المبلغ واستهلاك المنتج تلقائياً فور التأكيد.
                </p>
              </div>

              {/* Execute Purchase Button */}
              <button
                id="google-play-execute-purchase-btn"
                disabled={isProcessing}
                onClick={handleExecutePlayBilling}
                className="w-full py-3.5 rounded-xl bg-[#01875f] hover:bg-[#017250] active:scale-[0.98] text-white font-extrabold text-sm font-['Cairo'] flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <span>متابعة الشراء عبر Google Play ({pack.priceFormatted})</span>
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
                  <span className="font-bold text-sm text-white font-['Cairo'] block">
                    {pack.priceFormatted}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    (${pack.priceUsd} USD)
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
                  وفقًا لسياسات <strong>Google Play Payments Policy</strong>، تتم جميع عمليات شراء المحتوى الرقمي والجواهر حصريًا عبر نظام <strong>Google Play Billing</strong> المدمج في تطبيق أندرويد (TWA).
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

              {/* Direct Purchase Attempt Button for Testing / TWA Fallback */}
              <button
                id="force-try-play-billing-btn"
                onClick={handleExecutePlayBilling}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold font-['Cairo'] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>محاولة بدء عملية الشراء عبر Google Play</span>
              </button>

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

          {/* Collapsible Developer Diagnostics Section */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => setShowDevDetails(!showDevDetails)}
              className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto cursor-pointer"
            >
              <Bug className="w-3 h-3" />
              <span>{showDevDetails ? 'إخفاء بيانات الفحص الفني' : 'عرض تشخيص Google Play Billing (للمطور)'}</span>
            </button>

            {showDevDetails && (
              <div className="mt-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-left space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1.5">
                  <span className="font-bold">Play Billing Diagnostics:</span>
                  <button
                    onClick={handleCopyDebugInfo}
                    className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded text-cyan-400 cursor-pointer"
                  >
                    {copiedDebug ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDebug ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div>SKU: <strong className="text-cyan-400">{pack.id}</strong> (${pack.priceUsd})</div>
                  <div>window.getDigitalGoodsService: <span className={envStatus?.hasDigitalGoodsApi ? 'text-emerald-400' : 'text-rose-400'}>{envStatus?.hasDigitalGoodsApi ? 'YES' : 'NO'}</span></div>
                  <div>window.PaymentRequest: <span className={envStatus?.hasPaymentRequest ? 'text-emerald-400' : 'text-rose-400'}>{envStatus?.hasPaymentRequest ? 'YES' : 'NO'}</span></div>
                  <div>Service Available: <span className={envStatus?.isServiceAvailable ? 'text-emerald-400' : 'text-amber-400'}>{envStatus?.isServiceAvailable ? 'YES (TWA Connected)' : 'NO (Browser/Non-TWA)'}</span></div>
                  <div>TWA / Standalone: <span className={envStatus?.isStandaloneOrTwa ? 'text-emerald-400' : 'text-slate-400'}>{envStatus?.isStandaloneOrTwa ? 'YES' : 'NO'}</span></div>
                  {envStatus?.serviceError && (
                    <div className="text-rose-400 break-words mt-1">
                      Note: {envStatus.serviceError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

