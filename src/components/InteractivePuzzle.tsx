import React, { useState, useEffect } from 'react';
import { LevelData } from '../types/game';
import { playTap, playCorrect, playWrong } from '../utils/sfx';
import { Check, RotateCcw, Lock, Unlock, ArrowUp, ArrowDown, Sparkles, Move } from 'lucide-react';

interface InteractivePuzzleProps {
  level: LevelData;
  soundEnabled: boolean;
  onSolve: () => void;
}

export const InteractivePuzzle: React.FC<InteractivePuzzleProps> = ({
  level,
  soundEnabled,
  onSolve,
}) => {
  const kind = level.interactiveKind;
  const config = level.interactiveData || {};

  // --- SWITCHES PUZZLE STATE ---
  const [switches, setSwitches] = useState<boolean[]>(() => {
    if (config.items && Array.isArray(config.items)) {
      return config.items.map((it: any) => Boolean(it.state));
    }
    return [false, false];
  });

  // --- SEQUENCE TAP PUZZLE STATE ---
  const [currentSeqIndex, setCurrentSeqIndex] = useState<number>(0);
  const [tappedItems, setTappedItems] = useState<string[]>([]);
  const [seqError, setSeqError] = useState<boolean>(false);

  // --- DIAL LOCK STATE ---
  const targetDial = Array.isArray(config.targetState) ? config.targetState : [1, 2, 3, 4];
  const [dialValues, setDialValues] = useState<number[]>(() => targetDial.map(() => 0));

  // --- DRAG REVEAL STATE ---
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // --- REORDER ITEMS STATE ---
  const [orderedItems, setOrderedItems] = useState<string[]>(() => {
    if (Array.isArray(config.items)) {
      return [...config.items].map((it: any) => (typeof it === 'string' ? it : it.label || it.id || '')).sort(() => Math.random() - 0.5);
    }
    return [];
  });

  // --- BALANCE SCALE STATE ---
  const targetWeight: number = (config as any).leftWeight || 15;
  const availableWeights: number[] = (config as any).availableWeights || [5, 7, 8, 10];
  const [selectedWeights, setSelectedWeights] = useState<number[]>([]);

  // Reset states on level change
  useEffect(() => {
    if (config.items && Array.isArray(config.items) && kind === 'switches') {
      setSwitches(config.items.map((it: any) => Boolean(it.state)));
    }
    setCurrentSeqIndex(0);
    setTappedItems([]);
    setSeqError(false);
    if (kind === 'dial_lock') {
      setDialValues(targetDial.map(() => 0));
    }
    setDragOffset(0);
    setIsRevealed(false);
    if (kind === 'reorder_items' && Array.isArray(config.items)) {
      setOrderedItems([...config.items].map((it: any) => (typeof it === 'string' ? it : it.label || it.id || '')).sort(() => Math.random() - 0.5));
    }
    setSelectedWeights([]);
  }, [level.id]);

  // Check switches solution
  const toggleSwitch = (index: number) => {
    playTap(soundEnabled);
    const next = [...switches];
    next[index] = !next[index];
    setSwitches(next);

    const target = config.targetState || [true, true];
    const isMatched = next.every((val, i) => val === target[i]);
    if (isMatched) {
      setTimeout(() => {
        playCorrect(soundEnabled);
        onSolve();
      }, 250);
    }
  };

  // Check sequence tap
  const handleTapSequence = (item: any) => {
    playTap(soundEnabled);
    if (item.correctIndex === currentSeqIndex) {
      const nextIndex = currentSeqIndex + 1;
      setCurrentSeqIndex(nextIndex);
      setTappedItems((prev) => [...prev, item.id]);

      const totalItems = config.items?.length || 4;
      if (nextIndex === totalItems) {
        setTimeout(() => {
          playCorrect(soundEnabled);
          onSolve();
        }, 250);
      }
    } else {
      // Wrong sequence
      playWrong(soundEnabled);
      setSeqError(true);
      setTimeout(() => {
        setSeqError(false);
        setCurrentSeqIndex(0);
        setTappedItems([]);
      }, 700);
    }
  };

  // Check dial lock
  const changeDial = (idx: number, delta: number) => {
    playTap(soundEnabled);
    setDialValues((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] + delta + 10) % 10;
      return next;
    });
  };

  const handleVerifyDial = () => {
    const isCorrect = dialValues.every((val, i) => val === targetDial[i]);
    if (isCorrect) {
      playCorrect(soundEnabled);
      onSolve();
    } else {
      playWrong(soundEnabled);
    }
  };

  // Check drag reveal
  const handleDragStone = (e: React.MouseEvent | React.TouchEvent) => {
    setDragOffset(180);
    setIsRevealed(true);
    playTap(soundEnabled);
  };

  const handleCollectKey = () => {
    playCorrect(soundEnabled);
    onSolve();
  };

  // Check reorder items
  const moveItem = (fromIdx: number, toIdx: number) => {
    playTap(soundEnabled);
    const copy = [...orderedItems];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setOrderedItems(copy);

    const target = config.targetState || [];
    if (target.length > 0 && copy.every((item, i) => item === target[i])) {
      setTimeout(() => {
        playCorrect(soundEnabled);
        onSolve();
      }, 250);
    }
  };

  // Check balance scale
  const toggleWeight = (w: number) => {
    playTap(soundEnabled);
    const exists = selectedWeights.includes(w);
    let next: number[];
    if (exists) {
      next = selectedWeights.filter((item) => item !== w);
    } else {
      next = [...selectedWeights, w];
    }
    setSelectedWeights(next);

    const sum = next.reduce((a, b) => a + b, 0);
    if (sum === targetWeight) {
      setTimeout(() => {
        playCorrect(soundEnabled);
        onSolve();
      }, 300);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-4">
      {/* 1. SWITCHES MODE */}
      {kind === 'switches' && (
        <div className="w-full flex flex-col items-center gap-4 py-2">
          <span className="text-xs text-slate-400 font-medium">
            Ketuk sakelar untuk menyalakan/mematikan sesuai target logika:
          </span>

          <div className="flex flex-wrap justify-center gap-4">
            {switches.map((isOn, idx) => {
              const label = config.items?.[idx]?.label || `Sakelar ${idx + 1}`;
              return (
                <button
                  key={idx}
                  onClick={() => toggleSwitch(idx)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all transform active:scale-95 ${
                    isOn
                      ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base transition-colors ${
                      isOn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isOn ? 'ON' : 'OFF'}
                  </div>
                  <span className="text-xs font-semibold text-white">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SEQUENCE TAP MODE */}
      {kind === 'sequence_tap' && (
        <div className="w-full flex flex-col items-center gap-3 py-1">
          <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1">
            <span>Ketuk urutan secara berurutan:</span>
            <span className="font-mono text-amber-400 font-bold">
              Langkah: {currentSeqIndex} / {config.items?.length || 4}
            </span>
          </div>

          {seqError && (
            <div className="text-xs font-bold text-rose-400 animate-bounce">
              Urutan salah! Mengulang kembali...
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full">
            {config.items?.map((item: any) => {
              const isTapped = tappedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  disabled={isTapped || seqError}
                  onClick={() => handleTapSequence(item)}
                  className={`p-3.5 rounded-2xl border text-left font-semibold text-xs sm:text-sm transition-all transform active:scale-95 ${
                    isTapped
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 opacity-60 pointer-events-none'
                      : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-400/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {isTapped && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DIAL COMBINATION LOCK */}
      {kind === 'dial_lock' && (
        <div className="w-full flex flex-col items-center gap-4 py-2">
          <span className="text-xs text-slate-400 font-medium">
            Atur digit kombinasi brankas lalu tekan Buka Kunci:
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            {dialValues.map((val, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => changeDial(idx, 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <div className="w-12 h-14 rounded-xl bg-slate-950 border-2 border-slate-700 flex items-center justify-center font-mono font-bold text-xl text-amber-400 shadow-inner">
                  {val}
                </div>

                <button
                  onClick={() => changeDial(idx, -1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleVerifyDial}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition transform active:scale-95"
          >
            <Lock className="w-4 h-4" />
            <span>Buka Kunci Brankas</span>
          </button>
        </div>
      )}

      {/* 4. DRAG REVEAL MODE */}
      {kind === 'drag_reveal' && (
        <div className="w-full flex flex-col items-center gap-3 py-2">
          <span className="text-xs text-slate-400 font-medium">
            Geser penutup batu untuk menemukan kunci rahasia:
          </span>

          <div className="relative w-64 h-36 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
            {/* Hidden Key Underneath */}
            <button
              onClick={handleCollectKey}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 animate-pulse hover:scale-110 transition-transform cursor-pointer"
            >
              <Sparkles className="w-8 h-8 text-amber-400" />
              <span className="text-xs font-bold">Ambil Kunci Emas!</span>
            </button>

            {/* Draggable Covering Stone */}
            <div
              onClick={handleDragStone}
              style={{
                transform: `translateX(${dragOffset}px)`,
                transition: 'transform 0.4s ease-out',
              }}
              className="absolute inset-0 bg-slate-800 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-300 cursor-pointer shadow-2xl group hover:border-slate-500"
            >
              <Move className="w-6 h-6 mb-1 text-slate-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Batu Penutup Kuno</span>
              <span className="text-[10px] text-slate-500">(Ketuk atau Geser)</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. REORDER ITEMS MODE */}
      {kind === 'reorder_items' && (
        <div className="w-full flex flex-col items-center gap-3 py-1">
          <span className="text-xs text-slate-400 font-medium">
            Urutkan elemen dengan tombol panah hingga urutan logis terpenuhi:
          </span>

          <div className="flex flex-col gap-2 w-full max-w-sm">
            {orderedItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, idx - 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === orderedItems.length - 1}
                    onClick={() => moveItem(idx, idx + 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. BALANCE SCALE MODE */}
      {kind === 'balance_scale' && (
        <div className="w-full flex flex-col items-center gap-4 py-2">
          <div className="flex items-center justify-between w-full text-xs text-slate-400 px-2">
            <span>Piring Kiri: <strong className="text-white">{targetWeight} kg</strong></span>
            <span>
              Piring Kanan:{' '}
              <strong
                className={
                  selectedWeights.reduce((a, b) => a + b, 0) === targetWeight
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }
              >
                {selectedWeights.reduce((a, b) => a + b, 0)} kg
              </strong>
            </span>
          </div>

          {/* Visual scale representation */}
          <div className="relative w-64 h-24 flex items-center justify-between border-b-4 border-slate-700 px-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-12 rounded-xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                {targetWeight} kg
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Tetap</span>
            </div>

            <div className="w-1 h-16 bg-slate-700" />

            <div className="flex flex-col items-center">
              <div className="w-16 h-12 rounded-xl bg-slate-800 border-2 border-emerald-500/60 flex items-center justify-center text-xs font-bold text-emerald-400 shadow-md">
                {selectedWeights.reduce((a, b) => a + b, 0)} kg
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Bebanmu</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {availableWeights.map((w) => {
              const isSelected = selectedWeights.includes(w);
              return (
                <button
                  key={w}
                  onClick={() => toggleWeight(w)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    isSelected
                      ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  +{w} kg {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
