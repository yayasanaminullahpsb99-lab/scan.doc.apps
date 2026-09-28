import React, { useState, useEffect, useRef } from 'react';
import { FilterType } from '../types/scanner';
import { applyFilter, generateThumbnail } from '../utils/cvEngine';
import {
  Wand2,
  Image as ImageIcon,
  Contrast,
  Sliders,
  RotateCw,
  Check,
  ArrowLeft,
  Sun,
  Eye
} from 'lucide-react';

interface FilterEditorProps {
  warpedCanvas: HTMLCanvasElement;
  initialFilter?: FilterType;
  initialBrightness?: number;
  initialContrast?: number;
  initialRotation?: number;
  onSave: (processedDataUrl: string, thumbnailUrl: string, settings: {
    filter: FilterType;
    brightness: number;
    contrast: number;
    rotation: number;
  }) => void;
  onBackToCrop: () => void;
}

export const FilterEditor: React.FC<FilterEditorProps> = ({
  warpedCanvas,
  initialFilter = 'magic',
  initialBrightness = 0,
  initialContrast = 0,
  initialRotation = 0,
  onSave,
  onBackToCrop,
}) => {
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [brightness, setBrightness] = useState<number>(initialBrightness);
  const [contrast, setContrast] = useState<number>(initialContrast);
  const [rotation, setRotation] = useState<number>(initialRotation);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [showSliders, setShowSliders] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Filter thumbnails previews
  const [filterPreviews, setFilterPreviews] = useState<Record<FilterType, string>>({
    original: '',
    magic: '',
    grayscale: '',
    bw: '',
  });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate filter previews on mount
  useEffect(() => {
    // Generate mini previews
    const types: FilterType[] = ['magic', 'original', 'grayscale', 'bw'];
    const previews: Partial<Record<FilterType, string>> = {};

    types.forEach((t) => {
      const filtered = applyFilter(warpedCanvas, t, 0, 0, 0);
      previews[t] = generateThumbnail(filtered, 120);
    });

    setFilterPreviews(previews as Record<FilterType, string>);
  }, [warpedCanvas]);

  // Update current full preview canvas when settings change
  useEffect(() => {
    setIsApplying(true);
    const timer = setTimeout(() => {
      const resultCanvas = applyFilter(warpedCanvas, filter, brightness, contrast, rotation);
      setPreviewSrc(resultCanvas.toDataURL('image/jpeg', 0.92));
      setIsApplying(false);
    }, 40);

    return () => clearTimeout(timer);
  }, [warpedCanvas, filter, brightness, contrast, rotation]);

  const handleSave = () => {
    const finalCanvas = applyFilter(warpedCanvas, filter, brightness, contrast, rotation);
    const processedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
    const thumbnailUrl = generateThumbnail(finalCanvas, 220);

    onSave(processedDataUrl, thumbnailUrl, {
      filter,
      brightness,
      contrast,
      rotation,
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const filterConfigs: { id: FilterType; label: string; desc: string; icon: any }[] = [
    {
      id: 'magic',
      label: 'Magic Color',
      desc: 'Hapus bayangan & pertajam teks dokumen',
      icon: Wand2,
    },
    {
      id: 'bw',
      label: 'Hitam Putih (B&W)',
      desc: 'Kontras tinggi, bersih seperti fotokopi',
      icon: Contrast,
    },
    {
      id: 'grayscale',
      label: 'Grayscale',
      desc: 'Gradasi abu-abu halus alami',
      icon: Eye,
    },
    {
      id: 'original',
      label: 'Asli (Original)',
      desc: 'Warna asli tanpa filter warna',
      icon: ImageIcon,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <button
          onClick={onBackToCrop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Ubah Sudut</span>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-sm font-bold tracking-wide text-white">Tingkatkan Kualitas Dokumen</h2>
          <span className="text-[11px] text-emerald-400">Pilih filter & sesuaikan kontras</span>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition"
        >
          <Check className="w-5 h-5" />
          <span>Simpan</span>
        </button>
      </header>

      {/* Main Preview Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-slate-950">
        <div className="relative max-w-full max-h-[64vh] flex items-center justify-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/80 shadow-2xl">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Hasil pemindaian dokumen"
              className="max-w-full max-h-[60vh] object-contain rounded-md shadow-md"
            />
          ) : (
            <div className="w-64 h-80 flex items-center justify-center text-slate-500 text-sm">
              Memproses gambar...
            </div>
          )}

          {isApplying && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Sliders drawer (if toggled) */}
      {showSliders && (
        <div className="px-6 py-3 bg-slate-900/95 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Kecerahan (Brightness): {brightness > 0 ? `+${brightness}` : brightness}</span>
            </div>
            <button
              onClick={() => setBrightness(0)}
              className="text-[11px] text-emerald-400 hover:underline"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
            <div className="flex items-center gap-2">
              <Contrast className="w-4 h-4 text-emerald-400" />
              <span>Kontras (Contrast): {contrast > 0 ? `+${contrast}` : contrast}</span>
            </div>
            <button
              onClick={() => setContrast(0)}
              className="text-[11px] text-emerald-400 hover:underline"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      )}

      {/* Bottom Filter Selector Bar */}
      <footer className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Mode Filter Dokumen
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSliders(!showSliders)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                showSliders
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sesuaikan</span>
            </button>

            <button
              onClick={handleRotate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Putar 90 Derajat"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Putar</span>
            </button>
          </div>
        </div>

        {/* Filter Cards Row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {filterConfigs.map((f) => {
            const isSelected = filter === f.id;
            const previewImg = filterPreviews[f.id];

            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-950 mb-1.5 border border-slate-700 flex items-center justify-center">
                  {previewImg ? (
                    <img src={previewImg} alt={f.label} className="w-full h-full object-cover" />
                  ) : (
                    <f.icon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <span className="text-[11px] font-bold line-clamp-1">{f.label}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
