import React, { useState } from 'react';
import { ALL_LEVELS, TIERS } from '../data/levels';
import { PuzzleTier, LevelProgress } from '../types/game';
import { playTap } from '../utils/sfx';
import {
  Lock,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Trophy,
  Search,
  X,
  Flame,
  Award
} from 'lucide-react';

interface LevelSelectMapProps {
  unlockedLevel: number;
  currentLevel: number;
  progress: Record<number, LevelProgress>;
  soundEnabled: boolean;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

export const LevelSelectMap: React.FC<LevelSelectMapProps> = ({
  unlockedLevel,
  currentLevel,
  progress,
  soundEnabled,
  onSelectLevel,
  onClose,
}) => {
  const [selectedTier, setSelectedTier] = useState<PuzzleTier>('beginner');
  const [searchQuery, setSearchQuery] = useState('');

  const currentTierInfo = TIERS.find((t) => t.id === selectedTier) || TIERS[0];
  const tierLevels = ALL_LEVELS.filter((l) => l.tier === selectedTier);

  // Filtered levels if searching
  const filteredLevels = searchQuery.trim()
    ? ALL_LEVELS.filter(
        (l) =>
          l.id.toString() === searchQuery.trim() ||
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tierLevels;

  // Total stars
  const totalStars = Object.values(progress).reduce((acc, curr) => acc + (curr.stars || 0), 0);
  const totalCompleted = Object.values(progress).filter((p) => p.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                Peta Perjalanan 100 Langkah Logika
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {totalStars} / 300 Bintang
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {totalCompleted} / 100 Selesai
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playTap(soundEnabled);
              onClose();
            }}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tier Selector Tabs */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tiers Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              // Tier completed count
              const countInTier = ALL_LEVELS.filter(
                (l) => l.tier === tier.id && progress[l.id]?.completed
              ).length;

              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    playTap(soundEnabled);
                    setSelectedTier(tier.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <span>{tier.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {countInTier}/{tier.endLevel - tier.startLevel + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-56 flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari level (1-100)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Tier Info Card Banner */}
        {!searchQuery && (
          <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                {currentTierInfo.name} ({currentTierInfo.levelRange}):
              </span>
              <span className="hidden sm:inline text-slate-400">{currentTierInfo.desc}</span>
            </div>
            <span className="font-mono text-amber-400 font-bold text-[11px]">
              {tierLevels.filter((l) => progress[l.id]?.completed).length} / {tierLevels.length} Level
            </span>
          </div>
        )}

        {/* Level Nodes Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
            {filteredLevels.map((lvl) => {
              const isUnlocked = lvl.id <= unlockedLevel;
              const isCurrent = lvl.id === currentLevel;
              const prog = progress[lvl.id];
              const isCompleted = Boolean(prog?.completed);
              const stars = prog?.stars || 0;

              return (
                <button
                  key={lvl.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    playTap(soundEnabled);
                    onSelectLevel(lvl.id);
                  }}
                  className={`relative flex flex-col p-3 rounded-2xl border text-left transition-all transform active:scale-95 group ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/50'
                      : isCompleted
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-850'
                      : isUnlocked
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-600'
                      : 'bg-slate-950/60 border-slate-850 opacity-45 cursor-not-allowed'
                  }`}
                >
                  {/* Top Bar: Level Number & Lock / Star */}
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span
                      className={`text-xs font-mono font-black ${
                        isCurrent
                          ? 'text-amber-400'
                          : isCompleted
                          ? 'text-emerald-400'
                          : isUnlocked
                          ? 'text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      #{lvl.id}
                    </span>

                    {/* Status Badge */}
                    {!isUnlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : isCompleted ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>

                  {/* Level Title */}
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-1">
                    {lvl.title.replace(/^Langkah \d+: /, '')}
                  </h4>

                  {/* Category */}
                  <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {lvl.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
