import { PlayerStats, LevelProgress, PuzzleTier } from '../types/game';
import { ALL_LEVELS } from '../data/levels';

const STORAGE_KEY = '100_steps_of_logic_player_save_v1';

const DEFAULT_STATS: PlayerStats = {
  coins: 100, // Starting bonus
  currentLevel: 1,
  unlockedLevel: 1,
  progress: {},
  soundEnabled: true,
};

export function loadPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : DEFAULT_STATS.coins,
      currentLevel: parsed.currentLevel || 1,
      unlockedLevel: parsed.unlockedLevel || 1,
      progress: parsed.progress || {},
      soundEnabled: parsed.soundEnabled ?? true,
    };
  } catch (err) {
    console.error('Failed to load player stats:', err);
    return DEFAULT_STATS;
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save player stats:', err);
  }
}

export function calculateTotalStars(progress: Record<number, LevelProgress>): number {
  return Object.values(progress).reduce((acc, curr) => acc + (curr.stars || 0), 0);
}

export function calculateTierProgress(
  tier: PuzzleTier,
  progress: Record<number, LevelProgress>
): { completed: number; total: number; stars: number; maxStars: number } {
  const levelsInTier = ALL_LEVELS.filter((l) => l.tier === tier);
  const total = levelsInTier.length;
  let completed = 0;
  let stars = 0;

  levelsInTier.forEach((l) => {
    const p = progress[l.id];
    if (p && p.completed) {
      completed++;
      stars += p.stars || 0;
    }
  });

  return {
    completed,
    total,
    stars,
    maxStars: total * 3,
  };
}

export function calculateStarRating(
  hintsUsed: { hint1: boolean; hint2: boolean; solution: boolean },
  timeSec: number,
  attempts: number
): number {
  if (hintsUsed.solution) {
    return 1;
  }
  if (hintsUsed.hint2 || attempts > 3 || timeSec > 90) {
    return 2;
  }
  return 3;
}
