import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PageItem, PdfExportOptions, PaperSize, PageOrientation, CompressionQuality, ScannedDocument } from '../types/scanner';
import { generatePdf } from '../utils/pdfGenerator';
import { generateDefaultFileName, formatFileSize, saveDocumentCrossDevice, getDeviceName } from '../utils/storage';
import {
  FileText,
  Download,
  Share2,
  Sparkles,
  Cloud,
  CheckCircle2,
  Settings2,
  X,
  FileCheck,
  RefreshCw,
  HardDrive
} from 'lucide-react';

interface PdfExportModalProps {
  pages: PageItem[];
  onClose: () => void;
  onOpenDriveBackup: (docData: { fileName: string; fileSizeKb: number; base64Pdf: string }) => void;
  onSavedSuccessfully: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  pages,
  onClose,
  onOpenDriveBackup,
  onSavedSuccessfully,
}) => {
  const [fileName, setFileName] = useState<string>(() => generateDefaultFileName('Scan'));
  const [pageSize, setPageSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('auto');
  const [quality, setQuality] = useState<CompressionQuality>('medium');
  const [includeTimestamp, setIncludeTimestamp] = useState<boolean>(true);

  // PDF generation output
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfSizeKb, setPdfSizeKb] = useState<number>(0);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // OCR Recommendations
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);

  // Trigger OCR extraction on first page
  useEffect(() => {
    if (pages.length === 0) return;

    const analyzeOcr = async () => {
      setIsOcrLoading(true);
      try {
        const firstPageData = pages[0].processedDataUrl || pages[0].originalDataUrl;
        const res = await fetch('/api/ocr-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: firstPageData,
            mimeType: 'image/jpeg',
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data;
          if (data.documentType) setDetectedType(data.documentType);
          if (data.extractedSummary) setExtractedSummary(data.extractedSummary);

          const suggestions: string[] = [];
          if (data.suggestedFileNames && Array.isArray(data.suggestedFileNames)) {
            suggestions.push(...data.suggestedFileNames);
          }
          if (data.detectedTitle) {
            const clean = data.detectedTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
            if (clean && !suggestions.includes(clean)) {
              suggestions.unshift(clean);
            }
          }

          if (suggestions.length > 0) {
            setSuggestedTitles(suggestions);
          }
        }
      } catch (err) {
        console.warn('OCR auto-extract error:', err);
      } finally {
        setIsOcrLoading(false);
      }
    };

    analyzeOcr();
  }, [pages]);

  // Re-generate PDF whenever settings change
  useEffect(() => {
    let isCancelled = false;

    const buildPdf = async () => {
      setIsGenerating(true);
      try {
        const finalName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;
        const result = await generatePdf(pages, {
          fileName: finalName,
          pageSize,
          orientation,
          quality,
          includeTimestampFooter: includeTimestamp,
        });

        if (!isCancelled) {
          setPdfBlob(result.blob);
          setPdfBlobUrl(result.blobUrl);
          setPdfSizeKb(result.sizeKb);
          setPdfBase64(result.base64);
        }
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    buildPdf();

    return () => {
      isCancelled = true;
    };
  }, [pages, pageSize, orientation, quality, includeTimestamp, fileName]);

  // Handle prefix button click
  const applyPrefix = (prefix: string) => {
    const newName = generateDefaultFileName(prefix);
    setFileName(newName);
  };

  // Download PDF
  const handleDownload = () => {
    if (!pdfBlobUrl) return;

    const safeName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // Auto save to local storage
    saveToLocalStorage();
  };

  // Web Share API
  const handleShare = async () => {
    if (!pdfBlob) return;
    const safeName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;

    try {
      const file = new File([pdfBlob], safeName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: safeName,
          text: `Dokumen hasil scan ${safeName} via DocScan Pro`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: safeName,
          text: `Dokumen hasil scan ${safeName}`,
          url: pdfBlobUrl || undefined,
        });
      } else {
        alert('Fitur berbagi tidak didukung di browser ini. Gunakan tombol Download.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    }
  };

  // Save to persistent storage and broadcast to all devices
  const saveToLocalStorage = async () => {
    const safeName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;
    const docItem: ScannedDocument = {
      id: 'doc_' + Date.now(),
      title: safeName,
      pageCount: pages.length,
      thumbnailUrl: pages[0]?.thumbnailUrl || pages[0]?.processedDataUrl || '',
      createdAt: new Date().toISOString(),
      pdfSizeKb: pdfSizeKb,
      pdfBase64: pdfBase64 || undefined,
      deviceSource: getDeviceName(),
      category: detectedType || 'Dokumen',
      pages: pages,
    };

    await saveDocumentCrossDevice(docItem);
    onSavedSuccessfully();
  };

  const handleDriveBackup = () => {
    if (!pdfBase64) return;
    const safeName = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;
    onOpenDriveBackup({
      fileName: safeName,
      fileSizeKb: pdfSizeKb,
      base64Pdf: pdfBase64,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ekspor & Konversi Dokumen PDF</h2>
              <span className="text-xs text-slate-400">{pages.length} Halaman dipilih</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Section 1: File Renaming & Smart Suggestions */}
          <div className="flex flex-col gap-2.5 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Nama File PDF</span>
              <span className="text-[11px] text-emerald-400 font-normal">Format: [Nama].pdf</span>
            </label>

            <div className="relative flex items-center">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Scan_20260928_153022.pdf"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs sm:text-sm focus:border-emerald-500 focus:outline-none pr-14"
              />
              <span className="absolute right-3 text-xs font-semibold text-slate-500 pointer-events-none">
                PDF
              </span>
            </div>

            {/* Quick prefix buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400">Pola Default:</span>
              {(['Scan', 'Invoice', 'Kuitansi', 'Sertifikat', 'Nota'] as const).map((pref) => (
                <button
                  key={pref}
                  onClick={() => applyPrefix(pref)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
                >
                  +{pref}
                </button>
              ))}
            </div>

            {/* OCR Extracted Title Recommendations */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Rekomendasi Judul (Cerdas OCR):
                </span>
                {isOcrLoading && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    Mendeteksi teks dokumen...
                  </span>
                )}
              </div>

              {detectedType && (
                <div className="mb-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Tipe Terdeteksi: {detectedType}
                  </span>
                </div>
              )}

              {suggestedTitles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTitles.map((title, i) => (
                    <button
                      key={i}
                      onClick={() => setFileName(title.endsWith('.pdf') ? title : `${title}.pdf`)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition text-left flex items-center gap-1"
                    >
                      <span>{title.endsWith('.pdf') ? title : `${title}.pdf`}</span>
                      <span className="text-[10px] text-emerald-400">✓</span>
                    </button>
                  ))}
                </div>
              ) : (
                !isOcrLoading && (
                  <span className="text-[11px] text-slate-500 italic">
                    Gunakan pola default tanggal & waktu di atas.
                  </span>
                )
              )}
            </div>
          </div>

          {/* Section 2: PDF Configuration Engine */}
          <div className="flex flex-col gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pengaturan Format & Konversi PDF</span>
            </div>

            {/* Paper Size */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Ukuran Kertas:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'a4', label: 'A4 Standar' },
                  { id: 'letter', label: 'Letter' },
                  { id: 'auto', label: 'Auto (Fit Gambar)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPageSize(item.id as PaperSize)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition ${
                      pageSize === item.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Orientation */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Orientasi Halaman:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto (Deteksi)' },
                  { id: 'portrait', label: 'Portrait (Tegak)' },
                  { id: 'landscape', label: 'Landscape' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setOrientation(item.id as PageOrientation)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition ${
                      orientation === item.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compression Quality */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Kualitas Kompresi Ukuran File:</span>
                <span className="text-emerald-400 font-bold">
                  Estimasi: {formatFileSize(pdfSizeKb)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'high', label: 'Tinggi (Jernih)' },
                  { id: 'medium', label: 'Sedang (Seimbang)' },
                  { id: 'low', label: 'Rendah (Hemat)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setQuality(item.id as CompressionQuality)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition ${
                      quality === item.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Footer Timestamp */}
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTimestamp}
                onChange={(e) => setIncludeTimestamp(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Sertakan nomor halaman & tanggal di bagian bawah (Footer)</span>
            </label>
          </div>

          {/* PDF Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">Status PDF:</span>
            </div>
            {isGenerating ? (
              <span className="text-amber-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Mengompilasi PDF...
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Siap Diunduh ({formatFileSize(pdfSizeKb)})
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex flex-col gap-2">
          {/* Main Action: Download */}
          <button
            onClick={handleDownload}
            disabled={isGenerating || !pdfBlobUrl}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition disabled:opacity-50 transform hover:-translate-y-0.5"
          >
            <Download className="w-5 h-5" />
            <span>Download File PDF Sekarang</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleShare}
              disabled={isGenerating || !pdfBlobUrl}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Kirim via WhatsApp, Email, dll"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bagikan</span>
            </button>

            <button
              onClick={handleDriveBackup}
              disabled={isGenerating || !pdfBase64}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Cadangkan ke Akun Google Drive"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Drive</span>
            </button>

            <button
              onClick={saveToLocalStorage}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Simpan ke Galeri Dokumen Saya"
            >
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>Simpan Lokal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
