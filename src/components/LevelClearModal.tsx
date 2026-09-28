import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { LevelData } from '../types/game';
import { playStar, playFanfare, playTap } from '../utils/sfx';
import { Star, Coins, ArrowRight, RotateCcw, Map, Trophy, CheckCircle } from 'lucide-react';

interface LevelClearModalProps {
  level: LevelData;
  stars: number;
  earnedCoins: number;
  timeSpentSec: number;
  soundEnabled: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenMap: () => void;
}

export const LevelClearModal: React.FC<LevelClearModalProps> = ({
  level,
  stars,
  earnedCoins,
  timeSpentSec,
  soundEnabled,
  onNextLevel,
  onReplay,
  onOpenMap,
}) => {
  useEffect(() => {
    // Fireworks / confetti blast
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    playFanfare(soundEnabled);

    // Staggered star audio chimes
    const t1 = setTimeout(() => playStar(1, soundEnabled), 200);
    const t2 = setTimeout(() => stars >= 2 && playStar(2, soundEnabled), 450);
    const t3 = setTimeout(() => stars >= 3 && playStar(3, soundEnabled), 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stars, soundEnabled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        {/* Level Tag */}
        <span className="text-xs font-bold font-mono tracking-wider text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
          Level #{level.id} Terselesaikan!
        </span>

        {/* Stars Presentation */}
        <div className="flex items-center justify-center gap-2 my-1">
          {[1, 2, 3].map((starIdx) => {
            const hasStar = starIdx <= stars;
            return (
              <div
                key={starIdx}
                className={`transition-all duration-500 transform ${
                  hasStar ? 'scale-110' : 'scale-90 opacity-30'
                }`}
              >
                <Star
                  className={`w-12 h-12 ${
                    hasStar
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : 'text-slate-700'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Reward Coins */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-amber-300">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>+{earnedCoins} Koin Didapat!</span>
          <span className="text-slate-500 font-normal">({timeSpentSec} detik)</span>
        </div>

        {/* Explanation Box */}
        <div className="w-full bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left text-xs flex flex-col gap-1.5">
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Penjelasan Logika:
          </span>
          <p className="text-slate-300 leading-relaxed">{level.explanation}</p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-2">
          {level.id < 100 ? (
            <button
              onClick={() => {
                playTap(soundEnabled);
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition transform active:scale-95"
            >
              <span>Lanjut ke Langkah {level.id + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black text-sm text-center shadow-2xl">
              🎉 SELAMAT! KAMU TELAH MENAMATKAN 100 LANGKAH LOGIKA! 🎉
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                playTap(soundEnabled);
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Main Lagi</span>
            </button>

            <button
              onClick={() => {
                playTap(soundEnabled);
                onOpenMap();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Peta Level</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
