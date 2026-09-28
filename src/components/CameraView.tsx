import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Quad, Point } from '../types/scanner';
import { detectDocumentCorners, distance } from '../utils/cvEngine';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../utils/sampleDocuments';
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  ImagePlus,
  Sparkles,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  FolderOpen,
  Grid3X3,
  CreditCard,
  BookOpen,
  Receipt,
  ScanLine,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Layers,
  ArrowRight,
  Maximize,
  HelpCircle
} from 'lucide-react';

interface CameraViewProps {
  onCaptureImage: (dataUrl: string, detectedQuad?: Quad) => void;
  onBatchCaptureImages?: (dataUrls: string[]) => void;
  currentPageCount: number;
  onOpenSavedDocs: () => void;
  onOpenPageManager?: () => void;
}

type ScanMode = 'document' | 'idcard' | 'receipt' | 'book';

export const CameraView: React.FC<CameraViewProps> = ({
  onCaptureImage,
  onBatchCaptureImages,
  currentPageCount,
  onOpenSavedDocs,
  onOpenPageManager,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Scanner UI feature states
  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

  // Auto-capture countdown and stability tracking
  const [autoCaptureProgress, setAutoCaptureProgress] = useState<number>(0);
  const lastQuadRef = useRef<Quad | null>(null);
  const stableCountRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);

  // Sample documents modal
  const [showSamplePicker, setShowSamplePicker] = useState<boolean>(false);

  // Smoothed quad for rendering
  const smoothedQuadRef = useRef<Quad | null>(null);

  // Audio shutter sound synthesizer using Web Audio API
  const playShutterSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch {
      // Audio context may require prior user interaction
    }
  }, [soundEnabled]);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser ini.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera atau gunakan tombol Import Galeri / Dokumen Contoh.'
          : 'Gagal mengakses kamera. Silakan pilih foto dari galeri atau coba dokumen contoh.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.error('Torch error:', e);
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current video frame
  const takeSnapshot = useCallback(() => {
    if (isCapturingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    isCapturingRef.current = true;
    playShutterSound();

    // Trigger visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 120);

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) {
      isCapturingRef.current = false;
      return;
    }

    ctx.drawImage(video, 0, 0, vw, vh);
    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.95);

    // Get detected quad scaled to video dimensions
    const detected = smoothedQuadRef.current || detectDocumentCorners(video, vw, vh);

    isCapturingRef.current = false;
    setAutoCaptureProgress(0);
    onCaptureImage(dataUrl, detected);
  }, [onCaptureImage, playShutterSound]);

  // Real-time edge detection & overlay rendering loop
  useEffect(() => {
    let animId: number;
    let lastAnalyzeTime = 0;

    const loop = (time: number) => {
      animId = requestAnimationFrame(loop);

      const video = videoRef.current;
      const overlay = canvasOverlayRef.current;
      if (!video || !overlay || video.readyState < 2 || !isCameraActive) return;

      const cw = overlay.clientWidth;
      const ch = overlay.clientHeight;
      if (overlay.width !== cw || overlay.height !== ch) {
        overlay.width = cw;
        overlay.height = ch;
      }

      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, cw, ch);

      // Throttled detection every 130ms
      if (time - lastAnalyzeTime > 130) {
        lastAnalyzeTime = time;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw > 0 && vh > 0) {
          const rawQuad = detectDocumentCorners(video, vw, vh);

          // Map from video resolution to overlay canvas display coordinates
          const scale = Math.min(cw / vw, ch / vh);
          const offsetX = (cw - vw * scale) / 2;
          const offsetY = (ch - vh * scale) / 2;

          const toDisplay = (p: Point): Point => ({
            x: offsetX + p.x * scale,
            y: offsetY + p.y * scale,
          });

          const currentDisplayQuad: Quad = {
            tl: toDisplay(rawQuad.tl),
            tr: toDisplay(rawQuad.tr),
            br: toDisplay(rawQuad.br),
            bl: toDisplay(rawQuad.bl),
          };

          // Smooth interpolation
          if (!smoothedQuadRef.current) {
            smoothedQuadRef.current = rawQuad;
          } else {
            const lerp = (a: number, b: number) => a + (b - a) * 0.45;
            smoothedQuadRef.current = {
              tl: { x: lerp(smoothedQuadRef.current.tl.x, rawQuad.tl.x), y: lerp(smoothedQuadRef.current.tl.y, rawQuad.tl.y) },
              tr: { x: lerp(smoothedQuadRef.current.tr.x, rawQuad.tr.x), y: lerp(smoothedQuadRef.current.tr.y, rawQuad.tr.y) },
              br: { x: lerp(smoothedQuadRef.current.br.x, rawQuad.br.x), y: lerp(smoothedQuadRef.current.br.y, rawQuad.br.y) },
              bl: { x: lerp(smoothedQuadRef.current.bl.x, rawQuad.bl.x), y: lerp(smoothedQuadRef.current.bl.y, rawQuad.bl.y) },
            };
          }

          // Check stability for auto-capture
          if (autoCaptureEnabled && !isCapturingRef.current) {
            if (lastQuadRef.current) {
              const dTl = distance(currentDisplayQuad.tl, lastQuadRef.current.tl);
              const dTr = distance(currentDisplayQuad.tr, lastQuadRef.current.tr);
              const dBr = distance(currentDisplayQuad.br, lastQuadRef.current.br);
              const dBl = distance(currentDisplayQuad.bl, lastQuadRef.current.bl);
              const movement = (dTl + dTr + dBr + dBl) / 4;

              if (movement < 10) {
                stableCountRef.current++;
                setAutoCaptureProgress(Math.min(100, Math.round((stableCountRef.current / 8) * 100)));
                if (stableCountRef.current >= 8) {
                  takeSnapshot();
                  stableCountRef.current = 0;
                }
              } else {
                stableCountRef.current = 0;
                setAutoCaptureProgress(0);
              }
            }
            lastQuadRef.current = currentDisplayQuad;
          }
        }
      }

      // Draw overlay quad polygon
      if (smoothedQuadRef.current && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.min(cw / vw, ch / vh);
        const offsetX = (cw - vw * scale) / 2;
        const offsetY = (ch - vh * scale) / 2;

        const sq = smoothedQuadRef.current;
        const pts = [
          { x: offsetX + sq.tl.x * scale, y: offsetY + sq.tl.y * scale },
          { x: offsetX + sq.tr.x * scale, y: offsetY + sq.tr.y * scale },
          { x: offsetX + sq.br.x * scale, y: offsetY + sq.br.y * scale },
          { x: offsetX + sq.bl.x * scale, y: offsetY + sq.bl.y * scale },
        ];

        // Draw translucent boundary fill
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
        ctx.fill();

        // Glowing border
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw target corner brackets
        pts.forEach((p) => {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        });
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoCaptureEnabled, isCameraActive, takeSnapshot]);

  // Handle Gallery Upload (Supports single or multi-image import!)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          playShutterSound();
          onCaptureImage(dataUrl);
        }
      };
      reader.readAsDataURL(files[0]);
    } else {
      // Multiple images selected
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        if (url) urls.push(url);
      }

      if (urls.length > 0) {
        playShutterSound();
        if (onBatchCaptureImages) {
          onBatchCaptureImages(urls);
        } else {
          onCaptureImage(urls[0]);
        }
      }
    }
  };

  // Handle Sample Doc Selection
  const handleSelectSample = (sample: SampleDoc) => {
    setShowSamplePicker(false);
    playShutterSound();
    const dataUrl = sample.generateDataUrl();
    onCaptureImage(dataUrl);
  };

  const scanModesList: { id: ScanMode; label: string; icon: any }[] = [
    { id: 'document', label: 'Dokumen', icon: FileText },
    { id: 'idcard', label: 'KTP / ID', icon: CreditCard },
    { id: 'receipt', label: 'Kuitansi', icon: Receipt },
    { id: 'book', label: 'Buku', icon: BookOpen },
  ];

  return (
    <div className="relative w-full h-full min-h-[90vh] flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* White flash effect on capture */}
      {isShutterFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-100 opacity-90" />
      )}

      {/* Top Header Bar with Standard Scanner Icons */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/95 via-slate-950/75 to-transparent">
        {/* Left: Saved Documents / Folder Icon */}
        <button
          onClick={onOpenSavedDocs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 backdrop-blur-md transition shadow-md group"
          title="Daftar Berkas Tersinkronisasi"
        >
          <FolderOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold hidden sm:inline">Daftar Berkas</span>
        </button>

        {/* Center: App Title & Status */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-widest text-white uppercase">
              SCANDOCAPP
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Smart Document Scanner</span>
        </div>

        {/* Right Toolbar Icons: Flash, Grid, Sound, Flip Camera */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Flash / Torch Toggle */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border backdrop-blur-md transition ${
                torchOn
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={torchOn ? 'Matikan Lampu Senter' : 'Nyalakan Lampu Senter'}
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Grid Overlay Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-xl border backdrop-blur-md transition ${
              showGrid
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
            title="Garis Kisi (Grid Alignment)"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Sound / Shutter Audio Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border backdrop-blur-md transition ${
              soundEnabled
                ? 'bg-slate-900/80 border-slate-700/80 text-emerald-400'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-500'
            }`}
            title={soundEnabled ? 'Suara Shutter Aktif' : 'Suara Shutter Mati'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Flip Front/Back Camera */}
          <button
            onClick={flipCamera}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 backdrop-blur-md transition hover:text-white"
            title="Balik Kamera Depan / Belakang"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewfinder / Camera Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* HTML Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Live Canvas Edge Detection Overlay */}
        <canvas
          ref={canvasOverlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Dynamic Laser Scanning Beam Effect (CamScanner style) */}
        {isCameraActive && (
          <div className="absolute inset-x-8 top-16 bottom-24 pointer-events-none z-12 overflow-hidden opacity-60">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-[scanner_2.8s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Framing Guide Corners (CamScanner / Adobe Scan style) */}
        <div
          className={`absolute pointer-events-none z-15 flex flex-col justify-between transition-all duration-300 ${
            scanMode === 'idcard'
              ? 'inset-x-12 inset-y-28 sm:inset-x-32 sm:inset-y-36'
              : scanMode === 'receipt'
              ? 'inset-x-16 inset-y-12 sm:inset-x-44'
              : 'inset-x-8 inset-y-16'
          }`}
        >
          <div className="flex justify-between">
            <div className="w-9 h-9 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-md" />
            <div className="w-9 h-9 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-md" />
          </div>

          {/* Mode watermark text in center */}
          <div className="text-center opacity-40 text-emerald-300 text-xs font-mono tracking-widest uppercase">
            {scanMode === 'idcard' && 'Batas Kartu Identitas (KTP / SIM)'}
            {scanMode === 'receipt' && 'Batas Struk Belanja / Kuitansi'}
            {scanMode === 'book' && 'Batas Dokumen Buku / Lembar Terbuka'}
            {scanMode === 'document' && 'Batas Dokumen A4 / Surat'}
          </div>

          <div className="flex justify-between">
            <div className="w-9 h-9 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-md" />
            <div className="w-9 h-9 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-md" />
          </div>
        </div>

        {/* Grid Overlay Lines (if enabled) */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-11 grid grid-cols-3 grid-rows-3 opacity-25">
            <div className="border-r border-b border-emerald-300/60" />
            <div className="border-r border-b border-emerald-300/60" />
            <div className="border-b border-emerald-300/60" />
            <div className="border-r border-b border-emerald-300/60" />
            <div className="border-r border-b border-emerald-300/60" />
            <div className="border-b border-emerald-300/60" />
            <div className="border-r border-emerald-300/60" />
            <div className="border-r border-emerald-300/60" />
            <div />
          </div>
        )}

        {/* Auto Capture Stability Progress Ring */}
        {autoCaptureEnabled && autoCaptureProgress > 0 && (
          <div className="absolute top-24 z-25 flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-slate-950/80 border-2 border-emerald-500 backdrop-blur-md flex items-center justify-center shadow-xl animate-pulse">
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                {autoCaptureProgress}%
              </span>
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold bg-slate-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Tahan stabil...
            </span>
          </div>
        )}

        {/* Top Hint Pill */}
        <div className="absolute top-16 z-20 px-4 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-xs font-medium text-slate-200 shadow-xl flex items-center gap-2">
          {autoCaptureEnabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Auto-Capture Aktif: Posisikan dokumen & tahan stabil</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arahkan kamera ke dokumen, tekan tombol shutter</span>
            </>
          )}
        </div>

        {/* Camera Permission / Error Fallback Notice */}
        {cameraError && (
          <div className="absolute inset-x-6 top-1/4 z-30 p-5 rounded-3xl bg-slate-900/95 border border-slate-800 text-center shadow-2xl backdrop-blur-lg flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Akses Kamera Diperlukan</h3>
            <p className="text-xs text-slate-300 mb-4 max-w-sm">{cameraError}</p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Import Foto dari Galeri</span>
              </button>

              <button
                onClick={() => setShowSamplePicker(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Coba Dokumen Contoh</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Scanner Dock Controls Bar */}
      <div className="relative z-30 px-5 pt-3 pb-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-3">
        {/* Document Type Mode Switcher Carousel */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
          {scanModesList.map((mode) => {
            const Icon = mode.icon;
            const isSelected = scanMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setScanMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-bar: Auto Capture Toggle & Sample Document trigger */}
        <div className="flex items-center justify-between px-3">
          <button
            onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              autoCaptureEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-Snap: {autoCaptureEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowSamplePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-slate-800 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Contoh Dokumen</span>
          </button>
        </div>

        {/* Primary Shutter & Import Dock */}
        <div className="flex items-center justify-between px-4 pt-1 pb-1">
          {/* 1. Import dari Galeri Button (Standard Scanner App Feature) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            title="Import Gambar dari Galeri Foto"
          >
            <div className="w-13 h-13 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 group-hover:border-emerald-400 group-hover:bg-slate-800/80 flex items-center justify-center shadow-lg transition-all transform group-active:scale-95">
              <ImagePlus className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-300">
              Import Galeri
            </span>
          </button>

          {/* 2. Main Large Camera Shutter Button */}
          <button
            onClick={takeSnapshot}
            className="relative group p-2 focus:outline-none"
            title="Ambil Foto Dokumen (Shutter)"
          >
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/80 flex items-center justify-center group-hover:border-emerald-300 group-active:scale-95 transition-all shadow-xl shadow-emerald-500/25 bg-slate-950/50 backdrop-blur-md">
              <div className="w-15 h-15 rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                <Camera className="w-7 h-7 text-slate-950" />
              </div>
            </div>
          </button>

          {/* 3. Review / Multi-Page Badge or Sample Picker */}
          {currentPageCount > 0 ? (
            <button
              onClick={onOpenPageManager}
              className="flex flex-col items-center gap-1 group focus:outline-none"
              title="Lihat Daftar Halaman yang Sudah Discan"
            >
              <div className="relative w-13 h-13 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 group-hover:border-emerald-400 group-hover:bg-emerald-500/25 flex items-center justify-center shadow-lg transition-all transform group-active:scale-95">
                <Layers className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                  {currentPageCount}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-300">
                Review ({currentPageCount})
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowSamplePicker(true)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
              title="Coba Berkas Contoh"
            >
              <div className="w-13 h-13 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 group-hover:border-amber-400 group-hover:bg-slate-800/80 flex items-center justify-center shadow-lg transition-all transform group-active:scale-95">
                <Sparkles className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-bold text-slate-300 group-hover:text-amber-300">
                Uji Contoh
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Input for Device Gallery (Single or Multi-file upload) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sample Documents Picker Modal */}
      {showSamplePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Pilih Dokumen Contoh</h3>
                  <p className="text-xs text-slate-400">
                    Uji coba deteksi sudut & perataan perspektif otomatis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSamplePicker(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {SAMPLE_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectSample(doc)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">
                        {doc.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">{doc.category}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Muat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
