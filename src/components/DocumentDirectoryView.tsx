import React, { useState, useEffect, useCallback } from 'react';
import { ScannedDocument } from '../types/scanner';
import {
  fetchDocumentsCrossDevice,
  deleteDocumentCrossDevice,
  renameDocumentCrossDevice,
  formatFileSize,
  getLastSyncTime,
  getDeviceName
} from '../utils/storage';
import {
  FolderOpen,
  Search,
  Download,
  Trash2,
  Edit2,
  FileText,
  Calendar,
  Share2,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  Eye,
  Plus,
  Filter,
  Grid,
  List,
  Sparkles,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';

interface DocumentDirectoryViewProps {
  onOpenDocumentForEditing: (doc: ScannedDocument) => void;
  onStartNewScan: () => void;
  onSwitchToCamera: () => void;
}

export const DocumentDirectoryView: React.FC<DocumentDirectoryViewProps> = ({
  onOpenDocumentForEditing,
  onStartNewScan,
  onSwitchToCamera,
}) => {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ScannedDocument | null>(null);

  const currentDevice = getDeviceName();

  const loadDocuments = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const docs = await fetchDocumentsCrossDevice();
      setDocuments(docs);
      setLastSync(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    // Periodic auto-sync every 8 seconds so other devices' scans show up automatically!
    const interval = setInterval(() => {
      loadDocuments(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus dokumen ini dari semua perangkat yang terhubung?')) {
      await deleteDocumentCrossDevice(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleStartRename = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditTitle(doc.title.replace(/\.pdf$/i, ''));
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await renameDocumentCrossDevice(id, editTitle.trim());
      setEditingId(null);
      loadDocuments(false);
    }
  };

  const handleDownload = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc.pdfBase64) {
      const a = document.createElement('a');
      a.href = doc.pdfBase64;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      onOpenDocumentForEditing(doc);
    }
  };

  const handleShare = async (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doc.pdfBase64) return;
    try {
      // Convert base64 data to blob
      const res = await fetch(doc.pdfBase64);
      const blob = await res.blob();
      const file = new File([blob], doc.title, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.title,
          text: `Berkas scan ${doc.title} via DocScan Pro`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: doc.title,
          text: `Berkas scan ${doc.title}`,
        });
      } else {
        handleDownload(doc, e);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    }
  };

  // Filtered documents
  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category && doc.category.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'invoice')
      return matchesSearch && /invoice|tagihan/i.test(doc.title);
    if (selectedCategory === 'receipt')
      return matchesSearch && /struk|kuitansi|receipt/i.test(doc.title);
    if (selectedCategory === 'certificate')
      return matchesSearch && /sertifikat|certificate|ijazah/i.test(doc.title);
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="px-4 py-3 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">
                  Daftar Berkas Tersinkronisasi
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Cloud Sync Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Terbaca otomatis di setiap smartphone, tablet & laptop yang membuka aplikasi ini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDocuments(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              title="Segarkan daftar dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sinkronkan</span>
            </button>

            <button
              onClick={onStartNewScan}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Pindai Baru</span>
            </button>
          </div>
        </div>

        {/* Sync Info Pill Bar */}
        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Perangkat ini:
            </span>
            <span className="font-semibold text-slate-200">{currentDevice}</span>
          </div>

          <div className="text-slate-400">
            <span>Terakhir diperbarui: </span>
            <span className="font-mono text-emerald-400 font-medium">
              {lastSync || 'Baru saja'}
            </span>
          </div>
        </div>

        {/* Search & Category Filter Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berkas scan (Invoice, Kuitansi, Nama)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'all', label: 'Semua Berkas' },
              { id: 'invoice', label: 'Invoice' },
              { id: 'receipt', label: 'Kuitansi' },
              { id: 'certificate', label: 'Sertifikat' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tampilan Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tampilan List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">
              Memuat berkas tersinkronisasi dari server...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
              <FileText className="w-8 h-8 text-emerald-400/80" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? 'Berkas Tidak Ditemukan' : 'Belum Ada Berkas yang Discan'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              {searchQuery
                ? `Tidak ada berkas yang cocok dengan pencarian "${searchQuery}".`
                : 'Mulai pindai dokumen menggunakan kamera atau coba berkas contoh. Hasil scan akan langsung tersinkronisasi ke seluruh perangkat Anda.'}
            </p>
            <button
              onClick={onStartNewScan}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Mulai Pindai Dokumen</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setPreviewDoc(doc)}
                className="group flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 shadow-xl overflow-hidden transition-all cursor-pointer"
              >
                {/* Thumbnail Preview Area */}
                <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center p-3 overflow-hidden border-b border-slate-800">
                  {doc.thumbnailUrl ? (
                    <img
                      src={doc.thumbnailUrl}
                      alt={doc.title}
                      className="max-w-full max-h-full object-contain rounded shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FileText className="w-12 h-12 text-slate-600" />
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 text-[10px] font-bold text-emerald-400">
                      {doc.pageCount} Halaman
                    </span>
                    {doc.pdfSizeKb ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 text-[10px] font-semibold text-slate-300">
                        {formatFileSize(doc.pdfSizeKb)}
                      </span>
                    ) : null}
                  </div>

                  {/* Device Source Badge */}
                  {doc.deviceSource && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-sm border border-slate-700 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      {/android|ios|iphone|mobile/i.test(doc.deviceSource) ? (
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-blue-400" />
                      )}
                      <span>{doc.deviceSource}</span>
                    </div>
                  )}

                  {/* Hover Quick Action Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDoc(doc);
                      }}
                      className="p-2 rounded-xl bg-slate-900/90 text-white hover:bg-emerald-500 hover:text-slate-950 shadow-lg transition"
                      title="Lihat Detail Halaman"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      className="p-2 rounded-xl bg-slate-900/90 text-white hover:bg-emerald-500 hover:text-slate-950 shadow-lg transition"
                      title="Unduh PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleShare(doc, e)}
                      className="p-2 rounded-xl bg-slate-900/90 text-white hover:bg-emerald-500 hover:text-slate-950 shadow-lg transition"
                      title="Bagikan"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Information & Title */}
                <div className="p-3.5 flex flex-col gap-2">
                  {editingId === doc.id ? (
                    <form
                      onSubmit={(e) => handleSaveRename(doc.id, e)}
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg bg-slate-950 border border-emerald-500 text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg shadow"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 line-clamp-2 leading-snug">
                        {doc.title}
                      </h4>
                      <button
                        onClick={(e) => handleStartRename(doc, e)}
                        className="p-1 rounded text-slate-500 hover:text-slate-200 transition flex-shrink-0"
                        title="Ganti Nama"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>

                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View Mode */
          <div className="flex flex-col gap-2 max-w-5xl mx-auto">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setPreviewDoc(doc)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-14 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {doc.thumbnailUrl ? (
                      <img
                        src={doc.thumbnailUrl}
                        alt={doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col">
                    {editingId === doc.id ? (
                      <form
                        onSubmit={(e) => handleSaveRename(doc.id, e)}
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="px-2 py-1 text-xs rounded bg-slate-950 border border-emerald-500 text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-emerald-500 text-slate-950 text-xs font-bold rounded"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                        >
                          Batal
                        </button>
                      </form>
                    ) : (
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                        {doc.title}
                      </h4>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span>•</span>
                      <span>{doc.pageCount} Halaman</span>
                      {doc.pdfSizeKb ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">{formatFileSize(doc.pdfSizeKb)}</span>
                        </>
                      ) : null}
                      {doc.deviceSource && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Smartphone className="w-2.5 h-2.5 text-slate-500" />
                            {doc.deviceSource}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => handleDownload(doc, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                    title="Unduh PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleShare(doc, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                    title="Bagikan"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleStartRename(doc, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Ganti Nama"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Document Detail / Page Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{previewDoc.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{previewDoc.pageCount} Halaman</span>
                    <span>•</span>
                    <span className="text-emerald-400">
                      {formatFileSize(previewDoc.pdfSizeKb || 0)}
                    </span>
                    {previewDoc.deviceSource && (
                      <>
                        <span>•</span>
                        <span>{previewDoc.deviceSource}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Pages Gallery */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Daftar Halaman Dokumen ({previewDoc.pages?.length || previewDoc.pageCount})
                </span>
                <span>Klik thumbnail untuk melihat halaman penuh</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewDoc.pages && previewDoc.pages.length > 0 ? (
                  previewDoc.pages.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex flex-col rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow"
                    >
                      <div className="aspect-[3/4] p-2 flex items-center justify-center bg-black/60">
                        <img
                          src={p.thumbnailUrl || p.processedDataUrl || previewDoc.thumbnailUrl}
                          alt={`Halaman ${idx + 1}`}
                          className="max-w-full max-h-full object-contain rounded"
                        />
                      </div>
                      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-center text-[11px] font-bold text-slate-300">
                        Halaman {idx + 1}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800">
                    <img
                      src={previewDoc.thumbnailUrl}
                      alt={previewDoc.title}
                      className="max-h-72 object-contain rounded-lg shadow-lg mb-3"
                    />
                    <span className="text-xs text-slate-400">Preview Berkas PDF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const docToEdit = previewDoc;
                  setPreviewDoc(null);
                  onOpenDocumentForEditing(docToEdit);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Buka & Tambah Halaman</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleShare(previewDoc, e)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Bagikan</span>
                </button>

                <button
                  onClick={(e) => handleDownload(previewDoc, e)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/25 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
