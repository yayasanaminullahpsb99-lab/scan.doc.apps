import React, { useState } from 'react';
import { LevelData } from '../types/game';
import { playTap, playCoin, playWrong } from '../utils/sfx';
import { Lightbulb, Coins, Check, Lock, X, Sparkles, HelpCircle } from 'lucide-react';

interface HintModalProps {
  level: LevelData;
  playerCoins: number;
  unlockedHints: { hint1: boolean; hint2: boolean; solution: boolean };
  soundEnabled: boolean;
  onUnlockHint: (type: 'hint1' | 'hint2' | 'solution', cost: number) => void;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  level,
  playerCoins,
  unlockedHints,
  soundEnabled,
  onUnlockHint,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnlock = (type: 'hint1' | 'hint2' | 'solution', cost: number) => {
    if (cost > 0 && playerCoins < cost) {
      playWrong(soundEnabled);
      setErrorMsg(`Koin tidak cukup! Butuh ${cost} koin.`);
      setTimeout(() => setErrorMsg(null), 2500);
      return;
    }
    playCoin(soundEnabled);
    onUnlockHint(type, cost);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pusat Petunjuk & Solusi</h3>
              <p className="text-xs text-slate-400">Level #{level.id} · {level.title}</p>
            </div>
          </div>

          <button
            onClick={() => {
              playTap(soundEnabled);
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coin Balance Pill */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Saldo Koin Kamu:</span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
            <Coins className="w-4 h-4" />
            <span>{playerCoins} Koin</span>
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs font-bold text-rose-400 text-center py-1 bg-rose-500/10 rounded-xl border border-rose-500/30">
            {errorMsg}
          </div>
        )}

        {/* Hint Tiers */}
        <div className="flex flex-col gap-3">
          {/* HINT 1: FREE CLUE */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Hint 1: Petunjuk Ringan
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                GRATIS
              </span>
            </div>

            {unlockedHints.hint1 ? (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {level.hint1}
              </p>
            ) : (
              <button
                onClick={() => handleUnlock('hint1', 0)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition"
              >
                Buka Hint 1 (Gratis)
              </button>
            )}
          </div>

          {/* HINT 2: DEEP CLUE (15 COINS) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Hint 2: Petunjuk Mendalam
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                15 KOIN
              </span>
            </div>

            {unlockedHints.hint2 ? (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {level.hint2}
              </p>
            ) : (
              <button
                onClick={() => handleUnlock('hint2', 15)}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Buka Hint 2 (15 Koin)</span>
              </button>
            )}
          </div>

          {/* SOLUTION: FULL ANSWER & EXPLANATION */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Solusi Lengkap & Penjelasan
              </span>
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
                30 KOIN
              </span>
            </div>

            {unlockedHints.solution ? (
              <div className="flex flex-col gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Jawaban Tepat: </span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    {Array.isArray(level.answer) ? level.answer.join(' / ') : level.answer}
                  </strong>
                </div>
                <p className="text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
                  {level.solution}
                </p>
              </div>
            ) : (
              <button
                onClick={() => handleUnlock('solution', 30)}
                className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Buka Solusi Lengkap (30 Koin)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
