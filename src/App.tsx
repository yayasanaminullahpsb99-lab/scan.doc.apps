import React, { useState, useEffect } from 'react';
import { PageItem, Quad, ScannedDocument, FilterType } from './types/scanner';
import { warpPerspective, getDefaultQuad, detectDocumentCorners, applyFilter, generateThumbnail } from './utils/cvEngine';
import { fetchDocumentsCrossDevice } from './utils/storage';
import { CameraView } from './components/CameraView';
import { CropEditor } from './components/CropEditor';
import { FilterEditor } from './components/FilterEditor';
import { PageListManager } from './components/PageListManager';
import { PdfExportModal } from './components/PdfExportModal';
import { SavedDocsModal } from './components/SavedDocsModal';
import { DriveBackupModal } from './components/DriveBackupModal';
import { DocumentDirectoryView } from './components/DocumentDirectoryView';
import { Camera, FolderOpen, Layers, CheckCircle2, Sparkles, ImagePlus, RefreshCw } from 'lucide-react';

type AppStep = 'camera' | 'crop' | 'filter' | 'pages' | 'directory';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('camera');
  const [lastScanStep, setLastScanStep] = useState<'camera' | 'crop' | 'filter' | 'pages'>('camera');

  // Multi-page document state
  const [pages, setPages] = useState<PageItem[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

  // Active snapshot being processed
  const [currentRawImage, setCurrentRawImage] = useState<string>('');
  const [currentDetectedQuad, setCurrentDetectedQuad] = useState<Quad | undefined>(undefined);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);

  // Batch import progress state
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Total synced documents count (for nav badge)
  const [syncedDocCount, setSyncedDocCount] = useState<number>(0);

  // Modals state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showSavedDocsModal, setShowSavedDocsModal] = useState<boolean>(false);
  const [driveBackupData, setDriveBackupData] = useState<{
    fileName: string;
    fileSizeKb: number;
    base64Pdf: string;
  } | null>(null);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Poll synced documents count for header badge
  useEffect(() => {
    const updateCount = async () => {
      try {
        const docs = await fetchDocumentsCrossDevice();
        setSyncedDocCount(docs.length);
      } catch {
        // ignore
      }
    };
    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, [showExportModal]);

  // Track scan step when not in directory
  useEffect(() => {
    if (currentStep !== 'directory') {
      setLastScanStep(currentStep);
    }
  }, [currentStep]);

  // 1. Captured from Camera or Gallery or Sample Doc
  const handleCaptureImage = (dataUrl: string, detectedQuad?: Quad) => {
    setCurrentRawImage(dataUrl);
    setCurrentDetectedQuad(detectedQuad);
    setEditingPageIndex(null);
    setCurrentStep('crop');
  };

  // Batch Gallery Import Handler
  const handleBatchCaptureImages = async (dataUrls: string[]) => {
    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: dataUrls.length });

    const newPages: PageItem[] = [];

    for (let i = 0; i < dataUrls.length; i++) {
      setBatchProgress({ current: i + 1, total: dataUrls.length });
      const dataUrl = dataUrls[i];
      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const detectedQuad = detectDocumentCorners(img, w, h);
        const warped = await warpPerspective(img, detectedQuad);
        const filtered = applyFilter(warped, 'magic', 0, 0, 0);
        const processedDataUrl = filtered.toDataURL('image/jpeg', 0.92);
        const thumbnailUrl = generateThumbnail(filtered, 200);

        newPages.push({
          id: 'page_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6),
          originalDataUrl: dataUrl,
          originalWidth: w,
          originalHeight: h,
          cropQuad: detectedQuad,
          filter: 'magic',
          brightness: 0,
          contrast: 0,
          rotation: 0,
          processedDataUrl,
          thumbnailUrl,
        });
      } catch (e) {
        console.error('Batch process error for image', i, e);
      }
    }

    setPages((prev) => [...prev, ...newPages]);
    setIsBatchProcessing(false);
    setCurrentStep('pages');
    showToast(`Berhasil mengimpor ${newPages.length} foto dari galeri!`);
  };

  const handleImportGalleryFiles = async (files: FileList) => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(files[i]);
      });
      if (url) urls.push(url);
    }
    if (urls.length === 1) {
      handleCaptureImage(urls[0]);
    } else if (urls.length > 1) {
      handleBatchCaptureImages(urls);
    }
  };

  // 2. Applied Crop Corners -> Execute Perspective Transform (Warp)
  const handleApplyCrop = async (quad: Quad) => {
    try {
      const img = new Image();
      img.src = currentRawImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const warped = await warpPerspective(img, quad);
      setWarpedCanvas(warped);
      setCurrentStep('filter');
    } catch (err) {
      console.error('Perspective transform error:', err);
      showToast('Gagal meratakan perspektif dokumen.');
    }
  };

  // 3. Saved Filtered Page -> Add to Pages list
  const handleSaveFilteredPage = (
    processedDataUrl: string,
    thumbnailUrl: string,
    settings: {
      filter: FilterType;
      brightness: number;
      contrast: number;
      rotation: number;
    }
  ) => {
    if (editingPageIndex !== null && pages[editingPageIndex]) {
      // Update existing page
      setPages((prev) => {
        const copy = [...prev];
        copy[editingPageIndex] = {
          ...copy[editingPageIndex],
          filter: settings.filter,
          brightness: settings.brightness,
          contrast: settings.contrast,
          rotation: settings.rotation,
          processedDataUrl,
          thumbnailUrl,
        };
        return copy;
      });
      showToast('Halaman berhasil diperbarui!');
    } else {
      // Add new page
      const newPage: PageItem = {
        id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        originalDataUrl: currentRawImage,
        originalWidth: warpedCanvas ? warpedCanvas.width : 1000,
        originalHeight: warpedCanvas ? warpedCanvas.height : 1400,
        cropQuad: currentDetectedQuad || getDefaultQuad(1000, 1400),
        filter: settings.filter,
        brightness: settings.brightness,
        contrast: settings.contrast,
        rotation: settings.rotation,
        processedDataUrl,
        thumbnailUrl,
      };

      setPages((prev) => [...prev, newPage]);
      showToast(`Halaman ${pages.length + 1} berhasil ditambahkan!`);
    }

    setEditingPageIndex(null);
    setCurrentStep('pages');
  };

  // Navigation handlers
  const handleEditCropForPage = (index: number) => {
    const page = pages[index];
    if (!page) return;
    setEditingPageIndex(index);
    setCurrentRawImage(page.originalDataUrl);
    setCurrentDetectedQuad(page.cropQuad);
    setCurrentStep('crop');
  };

  const handleEditFilterForPage = async (index: number) => {
    const page = pages[index];
    if (!page) return;
    setEditingPageIndex(index);
    try {
      const img = new Image();
      img.src = page.originalDataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const warped = await warpPerspective(img, page.cropQuad);
      setWarpedCanvas(warped);
      setCurrentStep('filter');
    } catch {
      showToast('Gagal memuat editor filter.');
    }
  };

  const handleDeletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    showToast('Halaman dihapus.');
  };

  const handleReorderPages = (from: number, to: number) => {
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  // Open existing document from saved docs modal / directory
  const handleOpenSavedDocument = (doc: ScannedDocument) => {
    if (doc.pages && doc.pages.length > 0) {
      setPages(doc.pages);
      setShowSavedDocsModal(false);
      setCurrentStep('pages');
      showToast(`Membuka "${doc.title}" (${doc.pages.length} halaman)`);
    } else {
      showToast(`Dokumen "${doc.title}" siap diunduh`);
    }
  };

  const handleStartFreshScan = () => {
    setPages([]);
    setEditingPageIndex(null);
    setCurrentStep('camera');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Batch Processing Overlay */}
      {isBatchProcessing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-xl">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Mengimpor & Meratakan Gambar dari Galeri...
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Memproses foto {batchProgress.current} dari {batchProgress.total} dengan koreksi perspektif & Magic Color
          </p>
          <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${batchProgress.total ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Step: Directory / Daftar Berkas Semua Perangkat */}
        {currentStep === 'directory' && (
          <DocumentDirectoryView
            onOpenDocumentForEditing={handleOpenSavedDocument}
            onStartNewScan={handleStartFreshScan}
            onSwitchToCamera={() => setCurrentStep('camera')}
          />
        )}

        {/* Step: Camera Scanner */}
        {currentStep === 'camera' && (
          <CameraView
            onCaptureImage={handleCaptureImage}
            onBatchCaptureImages={handleBatchCaptureImages}
            currentPageCount={pages.length}
            onOpenSavedDocs={() => setCurrentStep('directory')}
            onOpenPageManager={() => setCurrentStep('pages')}
          />
        )}

        {/* Step: Crop Editor */}
        {currentStep === 'crop' && (
          <CropEditor
            originalDataUrl={currentRawImage}
            initialQuad={currentDetectedQuad}
            onApplyCrop={handleApplyCrop}
            onCancel={() => {
              if (pages.length > 0) {
                setCurrentStep('pages');
              } else {
                setCurrentStep('camera');
              }
            }}
          />
        )}

        {/* Step: Filter Editor */}
        {currentStep === 'filter' && warpedCanvas && (
          <FilterEditor
            warpedCanvas={warpedCanvas}
            initialFilter={
              editingPageIndex !== null && pages[editingPageIndex]
                ? pages[editingPageIndex].filter
                : 'magic'
            }
            initialBrightness={
              editingPageIndex !== null && pages[editingPageIndex]
                ? pages[editingPageIndex].brightness
                : 0
            }
            initialContrast={
              editingPageIndex !== null && pages[editingPageIndex]
                ? pages[editingPageIndex].contrast
                : 0
            }
            initialRotation={
              editingPageIndex !== null && pages[editingPageIndex]
                ? pages[editingPageIndex].rotation
                : 0
            }
            onSave={handleSaveFilteredPage}
            onBackToCrop={() => setCurrentStep('crop')}
          />
        )}

        {/* Step: Multi-Page Manager */}
        {currentStep === 'pages' && (
          <PageListManager
            pages={pages}
            onAddPage={() => setCurrentStep('camera')}
            onImportGallery={handleImportGalleryFiles}
            onEditCrop={handleEditCropForPage}
            onEditFilter={handleEditFilterForPage}
            onDeletePage={handleDeletePage}
            onReorderPages={handleReorderPages}
            onProceedToExport={() => setShowExportModal(true)}
            onBackToCamera={() => setCurrentStep('camera')}
          />
        )}
      </div>

      {/* Primary Global Navigation Bar (Bottom Dock) */}
      <nav className="relative z-30 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-md px-6 py-2.5 flex items-center justify-around shadow-2xl">
        {/* Nav Button 1: Pindai Dokumen (Scanner) */}
        <button
          onClick={() => {
            if (currentStep === 'directory') {
              setCurrentStep(lastScanStep);
            }
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-2xl transition font-semibold text-xs ${
            currentStep !== 'directory'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Pindai Dokumen</span>
          {pages.length > 0 && currentStep === 'directory' && (
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {pages.length}
            </span>
          )}
        </button>

        {/* Nav Button 2: Daftar Berkas (Semua Perangkat) */}
        <button
          onClick={() => setCurrentStep('directory')}
          className={`flex items-center gap-2 px-5 py-2 rounded-2xl transition font-semibold text-xs ${
            currentStep === 'directory'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Daftar Berkas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              currentStep === 'directory'
                ? 'bg-slate-950 text-emerald-300'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {syncedDocCount}
          </span>
        </button>
      </nav>

      {/* PDF Export & File Renaming Modal */}
      {showExportModal && (
        <PdfExportModal
          pages={pages}
          onClose={() => setShowExportModal(false)}
          onOpenDriveBackup={(data) => {
            setShowExportModal(false);
            setDriveBackupData(data);
          }}
          onSavedSuccessfully={() => {
            showToast('Dokumen tersimpan & tersinkronisasi ke semua perangkat!');
            setCurrentStep('directory');
          }}
        />
      )}

      {/* Saved Documents Library Modal (Secondary) */}
      {showSavedDocsModal && (
        <SavedDocsModal
          onClose={() => setShowSavedDocsModal(false)}
          onOpenDocument={handleOpenSavedDocument}
          onStartNewScan={() => {
            setShowSavedDocsModal(false);
            setCurrentStep('camera');
          }}
        />
      )}

      {/* Google Drive Backup Modal */}
      {driveBackupData && (
        <DriveBackupModal
          fileName={driveBackupData.fileName}
          fileSizeKb={driveBackupData.fileSizeKb}
          base64Pdf={driveBackupData.base64Pdf}
          onClose={() => setDriveBackupData(null)}
        />
      )}
    </div>
  );
}
