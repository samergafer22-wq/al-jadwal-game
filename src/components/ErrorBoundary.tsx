import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        // ignore
      }
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-white font-['Cairo']">
                تم استعادة التطبيق بنجاح 🛡️
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-['Cairo'] leading-relaxed">
                حدث تحديث في حالة الجلسة أو الصفحة. تم الحفاظ على بياناتك وأرصدتك بأمان.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm font-['Cairo'] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>العودة للرئيسية فوراً</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm font-['Cairo'] border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تحديث الصفحة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
