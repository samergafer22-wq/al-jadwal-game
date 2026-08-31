import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  loginAnonymously, 
  logoutUser, 
  initUserProfile, 
  subscribeToUserProfile,
  subscribeToMatch,
  deleteUserAccount
} from './lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  UserProfile, 
  MatchData, 
  MatchQuickChat,
  MatchStatus, 
  MatchHistoryItem, 
  GemShopPack, 
  RoundResult,
  UserTasksState,
  TaskDefinition,
  TaskActionType,
  LuckySpinReward
} from './types';
import { STANDARD_CATEGORIES, RARE_LETTERS_SET, ALL_CATEGORIES } from './data/categories';
import { evaluateRoundAnswers } from './lib/arabicUtils';
import { soundManager } from './lib/audio';
import { haptics } from './lib/haptics';
import { 
  fetchUserTasks, 
  recordTaskAction, 
  claimTaskReward, 
  countUnclaimedTasks 
} from './lib/tasks';
import { 
  checkSpinEligibility, 
  sanitizeAndValidateSpinReward, 
  calculateNextStreak,
  SPIN_COOLDOWN_MS
} from './lib/luckySpin';

import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';
import { LetterPickerModal } from './components/LetterPickerModal';
import { RoundReviewModal } from './components/RoundReviewModal';
import { MatchResultModal } from './components/MatchResultModal';
import { ShopModal, GEM_PACKS } from './components/ShopModal';
import { GooglePlayBillingSheet } from './components/GooglePlayBillingSheet';
import { RewardedAdModal } from './components/RewardedAdModal';
import { InterstitialAdModal } from './components/InterstitialAdModal';
import { FriendInviteModal } from './components/FriendInviteModal';
import { AuthModal } from './components/AuthModal';
import { Leaderboard } from './components/Leaderboard';
import { Sidebar } from './components/Sidebar';
import { DailyChallengeModal } from './components/DailyChallengeModal';
import { TasksModal } from './components/TasksModal';
import { TaskNotificationToast } from './components/TaskNotificationToast';
import { DailyLuckySpinModal } from './components/DailyLuckySpinModal';
import { AchievementsModal } from './components/AchievementsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { bootstrapAdminStatusIfNeeded } from './lib/adminAuth';

// Helper to create or restore a fast offline guest profile
const getInitialGuestProfile = (): UserProfile => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('aljadwal_guest_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
  }
  return {
    uid: 'guest_' + Math.random().toString(36).substring(2, 9),
    displayName: 'لاعب ضيف',
    stars: 100,
    gems: 10,
    hints: 3,
    stats: { wins: 0, losses: 0, totalMatches: 0, roundsWon: 0, highestScore: 0 },
    unlockedCategories: ['name', 'animal', 'plant', 'inanimate', 'country'],
    unlockedThemes: ['classic'],
    rewardedAdsToday: 0,
    lastRewardDate: '',
    matchesPlayedSinceLastInterstitial: 0,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(getInitialGuestProfile);
  const [loadingUser, setLoadingUser] = useState(false);

  // Active Selected Categories (default 5 + any unlocked extras user wants)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([
    'name', 'animal', 'plant', 'inanimate', 'country'
  ]);

  // Active Match State
  const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [matchmakingQueueId, setMatchmakingQueueId] = useState<string | null>(null);
  const matchmakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Match History
  const [recentMatches, setRecentMatches] = useState<MatchHistoryItem[]>([]);

  // Modals & Drawers
  const [showShop, setShowShop] = useState(false);
  const [shopInitialTab, setShopInitialTab] = useState<'chests' | 'categories' | 'gems'>('categories');
  const [selectedBillingPack, setSelectedBillingPack] = useState<GemShopPack | null>(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  // Task System State
  const [tasksState, setTasksState] = useState<UserTasksState | null>(null);
  const [toastCompletedTask, setToastCompletedTask] = useState<TaskDefinition | null>(null);

  // 1. Initialize Auth & Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await initUserProfile(user);
          setUserProfile(profile);
          // Bootstrap admin roles if this is samergafer22@gmail.com
          await bootstrapAdminStatusIfNeeded(profile);
          const userTasks = await fetchUserTasks(user.uid);
          setTasksState(userTasks);
        } catch (e) {
          console.error('Error init profile/tasks/admin:', e);
        }
      } else {
        // Auto-login as guest for instant zero-friction experience
        try {
          const guestUser = await loginAnonymously();
          setCurrentUser(guestUser);
          const profile = await initUserProfile(guestUser);
          setUserProfile(profile);
          const userTasks = await fetchUserTasks(guestUser.uid);
          setTasksState(userTasks);
        } catch (err) {
          console.error('Guest login failed:', err);
        }
      }
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Profile Listener & Tasks Refresh
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUserProfile(currentUser.uid, (profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Helper: Track action towards daily/weekly tasks
  const trackUserTaskAction = async (actionType: TaskActionType, amount: number = 1) => {
    if (!tasksState || !currentUser) return;
    try {
      const { newState, newlyCompleted } = await recordTaskAction(tasksState, actionType, amount);
      setTasksState(newState);
      if (newlyCompleted.length > 0) {
        setToastCompletedTask(newlyCompleted[0]);
      }
    } catch (err) {
      console.error('Error recording task progress:', err);
    }
  };

  // Helper: Claim reward for completed task
  const handleClaimTask = async (taskId: string) => {
    if (!tasksState || !currentUser) return;
    try {
      const res = await claimTaskReward(tasksState, taskId);
      if (res.starsAwarded > 0 && res.newState) {
        setTasksState(res.newState);
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            stars: userProfile.stars + res.starsAwarded,
          });
        }
      }
    } catch (err) {
      console.error('Error claiming task reward:', err);
    }
  };

  // Check URL params for room code invite (?room=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && userProfile && !currentMatch) {
      handleJoinFriendRoom(roomParam);
    }
  }, [userProfile]);

  // 3. Matchmaker: Quick Match (Realtime Firestore Queue with Fast Bot Fallback)
  const handleStartQuickMatch = async () => {
    if (!userProfile || !currentUser) return;
    if (userProfile.stars < 20) {
      alert('عفواً، رصيدك من نجوم التحدي أقل من 20 نجمة. يمكنك مشاهدة إعلان مكافأة مجاني للحصول على +20 نجمة!');
      return;
    }

    setIsSearchingMatch(true);

    try {
      // Look for available waiting opponent in matchmaking collection
      const q = collection(db, 'matchmaking');
      const snap = await getDocs(q);
      
      let matchedDoc: any = null;
      snap.forEach((d) => {
        const data = d.data();
        if (data.uid !== currentUser.uid && !matchedDoc) {
          matchedDoc = { id: d.id, ...data };
        }
      });

      if (matchedDoc) {
        // Found waiting player! Create/Join match
        const matchId = `match_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const newMatch: MatchData = {
          id: matchId,
          code: Math.floor(100000 + Math.random() * 900000).toString(),
          status: 'choosing_letter',
          creatorId: matchedDoc.uid,
          guestId: currentUser.uid,
          players: [matchedDoc.uid, currentUser.uid],
          playerDetails: {
            [matchedDoc.uid]: {
              displayName: matchedDoc.displayName,
              photoURL: matchedDoc.photoURL,
              stars: matchedDoc.stars,
            },
            [currentUser.uid]: {
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
              stars: userProfile.stars,
            },
          },
          betStars: 20,
          totalPot: 40,
          currentRound: 1,
          maxRounds: 3,
          letterPickerId: matchedDoc.uid, // Creator picks round 1 letter
          currentLetter: '',
          isRareLetter: false,
          categories: selectedCategoryIds,
          roundDurationSec: 45,
          progress: {
            [matchedDoc.uid]: 0,
            [currentUser.uid]: 0,
          },
          currentAnswers: {
            [matchedDoc.uid]: {},
            [currentUser.uid]: {},
          },
          roundsHistory: [],
          matchScores: {
            [matchedDoc.uid]: { totalPoints: 0, roundsWon: 0 },
            [currentUser.uid]: { totalPoints: 0, roundsWon: 0 },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Save match
        await setDoc(doc(db, 'matches', matchId), newMatch);
        // Link match to opponent queue doc and delete it
        await updateDoc(doc(db, 'matchmaking', matchedDoc.id), { matchId });

        // Deduct 20 stars from current user
        await deductStars(currentUser.uid, 20);

        setCurrentMatch(newMatch);
        setIsSearchingMatch(false);
        subscribeToActiveMatch(matchId);

      } else {
        // No waiting player found, add self to queue
        const queueRef = doc(db, 'matchmaking', currentUser.uid);
        await setDoc(queueRef, {
          uid: currentUser.uid,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          stars: userProfile.stars,
          createdAt: Date.now(),
          matchId: null,
        });

        setMatchmakingQueueId(currentUser.uid);

        // Listen for when someone matches with me
        const unsub = onSnapshot(queueRef, async (s) => {
          const data = s.data();
          if (data && data.matchId) {
            unsub();
            deleteDoc(queueRef);
            setIsSearchingMatch(false);
            if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
            
            // Deduct 20 stars
            await deductStars(currentUser.uid, 20);
            subscribeToActiveMatch(data.matchId);
          }
        });

        // After 4.5 seconds of searching without human, spawn AI Challenger Bot
        matchmakingTimeoutRef.current = setTimeout(async () => {
          unsub();
          await deleteDoc(queueRef);
          setIsSearchingMatch(false);
          startBotMatchInternal(true);
        }, 4500);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      setIsSearchingMatch(false);
      // Fallback to bot match so player is never stuck
      startBotMatchInternal(true);
    }
  };

  const handleCancelMatchmaking = async () => {
    if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
    if (matchmakingQueueId) {
      try {
        await deleteDoc(doc(db, 'matchmaking', matchmakingQueueId));
      } catch (e) {
        // ignore
      }
    }
    setIsSearchingMatch(false);
    setMatchmakingQueueId(null);
  };

  // 4. Friend Challenge (Room Creation / Join)
  const handleCreateFriendRoom = async (): Promise<string> => {
    if (!userProfile || !currentUser) throw new Error('يرجى تسجيل الدخول أولاً');
    if (userProfile.stars < 20) throw new Error('رصيد نجوم التحدي غير كافٍ (تحتاج 20 ⭐)');

    const roomCode = `JDWL-${Math.floor(1000 + Math.random() * 9000)}`;
    const matchId = `match_friend_${Date.now()}`;

    const newMatch: MatchData = {
      id: matchId,
      code: roomCode,
      status: 'waiting',
      creatorId: currentUser.uid,
      players: [currentUser.uid],
      playerDetails: {
        [currentUser.uid]: {
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          stars: userProfile.stars,
        },
      },
      betStars: 20,
      totalPot: 40,
      currentRound: 1,
      maxRounds: 3,
      letterPickerId: currentUser.uid,
      currentLetter: '',
      isRareLetter: false,
      categories: selectedCategoryIds,
      roundDurationSec: 45,
      progress: { [currentUser.uid]: 0 },
      currentAnswers: { [currentUser.uid]: {} },
      roundsHistory: [],
      matchScores: {
        [currentUser.uid]: { totalPoints: 0, roundsWon: 0 },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, 'matches', matchId), newMatch);
    setCreatedRoomCode(roomCode);
    subscribeToActiveMatch(matchId);

    return roomCode;
  };

  const handleJoinFriendRoom = async (code: string) => {
    if (!userProfile || !currentUser) throw new Error('يرجى تسجيل الدخول');
    if (userProfile.stars < 20) throw new Error('رصيد نجوم التحدي غير كافٍ (تحتاج 20 ⭐)');

    const q = query(collection(db, 'matches'), where('code', '==', code.trim().toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('رمز الغرفة غير موجود أو انتهت المباراة');
    }

    const matchDoc = snap.docs[0];
    const matchData = matchDoc.data() as MatchData;

    if (matchData.players.includes(currentUser.uid)) {
      subscribeToActiveMatch(matchData.id);
      return;
    }

    if (matchData.players.length >= 2) {
      throw new Error('الغرفة ممتلئة بالكامل');
    }

    // Join match
    const updatedPlayers = [...matchData.players, currentUser.uid];
    const updatedPlayerDetails = {
      ...matchData.playerDetails,
      [currentUser.uid]: {
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        stars: userProfile.stars,
      },
    };

    await updateDoc(doc(db, 'matches', matchData.id), {
      guestId: currentUser.uid,
      players: updatedPlayers,
      playerDetails: updatedPlayerDetails,
      status: 'choosing_letter',
      progress: {
        ...matchData.progress,
        [currentUser.uid]: 0,
      },
      currentAnswers: {
        ...matchData.currentAnswers,
        [currentUser.uid]: {},
      },
      matchScores: {
        ...matchData.matchScores,
        [currentUser.uid]: { totalPoints: 0, roundsWon: 0 },
      },
      updatedAt: Date.now(),
    });

    // Deduct 20 stars
    await deductStars(currentUser.uid, 20);
    subscribeToActiveMatch(matchData.id);
  };

  // 5. Bot Match
  const startBotMatchInternal = (isWagered: boolean) => {
    if (!userProfile || !currentUser) return;
    
    const botId = 'bot_aljadwal';
    const botNames = ['روبوت_الجدول_الذكي', 'بطل_الحروف_الآلي', 'المتحدي_العربي'];
    const chosenBotName = botNames[Math.floor(Math.random() * botNames.length)];

    const matchId = `match_bot_${Date.now()}`;
    const botMatch: MatchData = {
      id: matchId,
      code: 'BOT-001',
      status: 'choosing_letter',
      isBotMatch: true,
      creatorId: currentUser.uid,
      guestId: botId,
      players: [currentUser.uid, botId],
      playerDetails: {
        [currentUser.uid]: {
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          stars: userProfile.stars,
        },
        [botId]: {
          displayName: chosenBotName,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${chosenBotName}`,
          stars: 500,
          isBot: true,
        },
      },
      betStars: isWagered ? 20 : 0,
      totalPot: isWagered ? 40 : 0,
      currentRound: 1,
      maxRounds: 3,
      letterPickerId: currentUser.uid, // User picks first round letter
      currentLetter: '',
      isRareLetter: false,
      categories: selectedCategoryIds,
      roundDurationSec: 45,
      progress: {
        [currentUser.uid]: 0,
        [botId]: 0,
      },
      currentAnswers: {
        [currentUser.uid]: {},
        [botId]: {},
      },
      roundsHistory: [],
      matchScores: {
        [currentUser.uid]: { totalPoints: 0, roundsWon: 0 },
        [botId]: { totalPoints: 0, roundsWon: 0 },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (isWagered) {
      deductStars(currentUser.uid, 20);
    }

    setCurrentMatch(botMatch);
  };

  const handleStartBotTraining = () => {
    startBotMatchInternal(false);
  };

  // Subscribe to Match Document
  const subscribeToActiveMatch = (matchId: string) => {
    const unsub = subscribeToMatch(matchId, (data) => {
      if (data) {
        setCurrentMatch(data);
      }
    });
  };

  // 6. Letter Selection
  const handleLetterSelected = async (letter: string) => {
    if (!currentMatch || !currentUser) return;
    const isRare = RARE_LETTERS_SET.has(letter);

    // Track rare letter task if player chose rare letter
    if (isRare) {
      trackUserTaskAction('use_rare_letter', 1);
    }

    const updatedMatch: Partial<MatchData> = {
      currentLetter: letter,
      isRareLetter: isRare,
      status: 'playing',
      roundStartTime: Date.now(),
      stoppedBy: undefined,
      stoppedAt: undefined,
      progress: {
        [currentMatch.players[0]]: 0,
        [currentMatch.players[1]]: 0,
      },
      currentAnswers: {
        [currentMatch.players[0]]: {},
        [currentMatch.players[1]]: {},
      },
      updatedAt: Date.now(),
    };

    if (currentMatch.isBotMatch) {
      setCurrentMatch({
        ...currentMatch,
        ...updatedMatch,
      } as MatchData);

      // Simulate Bot gradual typing and filling
      simulateBotRoundPlay(letter, currentMatch.categories);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), updatedMatch);
    }
  };

  // Simulate Bot typing during round
  const simulateBotRoundPlay = async (letter: string, categories: string[]) => {
    const botId = 'bot_aljadwal';
    try {
      const res = await fetch('/api/bot/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter, categories }),
      });
      const data = await res.json();
      const botAnswers = data.answers || {};

      // Incrementally update bot progress to simulate natural player typing
      let filled = 0;
      const interval = setInterval(() => {
        filled++;
        setCurrentMatch((prev) => {
          if (!prev || prev.status !== 'playing') {
            clearInterval(interval);
            return prev;
          }
          return {
            ...prev,
            progress: {
              ...prev.progress,
              [botId]: Math.min(filled, categories.length),
            },
            currentAnswers: {
              ...prev.currentAnswers,
              [botId]: botAnswers,
            },
          };
        });

        if (filled >= categories.length) {
          clearInterval(interval);
        }
      }, 4000 + Math.random() * 2000);
    } catch {
      // ignore
    }
  };

  // 7. Live Answers & Progress update
  const handleUpdateAnswers = async (answers: Record<string, string>, filledCount: number) => {
    if (!currentMatch || !currentUser) return;

    if (currentMatch.isBotMatch) {
      setCurrentMatch((prev) => prev ? ({
        ...prev,
        progress: { ...prev.progress, [currentUser.uid]: filledCount },
        currentAnswers: { ...prev.currentAnswers, [currentUser.uid]: answers },
      }) : null);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        [`progress.${currentUser.uid}`]: filledCount,
        [`currentAnswers.${currentUser.uid}`]: answers,
        updatedAt: Date.now(),
      });
    }
  };

  // 8. Trigger STOP Button or Time Expired
  const handleTriggerStop = async (finalAnswers: Record<string, string>) => {
    if (!currentMatch || !currentUser) return;
    // Track task for hitting stop first
    trackUserTaskAction('hit_stop_first', 1);
    await finalizeRound(finalAnswers, currentUser.uid);
  };

  const handleTimeExpired = async (finalAnswers: Record<string, string>) => {
    if (!currentMatch || !currentUser) return;
    await finalizeRound(finalAnswers, undefined);
  };

  // Authoritative Round Scoring Logic
  const finalizeRound = async (myAnswers: Record<string, string>, stoppedByUid?: string) => {
    if (!currentMatch || !currentUser) return;

    const opponentId = currentMatch.players.find((p) => p !== currentUser.uid) || 'bot_aljadwal';
    const opponentAnswers = currentMatch.currentAnswers?.[opponentId] || {};

    let roundEval: any;
    try {
      const res = await fetch('/api/match/calculate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: currentMatch.currentLetter,
          categories: currentMatch.categories,
          player1Uid: currentUser.uid,
          player1Answers: myAnswers,
          player2Uid: opponentId,
          player2Answers: opponentAnswers,
          stoppedBy: stoppedByUid,
        }),
      });
      const data = await res.json();
      roundEval = data;
    } catch (e) {
      // Local fallback
      roundEval = evaluateRoundAnswers(
        currentMatch.currentLetter,
        currentMatch.categories,
        currentUser.uid,
        myAnswers,
        opponentId,
        opponentAnswers,
        stoppedByUid
      );
    }

    const roundResult: RoundResult = {
      roundNumber: currentMatch.currentRound,
      letter: currentMatch.currentLetter,
      isRareLetter: roundEval.isRareLetter,
      multiplier: roundEval.multiplier,
      stoppedBy: stoppedByUid,
      stoppedAt: Date.now(),
      answers: {
        [currentUser.uid]: myAnswers,
        [opponentId]: opponentAnswers,
      },
      scores: roundEval.scores,
      winnerUid: roundEval.winnerUid,
    };

    // Calculate new match accumulated scores
    const myRoundPoints = roundEval.scores[currentUser.uid]?.totalPoints || 0;
    const opponentRoundPoints = roundEval.scores[opponentId]?.totalPoints || 0;

    // Track points task
    if (myRoundPoints > 0) {
      trackUserTaskAction('accumulate_points', myRoundPoints);
    }

    const prevMyScore = currentMatch.matchScores?.[currentUser.uid] || { totalPoints: 0, roundsWon: 0 };
    const prevOpponentScore = currentMatch.matchScores?.[opponentId] || { totalPoints: 0, roundsWon: 0 };

    const newMatchScores = {
      [currentUser.uid]: {
        totalPoints: prevMyScore.totalPoints + myRoundPoints,
        roundsWon: prevMyScore.roundsWon + (roundEval.winnerUid === currentUser.uid ? 1 : 0),
      },
      [opponentId]: {
        totalPoints: prevOpponentScore.totalPoints + opponentRoundPoints,
        roundsWon: prevOpponentScore.roundsWon + (roundEval.winnerUid === opponentId ? 1 : 0),
      },
    };

    const updatedRoundsHistory = [...currentMatch.roundsHistory, roundResult];

    const matchUpdate: Partial<MatchData> = {
      status: 'round_review',
      stoppedBy: stoppedByUid,
      stoppedAt: Date.now(),
      roundsHistory: updatedRoundsHistory,
      matchScores: newMatchScores,
      activeDisputes: {},
      updatedAt: Date.now(),
    };

    if (currentMatch.isBotMatch) {
      setCurrentMatch({
        ...currentMatch,
        ...matchUpdate,
      } as MatchData);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), matchUpdate);
    }
  };

  // 9. Next Round or Finish Match (Best of 3)
  const handleNextRoundOrFinish = async () => {
    if (!currentMatch || !currentUser) return;

    if (currentMatch.currentRound >= currentMatch.maxRounds) {
      // Finish Match! Determine winner
      const opponentId = currentMatch.players.find((p) => p !== currentUser.uid) || 'bot_aljadwal';
      const myTotal = currentMatch.matchScores[currentUser.uid]?.totalPoints || 0;
      const opponentTotal = currentMatch.matchScores[opponentId]?.totalPoints || 0;

      let winnerId: string | 'draw' = 'draw';
      if (myTotal > opponentTotal) winnerId = currentUser.uid;
      else if (opponentTotal > myTotal) winnerId = opponentId;

      const finishUpdate: Partial<MatchData> = {
        status: 'match_end',
        winnerId,
        updatedAt: Date.now(),
      };

      if (currentMatch.isBotMatch) {
        setCurrentMatch({ ...currentMatch, ...finishUpdate } as MatchData);
      } else {
        await updateDoc(doc(db, 'matches', currentMatch.id), finishUpdate);
      }

      // Handle wallet pot & stats
      await finalizeMatchRewards(winnerId, currentMatch);

    } else {
      // Advance to next round (alternate letter picker)
      const nextRoundNum = currentMatch.currentRound + 1;
      const opponentId = currentMatch.players.find((p) => p !== currentUser.uid) || 'bot_aljadwal';
      const nextPickerId = currentMatch.letterPickerId === currentUser.uid ? opponentId : currentUser.uid;

      const nextRoundUpdate: Partial<MatchData> = {
        currentRound: nextRoundNum,
        letterPickerId: nextPickerId,
        currentLetter: '',
        isRareLetter: false,
        status: 'choosing_letter',
        progress: {
          [currentUser.uid]: 0,
          [opponentId]: 0,
        },
        currentAnswers: {
          [currentUser.uid]: {},
          [opponentId]: {},
        },
        activeDisputes: {},
        updatedAt: Date.now(),
      };

      if (currentMatch.isBotMatch) {
        setCurrentMatch({ ...currentMatch, ...nextRoundUpdate } as MatchData);
        // If bot's turn to pick letter, pick after 1.5s
        if (nextPickerId === 'bot_aljadwal') {
          setTimeout(() => {
            const letters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'س', 'ص', 'ط', 'ع', 'ف', 'ق', 'ك', 'م', 'ن'];
            const randL = letters[Math.floor(Math.random() * letters.length)];
            handleLetterSelected(randL);
          }, 1500);
        }
      } else {
        await updateDoc(doc(db, 'matches', currentMatch.id), nextRoundUpdate);
      }
    }
  };

  // Authoritative Reward and Stats update
  const finalizeMatchRewards = async (winnerId: string | 'draw', match: MatchData) => {
    if (!currentUser || !userProfile) return;

    const isWinner = winnerId === currentUser.uid;
    const isDraw = winnerId === 'draw';
    const opponentId = match.players.find((p) => p !== currentUser.uid) || 'bot_aljadwal';
    const opponentDetails = match.playerDetails[opponentId] as { displayName: string; photoURL?: string } | undefined;
    const oppDisplayName = opponentDetails?.displayName || 'الخصم';
    const oppPhotoURL = opponentDetails?.photoURL;

    let starsDelta = 0;
    if (match.betStars > 0) {
      if (isWinner) {
        starsDelta = match.totalPot; // +40 Stars
        await awardStars(currentUser.uid, match.totalPot);
      } else if (isDraw) {
        starsDelta = 0;
        await awardStars(currentUser.uid, match.betStars); // Refund 20 Stars
      } else {
        starsDelta = -match.betStars; // -20 Stars
      }
    }

    const myScore = match.matchScores[currentUser.uid]?.totalPoints || 0;
    const oppScore = match.matchScores[opponentId]?.totalPoints || 0;

    // Update stats in userProfile
    const newStats = {
      wins: userProfile.stats.wins + (isWinner ? 1 : 0),
      losses: userProfile.stats.losses + (!isWinner && !isDraw ? 1 : 0),
      totalMatches: userProfile.stats.totalMatches + 1,
      roundsWon: userProfile.stats.roundsWon + (match.matchScores[currentUser.uid]?.roundsWon || 0),
      highestScore: Math.max(userProfile.stats.highestScore || 0, myScore),
    };

    const newMatchesCount = (userProfile.matchesPlayedSinceLastInterstitial || 0) + 1;
    let shouldShowInterstitial = false;
    let resetCount = newMatchesCount;

    if (newMatchesCount >= 4) {
      shouldShowInterstitial = true;
      resetCount = 0;
    }

    await updateDoc(doc(db, 'users', currentUser.uid), {
      stats: newStats,
      matchesPlayedSinceLastInterstitial: resetCount,
    });

    // Add to local match history
    const historyItem: MatchHistoryItem = {
      id: `hist_${Date.now()}`,
      matchId: match.id,
      opponentName: oppDisplayName,
      opponentPhoto: oppPhotoURL,
      isWin: isWinner,
      isDraw,
      playerScore: myScore,
      opponentScore: oppScore,
      starsDelta: isWinner ? match.totalPot - match.betStars : starsDelta,
      date: new Date().toLocaleDateString('ar-SA'),
    };

    setRecentMatches((prev) => [historyItem, ...prev.slice(0, 10)]);

    // Track Task actions for match completion
    trackUserTaskAction('play_matches', 1);
    if (isWinner) {
      trackUserTaskAction('win_matches', 1);
    }
    if (!match.isBotMatch && match.code) {
      trackUserTaskAction('play_friend_match', 1);
    }

    if (shouldShowInterstitial) {
      setTimeout(() => setShowInterstitialAd(true), 2000);
    }
  };

  // Helper: Deduct Stars
  const deductStars = async (uid: string, amount: number) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().stars || 0;
      await updateDoc(userRef, { stars: Math.max(0, current - amount) });
    }
  };

  // Helper: Award Stars
  const awardStars = async (uid: string, amount: number) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().stars || 0;
      await updateDoc(userRef, { stars: current + amount });
    }
  };

  // Helper: Award Gems
  const awardGems = async (uid: string, amount: number) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().gems || 0;
      await updateDoc(userRef, { gems: current + amount });
    }
  };

  // 10. Dispute Handlers
  const handleRaiseDispute = async (categoryId: string, word: string) => {
    if (!currentMatch || !currentUser) return;
    const opponentId = currentMatch.players.find((p) => p !== currentUser.uid) || 'bot_aljadwal';

    const disputeKey = `${categoryId}_${Date.now()}`;
    const disputeData = {
      categoryId,
      raisedBy: currentUser.uid,
      targetUid: opponentId,
      word,
      status: 'open' as const,
      expiresAt: Date.now() + 15000,
    };

    if (currentMatch.isBotMatch) {
      setCurrentMatch({
        ...currentMatch,
        activeDisputes: {
          ...currentMatch.activeDisputes,
          [disputeKey]: disputeData,
        },
      });
      // Bot auto responds
      setTimeout(() => {
        handleJustifyWord(categoryId, 'الكلمة عربية فصيحة ومثبتة بالمعجم العربي');
      }, 1200);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        [`activeDisputes.${disputeKey}`]: disputeData,
      });
    }
  };

  const handleWithdrawWord = async (categoryId: string) => {
    if (!currentMatch || !currentUser) return;
    // Set points to 0 for this category in latest round
    const latest = currentMatch.roundsHistory[currentMatch.roundsHistory.length - 1];
    if (latest && latest.scores[currentUser.uid]?.breakdown[categoryId]) {
      const p = latest.scores[currentUser.uid].breakdown[categoryId].points;
      latest.scores[currentUser.uid].breakdown[categoryId].points = 0;
      latest.scores[currentUser.uid].breakdown[categoryId].isValid = false;
      latest.scores[currentUser.uid].totalPoints -= p;

      // Update match scores
      currentMatch.matchScores[currentUser.uid].totalPoints -= p;

      if (!currentMatch.isBotMatch) {
        await updateDoc(doc(db, 'matches', currentMatch.id), {
          roundsHistory: currentMatch.roundsHistory,
          matchScores: currentMatch.matchScores,
          activeDisputes: {},
        });
      }
    }
  };

  const handleJustifyWord = async (categoryId: string, justification: string) => {
    if (!currentMatch || !currentUser) return;
    if (currentMatch.isBotMatch) {
      setCurrentMatch((prev) => prev ? ({
        ...prev,
        activeDisputes: {
          ...prev.activeDisputes,
          [categoryId]: {
            ...prev.activeDisputes?.[categoryId],
            categoryId,
            raisedBy: 'bot',
            targetUid: currentUser.uid,
            word: '',
            status: 'justified',
            justification,
            expiresAt: 0,
          },
        },
      }) : null);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        [`activeDisputes.${categoryId}.status`]: 'justified',
        [`activeDisputes.${categoryId}.justification`]: justification,
      });
    }
  };

  // 10.5 Quick Chat / Reaction System
  const handleSendQuickChat = async (message: string, emoji?: string) => {
    if (!currentMatch || !currentUser || !userProfile) return;

    const chatItem: MatchQuickChat = {
      id: `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      senderUid: currentUser.uid,
      senderName: userProfile.displayName,
      message,
      emoji,
      timestamp: Date.now(),
    };

    if (currentMatch.isBotMatch) {
      setCurrentMatch({
        ...currentMatch,
        lastChat: chatItem,
        updatedAt: Date.now(),
      });

      // Bot automatically reacts back with realistic conversational sportsmanship after a short delay
      setTimeout(() => {
        const botReplies = [
          { message: 'أحسنت يا بطل! 👏', emoji: '👏' },
          { message: 'واو! مستوى ناري! 🔥', emoji: '🔥' },
          { message: 'حظ أوفر، جولة قوية جداً! 🤝', emoji: '🤝' },
          { message: 'لقد فاجأتني بهذه السرعة! 😲', emoji: '😲' },
          { message: 'تحدي ممتع وقوي! 💪', emoji: '💪' },
          { message: 'لعبة رائعة، لنرى الجولة التالية! ⭐', emoji: '⭐' },
          { message: 'سرعة بديهة خرافية! ⚡', emoji: '⚡' },
        ];
        const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
        const botChat: MatchQuickChat = {
          id: `bot_chat_${Date.now()}`,
          senderUid: 'bot_aljadwal',
          senderName: 'الروبوت الذكي',
          message: randomReply.message,
          emoji: randomReply.emoji,
          timestamp: Date.now(),
        };
        setCurrentMatch((prev) => prev ? { ...prev, lastChat: botChat, updatedAt: Date.now() } : null);
      }, 1400);

    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        lastChat: chatItem,
        updatedAt: Date.now(),
      });
    }
  };

  // 11. Surrender / Cancel Match
  const handleSurrender = async () => {
    if (!currentMatch || !currentUser) return;
    const confirm = window.confirm('هل أنت متأكد من الانسحاب؟ ستُعاد النجوم المراهن بها أو تُحسب خسارة.');
    if (!confirm) return;

    if (currentMatch.isBotMatch) {
      setCurrentMatch(null);
    } else {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        status: 'cancelled',
        updatedAt: Date.now(),
      });
      setCurrentMatch(null);
    }
  };

  // 12. Rewarded Ad Claim (+20 Stars)
  const handleClaimAdReward = async () => {
    if (!currentUser || !userProfile) return;
    try {
      const res = await fetch('/api/user/claim-daily-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCount: userProfile.rewardedAdsToday,
          lastRewardDate: userProfile.lastRewardDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await awardStars(currentUser.uid, 20);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          rewardedAdsToday: data.rewardedAdsToday,
          lastRewardDate: data.lastRewardDate,
        });
        trackUserTaskAction('watch_rewarded_ad', 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to open shop with specific tab
  const handleOpenShop = (tab: 'chests' | 'categories' | 'gems' = 'categories') => {
    soundManager.playClick();
    setShopInitialTab(tab);
    setShowShop(true);
  };

  // 13. Shop: Buy Gems Pack (Google Play & Web Payments)
  const handleBuyGems = async (pack: GemShopPack) => {
    const totalGems = pack.gems + pack.bonusGems;
    const newGems = (userProfile.gems || 0) + totalGems;
    setUserProfile((prev) => ({ ...prev, gems: newGems }));
    haptics.success();
    soundManager.playReward();

    if (currentUser?.uid && !currentUser.uid.startsWith('guest_')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          gems: newGems,
        });
      } catch (e) {
        console.warn('Firestore gems update note:', e);
      }
    } else {
      try {
        const guestData = { ...userProfile, gems: newGems };
        localStorage.setItem('aljadwal_guest_profile', JSON.stringify(guestData));
      } catch (e) {}
    }
  };

  // 14. Shop: Unlock Category
  const handleUnlockCategory = async (categoryId: string) => {
    const cat = ALL_CATEGORIES.find(c => c.id === categoryId);
    const price = cat?.gemPrice || 40;

    if ((userProfile.gems || 0) < price) {
      throw new Error(`رصيد الجواهر غير كافٍ. تحتاج إلى ${price} 💎`);
    }

    const remainingGems = Math.max(0, (userProfile.gems || 0) - price);
    const updatedList = Array.from(new Set([...(userProfile.unlockedCategories || []), categoryId]));

    setUserProfile((prev) => ({
      ...prev,
      gems: remainingGems,
      unlockedCategories: updatedList,
    }));
    setSelectedCategoryIds((prev) => Array.from(new Set([...prev, categoryId])));

    if (currentUser?.uid && !currentUser.uid.startsWith('guest_')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          gems: remainingGems,
          unlockedCategories: updatedList,
        });
      } catch (err) {
        console.warn('Firestore category unlock note:', err);
      }
    } else {
      try {
        const guestData = { ...userProfile, gems: remainingGems, unlockedCategories: updatedList };
        localStorage.setItem('aljadwal_guest_profile', JSON.stringify(guestData));
      } catch (e) {}
    }
  };

  // 14b. Shop: Claim Mystery Chest Reward
  const handleClaimChestReward = async (
    cost: { stars?: number; gems?: number },
    reward: { stars: number; gems: number; hints: number; categoryId?: string }
  ) => {
    const currentStars = userProfile.stars || 0;
    const currentGems = userProfile.gems || 0;
    const currentHints = userProfile.hints || 3;
    const currentCategories = userProfile.unlockedCategories || [];

    const newStars = Math.max(0, currentStars - (cost.stars || 0)) + (reward.stars || 0);
    const newGems = Math.max(0, currentGems - (cost.gems || 0)) + (reward.gems || 0);
    const newHints = currentHints + (reward.hints || 0);
    const newCategories = [...currentCategories];
    if (reward.categoryId && !newCategories.includes(reward.categoryId)) {
      newCategories.push(reward.categoryId);
    }

    setUserProfile((prev) => ({
      ...prev,
      stars: newStars,
      gems: newGems,
      hints: newHints,
      unlockedCategories: newCategories,
    }));

    if (reward.categoryId) {
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, reward.categoryId!])));
    }

    if (currentUser?.uid && !currentUser.uid.startsWith('guest_')) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          stars: newStars,
          gems: newGems,
          hints: newHints,
          unlockedCategories: newCategories,
        });
      } catch (err) {
        console.warn('Firestore chest sync note:', err);
      }
    } else {
      try {
        const guestData = {
          ...userProfile,
          stars: newStars,
          gems: newGems,
          hints: newHints,
          unlockedCategories: newCategories,
        };
        localStorage.setItem('aljadwal_guest_profile', JSON.stringify(guestData));
      } catch (e) {}
    }
  };

  // Toggle Category selection in Lobby
  const handleToggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      if (selectedCategoryIds.length <= 3) {
        alert('يجب أن تحتوي اللعبة على 3 فئات على الأقل!');
        return;
      }
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  // 15. Daily Lucky Spin Reward Handler (Strict 24-Hour Cooldown & Anti-Cheat Validation)
  const handleSpinWheelReward = async (reward: LuckySpinReward) => {
    if (!currentUser || !userProfile) return;

    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // 1. Anti-Tamper Check: Sanitize reward values from segment index
    const segmentIdNumber = parseInt((reward.id || '').replace('spin_', ''), 10);
    const sanitized = sanitizeAndValidateSpinReward(isNaN(segmentIdNumber) ? 7 : segmentIdNumber);

    const nextStreak = calculateNextStreak(userProfile);
    const updatedStars = (userProfile.stars || 0) + (sanitized.stars || 0);
    const updatedGems = (userProfile.gems || 0) + (sanitized.gems || 0);
    const updatedHints = (userProfile.hints || 0) + (sanitized.hints || 0);
    const updatedSpinsCount = (userProfile.luckySpinsCount || 0) + 1;

    const updatedProfileData: UserProfile = {
      ...userProfile,
      stars: updatedStars,
      gems: updatedGems,
      hints: updatedHints,
      lastLuckySpinDate: today,
      lastLuckySpinTime: now,
      luckySpinStreak: nextStreak,
      luckySpinsCount: updatedSpinsCount,
    };

    // Update state immediately
    setUserProfile(updatedProfileData);

    // Save device & user locks in localStorage
    try {
      localStorage.setItem(`aljadwal_lucky_spin_ts_${currentUser.uid}`, now.toString());
      localStorage.setItem('aljadwal_lucky_spin_ts_device', now.toString());
      localStorage.setItem('aljadwal_guest_profile', JSON.stringify(updatedProfileData));
    } catch (e) {}

    // Persist to Firestore if registered user
    if (currentUser.uid && !currentUser.uid.startsWith('guest_')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          stars: updatedStars,
          gems: updatedGems,
          hints: updatedHints,
          lastLuckySpinDate: today,
          lastLuckySpinTime: now,
          luckySpinStreak: nextStreak,
          luckySpinsCount: updatedSpinsCount,
        });
      } catch (err) {
        console.warn('Firestore lucky spin sync note:', err);
      }
    }

    trackUserTaskAction('spin_lucky_wheel', 1);
  };

  // 16. Claim Achievement Reward Handler
  const handleClaimAchievementReward = async (achievementId: string, rewardStars: number, rewardGems: number) => {
    if (!currentUser || !userProfile) return;

    const currentAchievements = { ...(userProfile.achievements || {}) };
    currentAchievements[achievementId] = {
      completed: true,
      claimed: true,
      claimedAt: Date.now(),
    };

    const newStars = userProfile.stars + rewardStars;
    const newGems = userProfile.gems + rewardGems;

    await updateDoc(doc(db, 'users', currentUser.uid), {
      achievements: currentAchievements,
      stars: newStars,
      gems: newGems,
    });

    setUserProfile({
      ...userProfile,
      achievements: currentAchievements,
      stars: newStars,
      gems: newGems,
    });
  };

  // 17. In-game Hint Item Handler
  const handleUseHintItem = async (categoryId: string): Promise<boolean> => {
    if (!currentUser || !userProfile) return false;

    const availableHints = userProfile.hints || 0;
    const availableGems = userProfile.gems || 0;

    if (availableHints > 0) {
      const nextHints = availableHints - 1;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        hints: nextHints,
      });
      setUserProfile({
        ...userProfile,
        hints: nextHints,
      });
      return true;
    } else if (availableGems >= 5) {
      const nextGems = availableGems - 5;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        gems: nextGems,
      });
      setUserProfile({
        ...userProfile,
        gems: nextGems,
      });
      return true;
    }

    return false;
  };

  // 18. Delete Account Confirmed Handler (Google Play Policy Compliance)
  const handleDeleteAccountConfirmed = async () => {
    if (!currentUser) return;
    try {
      await deleteUserAccount(currentUser.uid);
      setCurrentUser(null);
      setUserProfile(null);
      setShowDeleteAccount(false);
      setShowSidebar(false);
      haptics.warning();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('حدث خطأ أثناء حذف الحساب، يرجى المحاولة مرة أخرى.');
    }
  };

  // Auth Handlers
  const handleLoginGoogle = async () => {
    const user = await loginWithGoogle();
    setCurrentUser(user);
    const profile = await initUserProfile(user);
    setUserProfile(profile);
  };

  const handleLoginGuest = async (customName: string) => {
    const user = await loginAnonymously(customName);
    setCurrentUser(user);
    const profile = await initUserProfile(user, customName);
    setUserProfile(profile);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 animate-spin">
            جـ
          </div>
          <p className="text-sm font-bold text-slate-300 font-['Cairo']">
            جاري تهيئة لعبة الجدول...
          </p>
        </div>
      </div>
    );
  }

  // Active game view conditions
  const isMatchActive = currentMatch && currentMatch.status !== 'cancelled';
  const latestRound = currentMatch?.roundsHistory?.[currentMatch.roundsHistory.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navigation */}
      <Navbar
        userProfile={userProfile}
        onOpenShop={handleOpenShop}
        onOpenRewardedAd={() => setShowRewardedAd(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenDailyChallenge={() => setShowDailyChallenge(true)}
        onOpenTasks={() => setShowTasksModal(true)}
        unclaimedTasksCount={tasksState ? countUnclaimedTasks(tasksState) : 0}
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {isMatchActive && currentMatch ? (
          /* ACTIVE MATCH VIEW */
          <div className="pt-4">
            
            {/* Active Round Play Screen */}
            {currentMatch.status === 'playing' && (
              <GameView
                match={currentMatch}
                currentUser={userProfile!}
                onUpdateAnswers={handleUpdateAnswers}
                onTriggerStop={handleTriggerStop}
                onTimeExpired={handleTimeExpired}
                onSurrender={handleSurrender}
                onGoHome={() => setCurrentMatch(null)}
                onUseHintItem={handleUseHintItem}
                onSendChat={handleSendQuickChat}
              />
            )}

            {/* Choosing Letter Modal */}
            {currentMatch.status === 'choosing_letter' && (
              <LetterPickerModal
                roundNumber={currentMatch.currentRound}
                isMyTurn={currentMatch.letterPickerId === currentUser?.uid}
                pickerName={currentMatch.playerDetails[currentMatch.letterPickerId]?.displayName || 'اللاعب'}
                onLetterSelected={handleLetterSelected}
                onGoHome={() => setCurrentMatch(null)}
              />
            )}

            {/* Round Review & Objection Window */}
            {currentMatch.status === 'round_review' && latestRound && (
              <RoundReviewModal
                match={currentMatch}
                currentUser={userProfile!}
                latestRound={latestRound}
                onNextRoundOrFinish={handleNextRoundOrFinish}
                onRaiseDispute={handleRaiseDispute}
                onWithdrawWord={handleWithdrawWord}
                onJustifyWord={handleJustifyWord}
                onGoHome={() => setCurrentMatch(null)}
                onSendChat={handleSendQuickChat}
              />
            )}

            {/* Match Ended Final Ceremony */}
            {currentMatch.status === 'match_end' && (
              <MatchResultModal
                match={currentMatch}
                currentUser={userProfile!}
                onPlayAgain={() => {
                  setCurrentMatch(null);
                  handleStartQuickMatch();
                }}
                onGoHome={() => setCurrentMatch(null)}
                onSendChat={handleSendQuickChat}
              />
            )}

          </div>
        ) : (
          /* LOBBY / HOME DASHBOARD */
          <LobbyView
            userProfile={userProfile}
            selectedCategoryIds={selectedCategoryIds}
            onToggleCategory={handleToggleCategory}
            onStartQuickMatch={handleStartQuickMatch}
            onOpenFriendChallenge={() => setShowFriendModal(true)}
            onStartBotMatch={handleStartBotTraining}
            onOpenRewardedAd={() => setShowRewardedAd(true)}
            onOpenShop={handleOpenShop}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenDailyChallenge={() => setShowDailyChallenge(true)}
            onOpenTasks={() => setShowTasksModal(true)}
            onOpenLuckySpin={() => setShowLuckySpin(true)}
            onOpenAchievements={() => setShowAchievements(true)}
            onOpenAdmin={() => setShowAdminPanel(true)}
            onOpenAuth={() => setShowAuthModal(true)}
            tasksState={tasksState || undefined}
            recentMatches={recentMatches}
            isSearchingMatch={isSearchingMatch}
            onCancelMatchmaking={handleCancelMatchmaking}
          />
        )}
      </main>

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        userProfile={userProfile}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenDailyChallenge={() => setShowDailyChallenge(true)}
        onOpenTasks={() => setShowTasksModal(true)}
        unclaimedTasksCount={tasksState ? countUnclaimedTasks(tasksState) : 0}
        onOpenLuckySpin={() => setShowLuckySpin(true)}
        onOpenAchievements={() => setShowAchievements(true)}
        onOpenShop={handleOpenShop}
        onOpenFriendChallenge={() => setShowFriendModal(true)}
        onOpenRewardedAd={() => setShowRewardedAd(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenRules={() => {
          // If in lobby, scroll or open info
          const rulesElem = document.getElementById('how-to-play-card');
          if (rulesElem) {
            rulesElem.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenPrivacyPolicy={() => setShowPrivacyPolicy(true)}
        onOpenDeleteAccount={() => setShowDeleteAccount(true)}
      />

      {/* MODALS */}
      {showLuckySpin && (
        <DailyLuckySpinModal
          isOpen={showLuckySpin}
          onClose={() => setShowLuckySpin(false)}
          userProfile={userProfile}
          onRewardGranted={handleSpinWheelReward}
        />
      )}

      {showAchievements && (
        <AchievementsModal
          isOpen={showAchievements}
          onClose={() => setShowAchievements(false)}
          userProfile={userProfile}
          onClaimAchievementReward={handleClaimAchievementReward}
        />
      )}

      {showPrivacyPolicy && (
        <PrivacyPolicyModal
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />
      )}

      {showDeleteAccount && userProfile && (
        <DeleteAccountModal
          isOpen={showDeleteAccount}
          onClose={() => setShowDeleteAccount(false)}
          onConfirmDelete={handleDeleteAccountConfirmed}
          userDisplayName={userProfile.displayName}
        />
      )}

      {showDailyChallenge && (
        <DailyChallengeModal
          currentUser={userProfile}
          onClose={() => setShowDailyChallenge(false)}
          onRewardStars={async (amount) => {
            if (currentUser?.uid) {
              await awardStars(currentUser.uid, amount);
            }
          }}
          onRewardGems={async (amount) => {
            if (currentUser?.uid) {
              await awardGems(currentUser.uid, amount);
            }
          }}
          onDailyChallengeCompleted={() => {
            trackUserTaskAction('complete_daily_challenge', 1);
          }}
          onOpenAuth={() => {
            setShowDailyChallenge(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {showTasksModal && tasksState && (
        <TasksModal
          userTasks={tasksState}
          onClose={() => setShowTasksModal(false)}
          onClaimReward={handleClaimTask}
        />
      )}

      {/* Toast Notification for Task Completion */}
      <TaskNotificationToast
        task={toastCompletedTask}
        onClose={() => setToastCompletedTask(null)}
        onOpenTasks={() => {
          setToastCompletedTask(null);
          setShowTasksModal(true);
        }}
      />

      {showLeaderboard && (
        <Leaderboard
          currentUser={userProfile}
          onClose={() => setShowLeaderboard(false)}
          onOpenQuickMatch={handleStartQuickMatch}
          onOpenDailyChallenge={() => {
            setShowLeaderboard(false);
            setShowDailyChallenge(true);
          }}
        />
      )}

      {showShop && (
        <ShopModal
          userProfile={userProfile}
          initialTab={shopInitialTab}
          onClose={() => setShowShop(false)}
          onSelectPackToBuy={(pack) => setSelectedBillingPack(pack)}
          onUnlockCategory={handleUnlockCategory}
          onClaimChestReward={handleClaimChestReward}
        />
      )}

      {selectedBillingPack && userProfile && (
        <GooglePlayBillingSheet
          pack={selectedBillingPack}
          userProfile={userProfile}
          onClose={() => setSelectedBillingPack(null)}
          onSuccess={handleBuyGems}
        />
      )}

      {showRewardedAd && userProfile && (
        <RewardedAdModal
          onClose={() => setShowRewardedAd(false)}
          onClaimReward={handleClaimAdReward}
          currentCount={userProfile.rewardedAdsToday}
        />
      )}

      {showInterstitialAd && (
        <InterstitialAdModal onClose={() => setShowInterstitialAd(false)} />
      )}

      {showFriendModal && (
        <FriendInviteModal
          onClose={() => setShowFriendModal(false)}
          onCreateRoom={handleCreateFriendRoom}
          onJoinRoom={handleJoinFriendRoom}
          currentCreatedCode={createdRoomCode}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginGoogle={handleLoginGoogle}
          onLoginGuest={handleLoginGuest}
          onAuthSuccess={async (user) => {
            setCurrentUser(user);
            try {
              const profile = await initUserProfile(user);
              setUserProfile(profile);
              await bootstrapAdminStatusIfNeeded(profile);
              const userTasks = await fetchUserTasks(user.uid);
              setTasksState(userTasks);
            } catch (e) {
              console.error('Error post-auth setup:', e);
            }
            setShowAuthModal(false);
          }}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && userProfile && (
        <AdminPanelModal
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          currentUserProfile={userProfile}
        />
      )}

    </div>
  );
}
