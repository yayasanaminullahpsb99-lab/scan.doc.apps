import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_LEVELS, TIERS } from './data/levels';
import { LevelData, PlayerStats, PuzzleTier } from './types/game';
import {
  loadPlayerStats,
  savePlayerStats,
  calculateTotalStars,
  calculateStarRating,
} from './utils/gameState';
import {
  playTap,
  playCorrect,
  playWrong,
  playCoin,
} from './utils/sfx';

import { GameHeader } from './components/GameHeader';
import { LevelSelectMap } from './components/LevelSelectMap';
import { HintModal } from './components/HintModal';
import { LevelClearModal } from './components/LevelClearModal';
import { DatabaseViewerModal } from './components/DatabaseViewerModal';
import { InteractivePuzzle } from './components/InteractivePuzzle';

import {
  BrainCircuit,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Coins,
  Star,
  Send,
  Delete,
  CornerDownLeft,
  Compass,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [activeLevelId, setActiveLevelId] = useState<number>(() => {
    const loaded = loadPlayerStats();
    return loaded.currentLevel || 1;
  });

  // Modals state
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showDatabase, setShowDatabase] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Active level state
  const [userInput, setUserInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | null; message: string }>({
    type: null,
    message: '',
  });
  const [attempts, setAttempts] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<{ hint1: boolean; hint2: boolean; solution: boolean }>({
    hint1: false,
    hint2: false,
    solution: false,
  });

  // Level Clear Celebration Data
  const [clearData, setClearData] = useState<{
    stars: number;
    earnedCoins: number;
    timeSpentSec: number;
  }>({
    stars: 3,
    earnedCoins: 25,
    timeSpentSec: 0,
  });

  // Timer
  const [timerSec, setTimerSec] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Current Level Object
  const currentLevel: LevelData =
    ALL_LEVELS.find((l) => l.id === activeLevelId) || ALL_LEVELS[0];
  const currentTierInfo =
    TIERS.find((t) => t.id === currentLevel.tier) || TIERS[0];
  const totalStars = calculateTotalStars(stats.progress);

  // Save stats on change
  useEffect(() => {
    savePlayerStats(stats);
  }, [stats]);

  // Reset input & timer when active level changes
  useEffect(() => {
    setUserInput('');
    setFeedback({ type: null, message: '' });
    setAttempts(0);
    setTimerSec(0);
    setIsTimerRunning(true);

    // Retrieve previous hints used if completed or cached
    const existingProgress = stats.progress[activeLevelId];
    if (existingProgress) {
      setHintsUsed({
        hint1: Boolean(existingProgress.hint1Used),
        hint2: Boolean(existingProgress.hint2Used),
        solution: Boolean(existingProgress.solutionUsed),
      });
    } else {
      setHintsUsed({ hint1: false, hint2: false, solution: false });
    }
  }, [activeLevelId]);

  // Timer interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextSound = !stats.soundEnabled;
    playTap(nextSound);
    setStats((prev) => ({ ...prev, soundEnabled: nextSound }));
  };

  // Switch level
  const handleSelectLevel = (levelId: number) => {
    if (levelId > stats.unlockedLevel) return;
    setActiveLevelId(levelId);
    setStats((prev) => ({ ...prev, currentLevel: levelId }));
    setShowMap(false);
  };

  // Complete level
  const handleLevelCompleted = useCallback(() => {
    setIsTimerRunning(false);
    playCorrect(stats.soundEnabled);

    const calculatedStars = calculateStarRating(hintsUsed, timerSec, attempts);
    const existing = stats.progress[activeLevelId];
    const prevStars = existing?.stars || 0;
    const finalStars = Math.max(calculatedStars, prevStars);

    // Coins reward: base 25, bonus 10 for 3 stars
    const bonusCoins = finalStars === 3 ? 35 : finalStars === 2 ? 25 : 15;

    setClearData({
      stars: calculatedStars,
      earnedCoins: bonusCoins,
      timeSpentSec: timerSec,
    });

    const nextUnlocked = Math.max(stats.unlockedLevel, Math.min(activeLevelId + 1, 100));

    setStats((prev) => {
      const nextProgress = {
        ...prev.progress,
        [activeLevelId]: {
          levelId: activeLevelId,
          completed: true,
          stars: finalStars,
          bestTimeSec:
            existing?.bestTimeSec && existing.bestTimeSec < timerSec
              ? existing.bestTimeSec
              : timerSec,
          hint1Used: hintsUsed.hint1,
          hint2Used: hintsUsed.hint2,
          solutionUsed: hintsUsed.solution,
          completedAt: new Date().toISOString(),
        },
      };

      return {
        ...prev,
        coins: prev.coins + bonusCoins,
        unlockedLevel: nextUnlocked,
        currentLevel: activeLevelId,
        progress: nextProgress,
      };
    });

    setShowClearModal(true);
  }, [hintsUsed, timerSec, attempts, stats.progress, stats.soundEnabled, stats.unlockedLevel, activeLevelId]);

  // Answer normalizer
  const normalize = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/[\s\-_.,/]/g, '');
  };

  // Submit Answer
  const handleSubmitAnswer = (rawAnswer?: string) => {
    const given = rawAnswer !== undefined ? rawAnswer : userInput;
    if (!given.toString().trim()) return;

    const accepted = Array.isArray(currentLevel.answer)
      ? currentLevel.answer
      : [currentLevel.answer];

    const isMatch = accepted.some((ans) => {
      if (typeof ans === 'number') {
        const num = parseFloat(given.toString().replace(/,/g, '.'));
        return !isNaN(num) && num === ans;
      }
      return normalize(given.toString()) === normalize(ans.toString());
    });

    if (isMatch) {
      setFeedback({ type: 'correct', message: 'Jawaban Benar! Kerja logika yang luar biasa!' });
      handleLevelCompleted();
    } else {
      playWrong(stats.soundEnabled);
      setAttempts((prev) => prev + 1);
      setFeedback({
        type: 'wrong',
        message: 'Jawaban kurang tepat. Pikirkan kembali atau gunakan Hint jika buntu!',
      });
      setTimeout(() => {
        setFeedback((prev) => (prev.type === 'wrong' ? { type: null, message: '' } : prev));
      }, 3000);
    }
  };

  // Unlock hint
  const handleUnlockHint = (type: 'hint1' | 'hint2' | 'solution', cost: number) => {
    setStats((prev) => ({
      ...prev,
      coins: Math.max(0, prev.coins - cost),
    }));

    setHintsUsed((prev) => ({
      ...prev,
      [type]: true,
    }));
  };

  // Next level action
  const handleNextLevel = () => {
    setShowClearModal(false);
    if (activeLevelId < 100) {
      setActiveLevelId((prev) => prev + 1);
      setStats((prev) => ({ ...prev, currentLevel: activeLevelId + 1 }));
    } else {
      setShowMap(true);
    }
  };

  // Reset Progress
  const handleResetAllProgress = () => {
    playTap(stats.soundEnabled);
    localStorage.removeItem('100_steps_of_logic_player_save_v1');
    setStats({
      coins: 100,
      currentLevel: 1,
      unlockedLevel: 1,
      progress: {},
      soundEnabled: stats.soundEnabled,
    });
    setActiveLevelId(1);
    setShowResetConfirm(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter') {
          handleSubmitAnswer();
        }
        return;
      }

      if (e.key === 'ArrowRight' && activeLevelId < stats.unlockedLevel) {
        setActiveLevelId((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && activeLevelId > 1) {
        setActiveLevelId((prev) => prev - 1);
      } else if (e.key.toLowerCase() === 'h') {
        setShowHintModal(true);
      } else if (e.key.toLowerCase() === 'm') {
        setShowMap(true);
      } else if (currentLevel.type === 'multiple_choice' && currentLevel.options) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= currentLevel.options.length) {
          playTap(stats.soundEnabled);
          handleSubmitAnswer(currentLevel.options[keyNum - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLevelId, stats.unlockedLevel, currentLevel, userInput]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-amber-400 selection:text-slate-950">
      {/* 1. Header Bar */}
      <GameHeader
        stats={stats}
        currentTier={currentLevel.tier}
        totalStars={totalStars}
        onOpenMap={() => setShowMap(true)}
        onOpenDatabase={() => setShowDatabase(true)}
        onToggleSound={handleToggleSound}
        onResetProgress={() => setShowResetConfirm(true)}
      />

      {/* 2. Main Game Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between gap-6">
        {/* Tier & Level Breadcrumb Bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 text-sm">
              Langkah #{currentLevel.id}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-medium">100 Level</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-slate-400 font-semibold">{currentLevel.category}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer */}
            <div className="font-mono text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              Waktu: <span className="text-amber-300">{formatTime(timerSec)}</span>
            </div>

            {/* Stars Potential Preview */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((starIdx) => {
                const currentRating = calculateStarRating(hintsUsed, timerSec, attempts);
                const hasStar = starIdx <= currentRating;
                return (
                  <Star
                    key={starIdx}
                    className={`w-4 h-4 transition-colors ${
                      hasStar ? 'text-amber-400 fill-amber-400' : 'text-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Puzzle Card Container */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Level Title & Header */}
          <div className="flex flex-col gap-1.5 border-b border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {currentTierInfo.name} · {currentTierInfo.levelRange}
              </span>
              {stats.progress[activeLevelId]?.completed && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terselesaikan
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {currentLevel.title}
            </h2>
          </div>

          {/* Question / Prompt */}
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800/60">
            {currentLevel.prompt}
          </div>

          {/* Puzzle Input Area based on Type */}
          <div className="w-full flex flex-col gap-4">
            {/* TYPE 1: MULTIPLE CHOICE */}
            {currentLevel.type === 'multiple_choice' && currentLevel.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentLevel.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        playTap(stats.soundEnabled);
                        handleSubmitAnswer(option);
                      }}
                      className="group flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/60 text-left transition-all transform active:scale-98 shadow-sm cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-amber-400 group-hover:text-slate-950 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700 transition-colors">
                        {letter}
                      </span>
                      <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TYPE 2: NUMBER INPUT */}
            {currentLevel.type === 'number_input' && (
              <div className="flex flex-col items-center gap-4">
                {/* Numeric Input Display */}
                <div className="w-full max-w-sm flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ketik angka jawaban..."
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-lg font-mono font-bold text-center text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleSubmitAnswer()}
                    className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition transform active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Jawab</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* On-Screen Keypad for Touch / Mobile */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-xs pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        playTap(stats.soundEnabled);
                        setUserInput((prev) => prev + num.toString());
                      }}
                      className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-mono font-bold text-white transition active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      playTap(stats.soundEnabled);
                      setUserInput('');
                    }}
                    className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-rose-400 transition"
                  >
                    C
                  </button>
                  <button
                    onClick={() => {
                      playTap(stats.soundEnabled);
                      setUserInput((prev) => prev + '0');
                    }}
                    className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-mono font-bold text-white transition active:scale-95"
                  >
                    0
                  </button>
                  <button
                    onClick={() => {
                      playTap(stats.soundEnabled);
                      setUserInput((prev) => prev.slice(0, -1));
                    }}
                    className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 transition"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TYPE 3: TEXT INPUT */}
            {currentLevel.type === 'text_input' && (
              <div className="w-full max-w-md mx-auto flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ketik jawaban kata / teks..."
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleSubmitAnswer()}
                    className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition transform active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Kirim</span>
                    <CornerDownLeft className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 text-center">
                  Tip: Jawaban tidak membedakan huruf besar/kecil.
                </span>
              </div>
            )}

            {/* TYPE 4: INTERACTIVE PUZZLE */}
            {currentLevel.type === 'interactive' && (
              <InteractivePuzzle
                level={currentLevel}
                soundEnabled={stats.soundEnabled}
                onSolve={handleLevelCompleted}
              />
            )}
          </div>

          {/* Feedback Banner */}
          {feedback.message && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition animate-in fade-in ${
                feedback.type === 'correct'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.type === 'correct' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Attempts counter if > 0 */}
          {attempts > 0 && !stats.progress[activeLevelId]?.completed && (
            <div className="text-center text-[11px] text-slate-500">
              Percobaan gagal: <span className="font-mono text-amber-400">{attempts}</span> kali.
            </div>
          )}
        </div>

        {/* 3. Bottom Controls & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Left: Previous Level */}
          <button
            disabled={activeLevelId <= 1}
            onClick={() => {
              playTap(stats.soundEnabled);
              setActiveLevelId((prev) => prev - 1);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Level Sebelumnya</span>
          </button>

          {/* Center: Hint Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playTap(stats.soundEnabled);
                setShowHintModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-sm"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Buka Petunjuk</span>
              {hintsUsed.hint1 && <span className="text-[10px] text-emerald-400">· H1 Aktif</span>}
              {hintsUsed.hint2 && <span className="text-[10px] text-emerald-400">· H2 Aktif</span>}
            </button>
          </div>

          {/* Right: Next Level */}
          <button
            disabled={activeLevelId >= stats.unlockedLevel || activeLevelId >= 100}
            onClick={() => {
              playTap(stats.soundEnabled);
              setActiveLevelId((prev) => prev + 1);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            <span className="hidden sm:inline">Level Berikutnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* 4. MODALS */}

      {/* Level Select Map */}
      {showMap && (
        <LevelSelectMap
          unlockedLevel={stats.unlockedLevel}
          currentLevel={activeLevelId}
          progress={stats.progress}
          soundEnabled={stats.soundEnabled}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Hint & Solution Modal */}
      {showHintModal && (
        <HintModal
          level={currentLevel}
          playerCoins={stats.coins}
          unlockedHints={hintsUsed}
          soundEnabled={stats.soundEnabled}
          onUnlockHint={handleUnlockHint}
          onClose={() => setShowHintModal(false)}
        />
      )}

      {/* Level Clear Celebration Modal */}
      {showClearModal && (
        <LevelClearModal
          level={currentLevel}
          stars={clearData.stars}
          earnedCoins={clearData.earnedCoins}
          timeSpentSec={clearData.timeSpentSec}
          soundEnabled={stats.soundEnabled}
          onNextLevel={handleNextLevel}
          onReplay={() => {
            setShowClearModal(false);
            setUserInput('');
            setFeedback({ type: null, message: '' });
          }}
          onOpenMap={() => {
            setShowClearModal(false);
            setShowMap(true);
          }}
        />
      )}

      {/* 100-Level Database & JSON Exporter */}
      {showDatabase && (
        <DatabaseViewerModal
          soundEnabled={stats.soundEnabled}
          onClose={() => setShowDatabase(false)}
          onJumpToLevel={(id) => {
            setShowDatabase(false);
            if (id <= stats.unlockedLevel) {
              setActiveLevelId(id);
            }
          }}
        />
      )}

      {/* Reset Progress Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Reset Semua Progres?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tindakan ini akan mengulang progres dari Level 1 dan mengembalikan koin ke 100.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleResetAllProgress}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
