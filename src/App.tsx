import React, { useState } from 'react';
import { PageItem, Quad, ScannedDocument, FilterType } from './types/scanner';
import { warpPerspective, getDefaultQuad } from './utils/cvEngine';
import { CameraView } from './components/CameraView';
import { CropEditor } from './components/CropEditor';
import { FilterEditor } from './components/FilterEditor';
import { PageListManager } from './components/PageListManager';
import { PdfExportModal } from './components/PdfExportModal';
import { SavedDocsModal } from './components/SavedDocsModal';
import { DriveBackupModal } from './components/DriveBackupModal';

type AppStep = 'camera' | 'crop' | 'filter' | 'pages';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('camera');

  // Multi-page document state
  const [pages, setPages] = useState<PageItem[]>([]);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);

  // Active snapshot being processed
  const [currentRawImage, setCurrentRawImage] = useState<string>('');
  const [currentDetectedQuad, setCurrentDetectedQuad] = useState<Quad | undefined>(undefined);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);

  // Modals state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showSavedDocsModal, setShowSavedDocsModal] = useState<boolean>(false);
  const [driveBackupData, setDriveBackupData] = useState<{
    fileName: string;
    fileSizeKb: number;
    base64Pdf: string;
  } | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // 1. Captured from Camera or Gallery or Sample Doc
  const handleCaptureImage = (dataUrl: string, detectedQuad?: Quad) => {
    setCurrentRawImage(dataUrl);
    setCurrentDetectedQuad(detectedQuad);
    setEditingPageIndex(null);
    setCurrentStep('crop');
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

  // Open existing document from saved docs modal
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Step 1: Camera Scanner (Default Full Screen) */}
        {currentStep === 'camera' && (
          <CameraView
            onCaptureImage={handleCaptureImage}
            currentPageCount={pages.length}
            onOpenSavedDocs={() => setShowSavedDocsModal(true)}
            onOpenPageManager={() => setCurrentStep('pages')}
          />
        )}

        {/* Step 2: 4-Corner Crop & Perspective Warp Editor */}
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

        {/* Step 3: Magic Filter & Image Processing Editor */}
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

        {/* Step 4: Multi-Page Manager & Reorder List */}
        {currentStep === 'pages' && (
          <PageListManager
            pages={pages}
            onAddPage={() => setCurrentStep('camera')}
            onEditCrop={handleEditCropForPage}
            onEditFilter={handleEditFilterForPage}
            onDeletePage={handleDeletePage}
            onReorderPages={handleReorderPages}
            onProceedToExport={() => setShowExportModal(true)}
            onBackToCamera={() => setCurrentStep('camera')}
          />
        )}
      </div>

      {/* PDF Export & OCR Rename Modal */}
      {showExportModal && (
        <PdfExportModal
          pages={pages}
          onClose={() => setShowExportModal(false)}
          onOpenDriveBackup={(data) => {
            setShowExportModal(false);
            setDriveBackupData(data);
          }}
          onSavedSuccessfully={() => {
            showToast('Dokumen berhasil disimpan ke PDF!');
            setShowExportModal(false);
            setShowSavedDocsModal(true);
          }}
        />
      )}

      {/* Saved Documents Modal */}
      {showSavedDocsModal && (
        <SavedDocsModal
          onClose={() => setShowSavedDocsModal(false)}
          onOpenDocument={handleOpenSavedDocument}
          onStartNewScan={() => {
            setPages([]);
            setEditingPageIndex(null);
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
