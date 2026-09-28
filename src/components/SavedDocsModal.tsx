import React, { useState, useEffect } from 'react';
import { ScannedDocument } from '../types/scanner';
import {
  getSavedDocuments,
  deleteDocumentFromStorage,
  renameDocumentInStorage,
  formatFileSize
} from '../utils/storage';
import {
  FolderOpen,
  Search,
  Download,
  Trash2,
  Edit2,
  FileText,
  Calendar,
  X,
  ExternalLink,
  Plus
} from 'lucide-react';

interface SavedDocsModalProps {
  onClose: () => void;
  onOpenDocument: (doc: ScannedDocument) => void;
  onStartNewScan: () => void;
}

export const SavedDocsModal: React.FC<SavedDocsModalProps> = ({
  onClose,
  onOpenDocument,
  onStartNewScan,
}) => {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const refreshList = () => {
    setDocuments(getSavedDocuments());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini dari penyimpanan lokal?')) {
      deleteDocumentFromStorage(id);
      refreshList();
    }
  };

  const handleStartRename = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditTitle(doc.title.replace(/\.pdf$/i, ''));
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      renameDocumentInStorage(id, editTitle.trim());
      setEditingId(null);
      refreshList();
    }
  };

  const handleDownloadSaved = (doc: ScannedDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc.pdfBase64) {
      const a = document.createElement('a');
      a.href = doc.pdfBase64;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Re-open in editor to export
      onOpenDocument(doc);
    }
  };

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dokumen Saya</h2>
              <span className="text-xs text-slate-400">{documents.length} Dokumen Tersimpan</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartNewScan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Scan Baru</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama file..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List of Documents */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-white mb-1">
                {searchQuery ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen tersimpan'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Dokumen hasil scan yang Anda unduh atau simpan akan otomatis muncul di sini.
              </p>
              <button
                onClick={onStartNewScan}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                Mulai Pindai Sekarang
              </button>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-850 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-14 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                          className="px-2 py-1 text-xs rounded bg-slate-900 border border-emerald-500 text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-[10px] rounded"
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
                          year: 'numeric',
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
                    </div>
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => handleStartRename(doc, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
                    title="Ubah Nama File"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDownloadSaved(doc, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 transition"
                    title="Download File PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
