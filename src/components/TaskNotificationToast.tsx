import React, { useEffect } from 'react';
import { Sparkles, CheckCircle, Award } from 'lucide-react';
import { TaskDefinition } from '../types';
import { soundManager } from '../lib/audio';

interface TaskNotificationToastProps {
  completedTask: TaskDefinition | null;
  onClose: () => void;
  onOpenTasks: () => void;
}

export const TaskNotificationToast: React.FC<TaskNotificationToastProps> = ({
  completedTask,
  onClose,
  onOpenTasks,
}) => {
  useEffect(() => {
    if (completedTask) {
      soundManager.playReward();
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [completedTask, onClose]);

  if (!completedTask) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 animate-in slide-in-from-top duration-300 max-w-sm w-full">
      <div 
        id="task-notification-toast"
        className="bg-slate-900/95 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-3 text-right font-['Cairo']"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30 shrink-0">
            <Award className="w-6 h-6 text-slate-950" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-500/40">
                مهمة مكتملة! 🎉
              </span>
            </div>
            <h4 className="text-sm font-bold text-white leading-tight">
              {completedTask.title}
            </h4>
            <p className="text-xs text-amber-300/90 font-black flex items-center gap-1">
              <span>جاهزة للاستلام (+{completedTask.rewardStars} ⭐)</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenTasks();
            onClose();
          }}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all shrink-0 flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>استلم</span>
        </button>
      </div>
    </div>
  );
};
