import React, { useState, useRef } from 'react';
import { PageItem } from '../types/scanner';
import {
  Plus,
  Trash2,
  Crop,
  Sliders,
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  Camera,
  Eye,
  X,
  Layers,
  ImagePlus,
  Maximize2
} from 'lucide-react';

interface PageListManagerProps {
  pages: PageItem[];
  onAddPage: () => void;
  onImportGallery?: (files: FileList) => void;
  onEditCrop: (pageIndex: number) => void;
  onEditFilter: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onProceedToExport: () => void;
  onBackToCamera: () => void;
}

export const PageListManager: React.FC<PageListManagerProps> = ({
  pages,
  onAddPage,
  onImportGallery,
  onEditCrop,
  onEditFilter,
  onDeletePage,
  onReorderPages,
  onProceedToExport,
  onBackToCamera,
}) => {
  const [previewPage, setPreviewPage] = useState<PageItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const movePage = (index: number, direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? index - 1 : index + 1;
    if (target >= 0 && target < pages.length) {
      onReorderPages(index, target);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportGallery) {
      onImportGallery(e.target.files);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <button
          onClick={onBackToCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">Kamera Scan</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wide text-white">
              Kelola Halaman ({pages.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Atur urutan, edit sudut, atau tambah berkas</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Galeri Button */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Import Gambar dari Galeri"
          >
            <ImagePlus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Galeri</span>
          </button>

          {/* Kamera Button */}
          <button
            onClick={onAddPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Scan</span>
          </button>
        </div>
      </header>

      {/* Pages Grid Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Belum Ada Halaman Dokumen</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Ambil foto menggunakan kamera atau import gambar dari galeri untuk membuat file PDF.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onAddPage}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
                >
                  <ImagePlus className="w-4 h-4 text-emerald-400" />
                  <span>Import Galeri</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg hover:border-slate-700 transition"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-800 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Halaman {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Move Left / Up */}
                      <button
                        onClick={() => movePage(index, 'prev')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                        title="Geser ke Halaman Sebelumnya"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      {/* Move Right / Down */}
                      <button
                        onClick={() => movePage(index, 'next')}
                        disabled={index === pages.length - 1}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                        title="Geser ke Halaman Berikutnya"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => onDeletePage(index)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition ml-1"
                        title="Hapus Halaman Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview */}
                  <div
                    onClick={() => setPreviewPage(page)}
                    className="relative aspect-[3/4] bg-slate-950 flex items-center justify-center p-2 cursor-pointer group"
                  >
                    <img
                      src={page.thumbnailUrl || page.processedDataUrl}
                      alt={`Halaman ${index + 1}`}
                      className="max-w-full max-h-full object-contain rounded shadow-sm group-hover:scale-[1.02] transition-transform"
                    />

                    {/* Filter badge */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] font-semibold text-slate-300">
                      {page.filter === 'magic'
                        ? 'Magic Color'
                        : page.filter === 'bw'
                        ? 'B&W'
                        : page.filter === 'grayscale'
                        ? 'Grayscale'
                        : 'Original'}
                    </div>

                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Perbesar</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for this Page */}
                  <div className="grid grid-cols-2 gap-1 p-2 bg-slate-900 border-t border-slate-800">
                    <button
                      onClick={() => onEditCrop(index)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition"
                    >
                      <Crop className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ubah Crop</span>
                    </button>

                    <button
                      onClick={() => onEditFilter(index)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Filter & Warna</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Slot 1: Add via Camera */}
              <button
                onClick={onAddPage}
                className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900/40 text-slate-400 hover:text-emerald-400 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/40 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                  Scan Halaman Baru (Kamera)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Buka kamera untuk scan lembar berikutnya
                </span>
              </button>

              {/* Slot 2: Import via Gallery */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900/40 text-slate-400 hover:text-emerald-400 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/40 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ImagePlus className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                  Import dari Galeri Foto
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Pilih satu atau beberapa foto dari galeri
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input for Gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryChange}
      />

      {/* Bottom Sticky Action Bar */}
      {pages.length > 0 && (
        <footer className="px-4 py-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-3 z-20">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Total {pages.length} Halaman Siap Dikonversi
            </span>
            <span className="text-[11px] text-slate-400">
              Format standar PDF resolusi tinggi
            </span>
          </div>

          <button
            onClick={onProceedToExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Ekspor ke PDF →</span>
          </button>
        </footer>
      )}

      {/* Full Page Zoom Modal */}
      {previewPage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Preview Halaman Penuh</h3>
            <button
              onClick={() => setPreviewPage(null)}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img
              src={previewPage.processedDataUrl || previewPage.originalDataUrl}
              alt="Halaman Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
