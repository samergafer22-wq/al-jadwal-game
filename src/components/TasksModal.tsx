import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Gift, 
  Flame, 
  Trophy, 
  Crown, 
  Calendar, 
  Gamepad2, 
  Zap, 
  Users, 
  PlayCircle, 
  Swords, 
  CalendarCheck, 
  Timer, 
  UserCheck, 
  Award,
  ChevronLeft,
  Home
} from 'lucide-react';
import { UserProfile, UserTasksState, TaskDefinition, TaskPeriod } from '../types';
import { 
  DAILY_TASKS, 
  WEEKLY_TASKS, 
  WEEKLY_MILESTONE_TARGET, 
  WEEKLY_MILESTONE_REWARD_STARS, 
  getRemainingDailyTime, 
  getRemainingWeeklyTime, 
  claimTaskReward, 
  claimAllCompletedTasks, 
  claimWeeklyMilestoneBonus,
  countUnclaimedTasks
} from '../lib/tasks';
import { soundManager } from '../lib/audio';
import { triggerVictoryConfetti, triggerSmallRewardConfetti } from '../lib/celebration';

interface TasksModalProps {
  currentUser: UserProfile;
  tasksState: UserTasksState;
  onUpdateTasksState: (newState: UserTasksState) => void;
  onClose: () => void;
  onOpenDailyChallenge?: () => void;
  onOpenFriendChallenge?: () => void;
  onOpenQuickMatch?: () => void;
  onOpenRewardedAd?: () => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({
  currentUser,
  tasksState,
  onUpdateTasksState,
  onClose,
  onOpenDailyChallenge,
  onOpenFriendChallenge,
  onOpenQuickMatch,
  onOpenRewardedAd,
}) => {
  const [activeTab, setActiveTab] = useState<TaskPeriod>('daily');
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [remainingDaily, setRemainingDaily] = useState(getRemainingDailyTime());
  const [remainingWeekly, setRemainingWeekly] = useState(getRemainingWeeklyTime());

  // Update countdown timers every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingDaily(getRemainingDailyTime());
      setRemainingWeekly(getRemainingWeeklyTime());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const safeTasks = tasksState?.tasks || {};

  const unclaimedCount = tasksState ? countUnclaimedTasks(tasksState) : 0;

  // Daily Tasks stats
  const completedDailyCount = DAILY_TASKS.filter(
    (t) => safeTasks[t.id]?.completed
  ).length;

  const unclaimedDailyCount = DAILY_TASKS.filter(
    (t) => safeTasks[t.id]?.completed && !safeTasks[t.id]?.claimed
  ).length;

  // Weekly Tasks stats
  const completedWeeklyCount = WEEKLY_TASKS.filter(
    (t) => safeTasks[t.id]?.completed
  ).length;

  const unclaimedWeeklyCount = WEEKLY_TASKS.filter(
    (t) => safeTasks[t.id]?.completed && !safeTasks[t.id]?.claimed
  ).length;

  const weeklyMilestoneReady = 
    completedWeeklyCount >= WEEKLY_MILESTONE_TARGET && !tasksState?.weeklyBonusClaimed;

  // Handle single task claim
  const handleClaimTask = async (task: TaskDefinition) => {
    if (claimingTaskId) return;
    setClaimingTaskId(task.id);
    soundManager.playReward();
    triggerSmallRewardConfetti();

    try {
      const { newState } = await claimTaskReward(tasksState, task.id);
      onUpdateTasksState(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingTaskId(null);
    }
  };

  // Handle claim all
  const handleClaimAll = async () => {
    if (isClaimingAll || unclaimedCount === 0) return;
    setIsClaimingAll(true);
    soundManager.playVictory();
    triggerVictoryConfetti();

    try {
      const { newState } = await claimAllCompletedTasks(tasksState);
      onUpdateTasksState(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClaimingAll(false);
    }
  };

  // Handle weekly bonus claim
  const handleClaimWeeklyBonus = async () => {
    if (isClaimingBonus || !weeklyMilestoneReady) return;
    setIsClaimingBonus(true);
    soundManager.playVictory();
    triggerVictoryConfetti();

    try {
      const { newState } = await claimWeeklyMilestoneBonus(tasksState);
      onUpdateTasksState(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClaimingBonus(false);
    }
  };

  // Render task dynamic icon
  const renderTaskIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6 text-amber-400' };
    switch (iconName) {
      case 'Gamepad2': return <Gamepad2 {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Calendar': return <Calendar {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Users': return <Users {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'PlayCircle': return <PlayCircle {...props} />;
      case 'Crown': return <Crown {...props} className="w-6 h-6 text-yellow-400" />;
      case 'Swords': return <Swords {...props} />;
      case 'CalendarCheck': return <CalendarCheck {...props} />;
      case 'Flame': return <Flame {...props} className="w-6 h-6 text-orange-400" />;
      case 'Timer': return <Timer {...props} />;
      case 'UserCheck': return <UserCheck {...props} />;
      default: return <Award {...props} />;
    }
  };

  // Shortcut navigation for in-progress tasks
  const handleTaskShortcut = (task: TaskDefinition) => {
    soundManager.playClick();
    onClose();
    switch (task.actionType) {
      case 'complete_daily_challenge':
        if (onOpenDailyChallenge) onOpenDailyChallenge();
        break;
      case 'play_friend_match':
        if (onOpenFriendChallenge) onOpenFriendChallenge();
        break;
      case 'watch_rewarded_ad':
        if (onOpenRewardedAd) onOpenRewardedAd();
        break;
      default:
        if (onOpenQuickMatch) onOpenQuickMatch();
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        id="tasks-modal-container"
        className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right font-['Cairo'] relative my-auto"
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2.5 relative">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="tasks-modal-go-home-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black font-['Cairo'] transition-colors"
              title="العودة للقائمة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>

            <button
              id="close-tasks-modal-btn"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl sm:rounded-2xl transition-all border border-slate-700"
              title="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-right min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-1.5 truncate">
                <span>مهام الجدول 📜</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-amber-300/90 font-medium truncate">
                أنجز المهام واكسب النجوم ⭐
              </p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {unclaimedCount > 0 && (
              <button
                id="claim-all-tasks-btn"
                onClick={handleClaimAll}
                disabled={isClaimingAll}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>استلام الكل ({unclaimedCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {/* Weekly Tab */}
            <button
              id="weekly-tasks-tab-btn"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('weekly');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'weekly'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>مهام الأسبوع 🏆</span>
              {(unclaimedWeeklyCount > 0 || weeklyMilestoneReady) && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unclaimedWeeklyCount + (weeklyMilestoneReady ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Daily Tab */}
            <button
              id="daily-tasks-tab-btn"
              onClick={() => {
                soundManager.playClick();
                setActiveTab('daily');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'daily'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>مهام اليوم 📅</span>
              {unclaimedDailyCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unclaimedDailyCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* DAILY TAB CONTENT */}
          {activeTab === 'daily' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Daily Progress & Timer Banner */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      إنجاز مهام اليوم ({completedDailyCount} من {DAILY_TASKS.length})
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>تتجدد المهام خلال: <strong className="text-amber-300 font-bold">{remainingDaily.text}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full sm:w-48 bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-700 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${(completedDailyCount / DAILY_TASKS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Task Items List */}
              <div className="space-y-3">
                {DAILY_TASKS.map((task) => {
                  const progress = safeTasks[task.id] || {
                    taskId: task.id,
                    currentCount: 0,
                    completed: false,
                    claimed: false,
                  };
                  const percent = Math.min(100, Math.round((progress.currentCount / task.targetCount) * 100));

                  return (
                    <div
                      key={task.id}
                      id={`task-item-${task.id}`}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden ${
                        progress.claimed
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                          : progress.completed
                          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      {/* Left side: Icon & Details */}
                      <div className="flex items-center gap-3.5 w-full sm:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                          progress.claimed
                            ? 'bg-slate-800 border-slate-700'
                            : progress.completed
                            ? 'bg-emerald-500/20 border-emerald-500/40'
                            : 'bg-amber-500/10 border-amber-500/30'
                        }`}>
                          {renderTaskIcon(task.iconName)}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-white">
                              {task.title}
                            </h4>
                            {task.highlight && !progress.claimed && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                مهمة مميزة
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300">
                            {task.description}
                          </p>

                          {/* Progress bar within card */}
                          <div className="flex items-center gap-2 pt-1 max-w-xs">
                            <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700/50">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  progress.completed ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                              {progress.currentCount}/{task.targetCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Reward & Action button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                        <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 font-black text-xs shrink-0">
                          <span>+{task.rewardStars}</span>
                          <span>⭐</span>
                        </div>

                        {progress.claimed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-2 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم الاستلام</span>
                          </div>
                        ) : progress.completed ? (
                          <button
                            id={`claim-task-${task.id}`}
                            onClick={() => handleClaimTask(task)}
                            disabled={claimingTaskId === task.id}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                            <span>استلام المكافأة</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTaskShortcut(task)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                          >
                            <span>انطلق</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEKLY TAB CONTENT */}
          {activeTab === 'weekly' && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Weekly Mega Milestone Chest Card */}
              <div 
                id="weekly-milestone-chest"
                className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-yellow-950/40 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5"
              >
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 text-center sm:text-right flex-col sm:flex-row">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 shrink-0">
                    <Crown className="w-8 h-8 text-slate-950 fill-slate-950" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-[11px] bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-500/40">
                        الصندوق الذهبي الأسبوعي 🎁
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>يتبقى: {remainingWeekly.text}</span>
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      أكمل {WEEKLY_MILESTONE_TARGET} مهام أسبوعية وافتح الصندوق الذهبي
                    </h3>
                    <p className="text-xs text-slate-300">
                      مكافأة كبرى إضافية قدرها <strong className="text-amber-300">+{WEEKLY_MILESTONE_REWARD_STARS} نجمة ⭐</strong> للأبطال المتميزين!
                    </p>
                  </div>
                </div>

                {/* Milestone Progress & Claim */}
                <div className="flex flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      التقدم: {Math.min(WEEKLY_MILESTONE_TARGET, completedWeeklyCount)} / {WEEKLY_MILESTONE_TARGET}
                    </span>
                  </div>

                  <div className="w-36 bg-slate-950 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (completedWeeklyCount / WEEKLY_MILESTONE_TARGET) * 100)}%` }}
                    />
                  </div>

                  {tasksState?.weeklyBonusClaimed ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-black bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم فتح الصندوق</span>
                    </div>
                  ) : weeklyMilestoneReady ? (
                    <button
                      id="claim-weekly-bonus-btn"
                      onClick={handleClaimWeeklyBonus}
                      disabled={isClaimingBonus}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-1.5 animate-bounce"
                    >
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      <span>فتح الصندوق (+100 ⭐)</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                      متبقي {Math.max(0, WEEKLY_MILESTONE_TARGET - completedWeeklyCount)} مهام
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Task Items List */}
              <div className="space-y-3">
                {WEEKLY_TASKS.map((task) => {
                  const progress = safeTasks[task.id] || {
                    taskId: task.id,
                    currentCount: 0,
                    completed: false,
                    claimed: false,
                  };
                  const percent = Math.min(100, Math.round((progress.currentCount / task.targetCount) * 100));

                  return (
                    <div
                      key={task.id}
                      id={`task-item-${task.id}`}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden ${
                        progress.claimed
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                          : progress.completed
                          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      {/* Details */}
                      <div className="flex items-center gap-3.5 w-full sm:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                          progress.claimed
                            ? 'bg-slate-800 border-slate-700'
                            : progress.completed
                            ? 'bg-emerald-500/20 border-emerald-500/40'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                          {renderTaskIcon(task.iconName)}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-white">
                              {task.title}
                            </h4>
                            {task.highlight && !progress.claimed && (
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">
                                أسبوعي مميز
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300">
                            {task.description}
                          </p>

                          <div className="flex items-center gap-2 pt-1 max-w-xs">
                            <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700/50">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  progress.completed ? 'bg-emerald-400' : 'bg-yellow-400'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                              {progress.currentCount}/{task.targetCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reward & Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                        <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 font-black text-xs shrink-0">
                          <span>+{task.rewardStars}</span>
                          <span>⭐</span>
                        </div>

                        {progress.claimed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-2 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم الاستلام</span>
                          </div>
                        ) : progress.completed ? (
                          <button
                            id={`claim-task-${task.id}`}
                            onClick={() => handleClaimTask(task)}
                            disabled={claimingTaskId === task.id}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                            <span>استلام المكافأة</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTaskShortcut(task)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                          >
                            <span>انطلق</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>رصيدك الحالي:</span>
            <strong className="text-amber-300 font-black flex items-center gap-1">
              <span>{currentUser.stars}</span>
              <span>⭐</span>
            </strong>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
