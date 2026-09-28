import React from 'react';
import { PlayerStats, PuzzleTier } from '../types/game';
import { TIERS } from '../data/levels';
import { playTap } from '../utils/sfx';
import {
  BrainCircuit,
  Coins,
  Star,
  Volume2,
  VolumeX,
  Map,
  Database,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface GameHeaderProps {
  stats: PlayerStats;
  currentTier: PuzzleTier;
  totalStars: number;
  onOpenMap: () => void;
  onOpenDatabase: () => void;
  onToggleSound: () => void;
  onResetProgress: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  stats,
  currentTier,
  totalStars,
  onOpenMap,
  onOpenDatabase,
  onToggleSound,
  onResetProgress,
}) => {
  const tierInfo = TIERS.find((t) => t.id === currentTier) || TIERS[0];

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 z-30 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Left: App Logo & Current Level Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                100 Steps of Logic
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {tierInfo.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Langkah {stats.currentLevel} dari 100 Level
            </p>
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Star Counter */}
          <div
            onClick={onOpenMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-amber-400/50 transition shadow-sm"
            title="Total Bintang yang Diperoleh"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-mono text-xs font-bold text-amber-300">
              {totalStars} <span className="text-[10px] text-slate-500">/ 300</span>
            </span>
          </div>

          {/* Coin Balance */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm"
            title="Saldo Koin Game"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-amber-300">
              {stats.coins}
            </span>
          </div>

          {/* Level Map Button */}
          <button
            onClick={() => {
              playTap(stats.soundEnabled);
              onOpenMap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            title="Peta Pemilihan Level"
          >
            <Map className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Peta Level</span>
          </button>

          {/* 100-Level Database / JSON export */}
          <button
            onClick={() => {
              playTap(stats.soundEnabled);
              onOpenDatabase();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
            title="Lihat Database 100 Level & Ekspor JSON"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="hidden lg:inline">Database JSON</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition ${
              stats.soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={stats.soundEnabled ? 'Matikan Suara (SFX)' : 'Nyalakan Suara (SFX)'}
          >
            {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
