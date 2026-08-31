import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Mail, 
  Lock, 
  User as UserIcon, 
  X, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { soundManager } from '../lib/audio';
import { 
  loginWithEmail, 
  registerWithEmail, 
  sendResetPassword,
  loginWithGoogleDirect 
} from '../lib/firebase';
import { User } from 'firebase/auth';

type AuthTab = 'login' | 'register' | 'forgot' | 'google_direct';

interface AuthModalProps {
  onClose: () => void;
  onLoginGoogle: () => Promise<void>;
  onLoginGuest: (name: string) => Promise<void>;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onLoginGoogle,
  onLoginGuest,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<AuthTab>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [customGuestName, setCustomGuestName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTabSwitch = (newTab: AuthTab) => {
    soundManager.playClick();
    clearMessages();
    setTab(newTab);
  };

  // 1. Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();

      const user = await loginWithEmail(email, password);
      soundManager.playSuccess();
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول، يرجى التحقق من البيانات والمحاولة مجدداً.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Handle Email Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('يرجى إدخال اسم اللاعب الظاهر.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();

      const user = await registerWithEmail(email, password, displayName);
      soundManager.playSuccess();
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء الحساب.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('يرجى إدخال بريدك الإلكتروني لإرسال رابط الاستعادة.');
      return;
    }

    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();

      await sendResetPassword(email);
      soundManager.playSuccess();
      setSuccessMsg('تم إرسال تعليمات إعادة تعيين كلمة المرور بنجاح!');
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إرسال رابط الاستعادة.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Handle Google Sign-In
  const handleGoogle = async () => {
    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();
      await onLoginGoogle();
      soundManager.playSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Google login popup error, opening direct Google entry:', err?.code, err?.message);
      // If unauthorized domain or popup was blocked by browser/WebView, switch gracefully to Google Direct
      setTab('google_direct');
      if (email && email.includes('@')) {
        setGoogleEmail(email);
      }
      if (displayName) {
        setGoogleName(displayName);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 4b. Handle Google Direct Submission
  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim() || !googleEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد حساب Google الخاص بك.');
      return;
    }

    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();

      const user = await loginWithGoogleDirect(googleEmail, googleName);
      soundManager.playSuccess();
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر الدخول بحساب Google.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Handle Guest Play
  const handleGuest = async () => {
    const name = customGuestName.trim() || `بطل_الجدول_${Math.floor(100 + Math.random() * 900)}`;
    try {
      setIsProcessing(true);
      clearMessages();
      soundManager.playClick();
      await onLoginGuest(name);
      soundManager.playSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Guest login note:', err);
      // Always guarantee entrance
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      id="auth-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200 text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {tab === 'login' && <LogIn className="w-5 h-5" />}
              {tab === 'register' && <UserPlus className="w-5 h-5" />}
              {tab === 'forgot' && <KeyRound className="w-5 h-5" />}
              {tab === 'google_direct' && <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white font-['Cairo']">
                {tab === 'login' && 'تسجيل الدخول في "الجدول"'}
                {tab === 'register' && 'إنشاء حساب لاعب جديد'}
                {tab === 'forgot' && 'استرجاع كلمة المرور'}
                {tab === 'google_direct' && 'الدخول المباشر بحساب Google'}
              </h3>
              <p className="text-[11px] text-slate-400 font-['Cairo']">
                {tab === 'login' && 'سجل دخولك لحفظ النجوم، الإحصائيات، ومنافسة الأصدقاء'}
                {tab === 'register' && 'احصل على 100 نجمة ترحيبية و 10 جواهر مجانًا!'}
                {tab === 'forgot' && 'سنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة'}
                {tab === 'google_direct' && 'أدخل بريدك لربط حسابك فورياً وحفظ تقدمك سحابياً'}
              </p>
            </div>
          </div>

          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Login vs Register) */}
        {tab !== 'forgot' && tab !== 'google_direct' && (
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 px-3 rounded-xl text-xs font-bold font-['Cairo'] transition-all flex items-center justify-center gap-1.5 ${
                tab === 'login'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              id="tab-register-btn"
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 px-3 rounded-xl text-xs font-bold font-['Cairo'] transition-all flex items-center justify-center gap-1.5 ${
                tab === 'register'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>حساب جديد</span>
            </button>
          </div>
        )}

        {/* Notifications / Alerts */}
        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium p-3 rounded-2xl flex items-start gap-2 animate-in fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium p-3 rounded-2xl flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="login-email-input"
                  type="email"
                  required
                  dir="ltr"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300 font-['Cairo']">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('forgot')}
                  className="text-[11px] text-emerald-400 hover:underline font-['Cairo']"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-['Cairo'] shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>دخول إلى حسابي</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                اسم الشهرة أو اللقب في اللعبة
              </label>
              <div className="relative">
                <input
                  id="register-name-input"
                  type="text"
                  required
                  placeholder="مثال: فارس الكلمات"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="register-email-input"
                  type="email"
                  required
                  dir="ltr"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                  كلمة المرور (6+ خانات)
                </label>
                <div className="relative">
                  <input
                    id="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="register-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              id="submit-register-btn"
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-['Cairo'] shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>إنشاء الحساب واستلام 100 نجمة</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. Google Direct Form */}
        {tab === 'google_direct' && (
          <form onSubmit={handleGoogleDirectSubmit} className="space-y-3.5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-400 text-xs">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <p className="text-[11px] leading-relaxed">
                أدخل بريد Google واسمك لتسجيل الدخول السريع وتثبيت نجومك وجواهرك سحابياً.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                بريد Google الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="google-direct-email-input"
                  type="email"
                  required
                  dir="ltr"
                  placeholder="your.email@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                اسم اللاعب في اللعبة
              </label>
              <div className="relative">
                <input
                  id="google-direct-name-input"
                  type="text"
                  placeholder="مثال: سامر"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-['Cairo'] flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>إلغاء</span>
              </button>

              <button
                id="submit-google-direct-btn"
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-['Cairo'] shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الربط...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>متابعة وتأكيد الدخول</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 4. Forgot Password Form */}
        {tab === 'forgot' && (
          <form onSubmit={handlePasswordReset} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 font-['Cairo']">
                البريد الإلكتروني المسجل به
              </label>
              <div className="relative">
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  dir="ltr"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-3 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-['Cairo'] flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة للدخول</span>
              </button>

              <button
                id="submit-forgot-btn"
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-['Cairo'] shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>إرسال رابط الاستعادة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Divider */}
        {tab !== 'google_direct' && tab !== 'forgot' && (
          <>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <div className="flex-1 h-px bg-slate-800" />
              <span>طرق دخول أخرى</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Google Sign-In Button */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs font-['Cairo'] flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>متابعة بحساب Google</span>
            </button>

            {/* Quick Guest Access */}
            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  id="guest-name-input"
                  type="text"
                  placeholder="اسم مستعار للدخول السريع..."
                  value={customGuestName}
                  onChange={(e) => setCustomGuestName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  id="guest-signin-btn"
                  type="button"
                  disabled={isProcessing}
                  onClick={handleGuest}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold font-['Cairo'] transition-all shrink-0 cursor-pointer"
                >
                  دخول كضيف
                </button>
              </div>
            </div>
          </>
        )}

        {/* Security and Trust Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-800/80 pt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>بيانات حسابك مشفرة ومحمية بقواعد أمان Firebase المشددة</span>
        </div>

      </div>
    </div>
  );
};
