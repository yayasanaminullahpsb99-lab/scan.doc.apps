import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Point, Quad } from '../types/scanner';
import { clampQuad, getDefaultQuad, detectDocumentCorners } from '../utils/cvEngine';
import {
  RotateCcw,
  RotateCw,
  Maximize2,
  Sparkles,
  Check,
  X,
  Crosshair,
  ZoomIn
} from 'lucide-react';

interface CropEditorProps {
  originalDataUrl: string;
  initialQuad?: Quad;
  onApplyCrop: (finalQuad: Quad, rotatedImageSrc?: string) => void;
  onCancel: () => void;
}

type CornerKey = 'tl' | 'tr' | 'br' | 'bl';

export const CropEditor: React.FC<CropEditorProps> = ({
  originalDataUrl,
  initialQuad,
  onApplyCrop,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [quad, setQuad] = useState<Quad>(
    initialQuad || {
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
    }
  );

  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.src = originalDataUrl;
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImageSize({ width: w, height: h });

      if (initialQuad && initialQuad.tr.x > 0) {
        setQuad(initialQuad);
      } else {
        // Auto detect corners
        const detected = detectDocumentCorners(img, w, h);
        setQuad(detected);
      }
    };
  }, [originalDataUrl, initialQuad]);

  // Update loupe magnifier canvas when dragging a corner
  const updateLoupe = useCallback(
    (point: Point, corner: CornerKey) => {
      const loupe = loupeCanvasRef.current;
      const img = imageRef.current;
      if (!loupe || !img || !imageSize.width) return;

      const ctx = loupe.getContext('2d');
      if (!ctx) return;

      const loupeSize = 130;
      const zoom = 2.4;
      loupe.width = loupeSize;
      loupe.height = loupeSize;

      ctx.clearRect(0, 0, loupeSize, loupeSize);

      // Clip circular lens
      ctx.save();
      ctx.beginPath();
      ctx.arc(loupeSize / 2, loupeSize / 2, loupeSize / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Source rectangle
      const sw = loupeSize / zoom;
      const sh = loupeSize / zoom;
      const sx = point.x - sw / 2;
      const sy = point.y - sh / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, loupeSize, loupeSize);

      // Crosshair
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(loupeSize / 2, 10);
      ctx.lineTo(loupeSize / 2, loupeSize - 10);
      ctx.moveTo(10, loupeSize / 2);
      ctx.lineTo(loupeSize - 10, loupeSize / 2);
      ctx.stroke();

      // Center point
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(loupeSize / 2, loupeSize / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
    [imageSize]
  );

  // Converts pointer event coordinates into native image coordinates
  const getNativeCoords = (clientX: number, clientY: number): Point => {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };

    const rect = img.getBoundingClientRect();
    const scaleX = imageSize.width / rect.width;
    const scaleY = imageSize.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(x, imageSize.width)),
      y: Math.max(0, Math.min(y, imageSize.height)),
    };
  };

  const handlePointerDown = (corner: CornerKey, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveCorner(corner);
    updateLoupe(quad[corner], corner);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !imageSize.width) return;
    e.preventDefault();
    const coords = getNativeCoords(e.clientX, e.clientY);

    setQuad((prev) => {
      const next = { ...prev, [activeCorner]: coords };
      return clampQuad(next, imageSize.width, imageSize.height);
    });

    updateLoupe(coords, activeCorner);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveCorner(null);
    }
  };

  // Convert native point to CSS percentage
  const toPercent = (point: Point) => {
    if (!imageSize.width || !imageSize.height) return { x: '0%', y: '0%' };
    return {
      x: `${(point.x / imageSize.width) * 100}%`,
      y: `${(point.y / imageSize.height) * 100}%`,
    };
  };

  const tlP = toPercent(quad.tl);
  const trP = toPercent(quad.tr);
  const brP = toPercent(quad.br);
  const blP = toPercent(quad.bl);

  // SVG polygon points in percentage format
  const polygonPoints = `${tlP.x} ${tlP.y}, ${trP.x} ${trP.y}, ${brP.x} ${brP.y}, ${blP.x} ${blP.y}`;

  // Reset to full image
  const handleFullImage = () => {
    if (!imageSize.width) return;
    setQuad({
      tl: { x: 0, y: 0 },
      tr: { x: imageSize.width, y: 0 },
      br: { x: imageSize.width, y: imageSize.height },
      bl: { x: 0, y: imageSize.height },
    });
  };

  // Re-detect with computer vision
  const handleAutoDetect = () => {
    const img = imageRef.current;
    if (!img || !imageSize.width) return;
    const detected = detectDocumentCorners(img, imageSize.width, imageSize.height);
    setQuad(detected);
  };

  // Rotate source image by 90 degrees
  const handleRotate = (deg: number) => {
    if (!imageRef.current) return;
    setIsProcessing(true);
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const img = imageRef.current!;
      if (Math.abs(deg) === 90) {
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        const newSrc = canvas.toDataURL('image/jpeg', 0.95);

        // Reset image and default quad
        setImageSize({ width: canvas.width, height: canvas.height });
        const newQuad = getDefaultQuad(canvas.width, canvas.height);
        setQuad(newQuad);

        // Re-assign image
        if (imageRef.current) {
          imageRef.current.src = newSrc;
        }
      }
      setIsProcessing(false);
    }, 50);
  };

  const handleApply = () => {
    setIsProcessing(true);
    onApplyCrop(quad);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
          <span className="text-sm font-medium">Batal</span>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-sm font-bold tracking-wide text-white">Sesuaikan 4 Sudut Dokumen</h2>
          <span className="text-[11px] text-emerald-400">Geser titik sudut untuk koreksi perspektif</span>
        </div>

        <button
          onClick={handleApply}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          <span>Selesai</span>
        </button>
      </header>

      {/* Main Crop Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-slate-950"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Loupe Lens Floating Magnifier */}
        <div
          className={`absolute top-4 right-4 z-40 flex flex-col items-center p-1.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-500 shadow-2xl backdrop-blur-md transition-all duration-200 pointer-events-none ${
            activeCorner ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <canvas ref={loupeCanvasRef} className="rounded-full shadow-inner bg-black" />
          <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Kaca Pembesar 2.4x</span>
          </div>
        </div>

        {/* Image & Interactive Quad Wrapper */}
        <div className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-sm overflow-visible">
          <img
            ref={imageRef}
            src={originalDataUrl}
            alt="Dokumen yang discan"
            className="max-w-full max-h-[68vh] object-contain rounded-sm pointer-events-none"
            crossOrigin="anonymous"
          />

          {/* SVG Overlay for Semi-transparent Quad & Lines */}
          {imageSize.width > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
              preserveAspectRatio="none"
            >
              {/* Outer Dark Mask */}
              <defs>
                <mask id="crop-mask">
                  <rect width={imageSize.width} height={imageSize.height} fill="white" />
                  <polygon
                    points={`${quad.tl.x},${quad.tl.y} ${quad.tr.x},${quad.tr.y} ${quad.br.x},${quad.br.y} ${quad.bl.x},${quad.bl.y}`}
                    fill="black"
                  />
                </mask>
              </defs>

              <rect
                width={imageSize.width}
                height={imageSize.height}
                fill="rgba(2, 6, 23, 0.65)"
                mask="url(#crop-mask)"
              />

              {/* Document Quad Border */}
              <polygon
                points={`${quad.tl.x},${quad.tl.y} ${quad.tr.x},${quad.tr.y} ${quad.br.x},${quad.br.y} ${quad.bl.x},${quad.bl.y}`}
                fill="rgba(16, 185, 129, 0.08)"
                stroke="#10b981"
                strokeWidth={Math.max(2, imageSize.width * 0.0035)}
                strokeDasharray="none"
              />

              {/* Grid 3x3 inside quad for perspective alignment reference */}
              <line
                x1={quad.tl.x + (quad.tr.x - quad.tl.x) * 0.33}
                y1={quad.tl.y + (quad.tr.y - quad.tl.y) * 0.33}
                x2={quad.bl.x + (quad.br.x - quad.bl.x) * 0.33}
                y2={quad.bl.y + (quad.br.y - quad.bl.y) * 0.33}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <line
                x1={quad.tl.x + (quad.tr.x - quad.tl.x) * 0.66}
                y1={quad.tl.y + (quad.tr.y - quad.tl.y) * 0.66}
                x2={quad.bl.x + (quad.br.x - quad.bl.x) * 0.66}
                y2={quad.bl.y + (quad.br.y - quad.bl.y) * 0.66}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <line
                x1={quad.tl.x + (quad.bl.x - quad.tl.x) * 0.33}
                y1={quad.tl.y + (quad.bl.y - quad.tl.y) * 0.33}
                x2={quad.tr.x + (quad.br.x - quad.tr.x) * 0.33}
                y2={quad.tr.y + (quad.br.y - quad.tr.y) * 0.33}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <line
                x1={quad.tl.x + (quad.bl.x - quad.tl.x) * 0.66}
                y1={quad.tl.y + (quad.bl.y - quad.tl.y) * 0.66}
                x2={quad.tr.x + (quad.br.x - quad.tr.x) * 0.66}
                y2={quad.tr.y + (quad.br.y - quad.tr.y) * 0.66}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            </svg>
          )}

          {/* Interactive Drag Handles for 4 Corners */}
          {imageSize.width > 0 && (
            <>
              {(['tl', 'tr', 'br', 'bl'] as CornerKey[]).map((corner) => {
                const p = toPercent(quad[corner]);
                const isActive = activeCorner === corner;
                const label =
                  corner === 'tl'
                    ? 'Kiri Atas'
                    : corner === 'tr'
                    ? 'Kanan Atas'
                    : corner === 'br'
                    ? 'Kanan Bawah'
                    : 'Kiri Bawah';

                return (
                  <div
                    key={corner}
                    onPointerDown={(e) => handlePointerDown(corner, e)}
                    style={{ left: p.x, top: p.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 touch-none cursor-grab active:cursor-grabbing p-4 group"
                    title={`Sudut ${label}`}
                  >
                    {/* Visual Pulse Handle */}
                    <div
                      className={`relative flex items-center justify-center rounded-full transition-transform duration-100 ${
                        isActive
                          ? 'w-10 h-10 bg-emerald-400 text-slate-950 scale-125 shadow-xl shadow-emerald-500/50 ring-4 ring-emerald-300'
                          : 'w-7 h-7 bg-white text-emerald-600 shadow-lg ring-2 ring-emerald-500 group-hover:scale-110'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Bottom Tool Bar */}
      <footer className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleAutoDetect}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Deteksi Otomatis</span>
          </button>

          <button
            onClick={handleFullImage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Penuh Layar</span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleRotate(-90)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Putar 90° Kiri"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleRotate(90)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Putar 90° Kanan"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
