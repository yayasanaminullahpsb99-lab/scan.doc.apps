export type PuzzleTier = 'beginner' | 'intermediate' | 'advanced' | 'master';

export type PuzzleType = 'multiple_choice' | 'text_input' | 'number_input' | 'interactive';

export type InteractiveKind =
  | 'sequence_tap'
  | 'drag_reveal'
  | 'switches'
  | 'dial_lock'
  | 'reorder_items'
  | 'balance_scale'
  | 'grid_click';

export interface LevelData {
  id: number;
  tier: PuzzleTier;
  category: string;
  title: string;
  prompt: string;
  visualType?: 'icon' | 'grid' | 'cipher' | 'scale' | 'pattern' | 'interactive';
  visualData?: any;
  type: PuzzleType;
  options?: string[]; // For multiple_choice
  answer: string | number | string[]; // Accepted answer(s)
  interactiveKind?: InteractiveKind;
  interactiveData?: {
    items?: any[];
    targetState?: any;
    initialState?: any;
    hint?: string;
    leftWeight?: number;
    availableWeights?: number[];
    [key: string]: any;
  };
  hint1: string; // Clue ringan (tanpa penalti)
  hint2: string; // Clue mendalam (menggunakan 15 koin)
  solution: string; // Solusi & jawaban lengkap (30 koin / buka kunci)
  explanation: string; // Alasan logis jawaban benar
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  stars: number; // 0, 1, 2, 3
  bestTimeSec: number;
  hint1Used: boolean;
  hint2Used: boolean;
  solutionUsed: boolean;
  completedAt?: string;
}

export interface PlayerStats {
  coins: number;
  currentLevel: number;
  unlockedLevel: number;
  progress: Record<number, LevelProgress>;
  soundEnabled: boolean;
}

export interface TierInfo {
  id: PuzzleTier;
  name: string;
  levelRange: string;
  startLevel: number;
  endLevel: number;
  desc: string;
  color: string;
}
