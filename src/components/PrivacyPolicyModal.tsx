import React from 'react';
import { X, ShieldCheck, Lock, HeartHandshake, EyeOff, Trash2, Home, Mail } from 'lucide-react';
import { soundManager } from '../lib/audio';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeleteAccount?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenDeleteAccount,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="privacy-policy-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden font-['Cairo'] animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              id="privacy-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-privacy-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5 justify-end">
                <span>سياسة الخصوصية وأمان البيانات</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                متوافق مع معايير Google Play Data Safety وسياسات حماية الأسرة
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-right text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1: Intro */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2 justify-end">
              <span>1. مقدمة والتزامنا بالخصوصية</span>
              <Lock className="w-4 h-4" />
            </h4>
            <p>
              نحن في لعبة <strong>"الجدول"</strong> نضع خصوصية مستخدمينا وأمان بياناتهم على رأس أولوياتنا. هذه اللعبة مخصصة لجميع الفئات العمرية والعائلات ومحبي الألعاب اللغوية والثقافية العربية. نلتزم بأعلى معايير الشفافية وحماية البيانات المعمول بها في متجر Google Play.
            </p>
          </div>

          {/* Section 2: Data Collected */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2 justify-end">
              <span>2. البيانات التي يتم جمعها والغرض منها</span>
              <EyeOff className="w-4 h-4" />
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong>معلومات الحساب الاختيارية:</strong> الاسم المستعار، الصورة الرمزية، والبريد الإلكتروني عند تسجيل الدخول باستخدام Google لغرض حفظ التقدم والنجوم والترتيب عبر الأجهزة.
              </li>
              <li>
                <strong>بيانات اللعب والإحصائيات:</strong> عدد المباريات الملعوبة، النقاط، الكلمات المعتمدة في الجولات، والترتيب في لوحة المتصدرين.
              </li>
              <li>
                <strong>بيانات لا نجمعها مطلقاً:</strong> لا نطلب ولا نصل إطلاقاً إلى جهات الاتصال، الكاميرا، الميكروفون، الموقع الجغرافي الدقيق، أو أي ملفات على جهازك.
              </li>
            </ul>
          </div>

          {/* Section 3: Family and Children Policy (COPPA) */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2 justify-end">
              <span>3. سياسة حماية الأطفال والعائلات (Families Policy)</span>
              <HeartHandshake className="w-4 h-4" />
            </h4>
            <p>
              تطبيق الجدول خالٍ من أي محتوى غير لائق. يتبع المعجم العربي فلاتر دقيقة تمنع أي ألفاظ غير لائقة. كما أن الإعلانات (إن وُجدت) يتم تصنيفها كإعلانات آمنة لجميع الفئات العمرية بما يتوافق مع سياسة Google Families.
            </p>
          </div>

          {/* Section 4: Deletion of Account & Data */}
          <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 space-y-2.5">
            <h4 className="font-black text-rose-400 text-sm flex items-center gap-2 justify-end">
              <span>4. حذف الحساب والبيانات</span>
              <Trash2 className="w-4 h-4" />
            </h4>
            <p className="font-medium text-slate-200">
              يمكنك حذف حسابك وجميع بياناتك المرتبطة به في أي وقت، وذلك من خلال الذهاب إلى الإعدادات داخل التطبيق واختيار "حذف الحساب". سيتم حذف جميع بياناتك بشكل نهائي وفوري من خوادمنا.
            </p>
            {onOpenDeleteAccount && (
              <button
                id="privacy-open-delete-account-btn"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenDeleteAccount();
                }}
                className="mt-2 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 border border-rose-500 shadow-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>الانتقال المباشر لخيار "حذف الحساب"</span>
              </button>
            )}
          </div>

          {/* Section 5: Contact */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2">
            <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2 justify-end">
              <span>5. التواصل ومسؤول الخصوصية</span>
              <Mail className="w-4 h-4" />
            </h4>
            <p>
              لأي استفسارات حول الخصوصية أو طلبات الدعم، يمكنك التواصل معنا مباشرة عبر البريد الإلكتروني الخاص بالمطور على Google Play.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end shrink-0">
          <button
            id="privacy-confirm-close-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors"
          >
            فهمت وموافق
          </button>
        </div>

      </div>
    </div>
  );
};
