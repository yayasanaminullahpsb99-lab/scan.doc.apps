import React, { useState } from 'react';
import { Cloud, CheckCircle, ExternalLink, X, Folder, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../utils/storage';

interface DriveBackupModalProps {
  fileName: string;
  fileSizeKb: number;
  base64Pdf: string;
  onClose: () => void;
}

export const DriveBackupModal: React.FC<DriveBackupModalProps> = ({
  fileName,
  fileSizeKb,
  base64Pdf,
  onClose,
}) => {
  const [folderName, setFolderName] = useState('DocScan Uploads');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [driveResult, setDriveResult] = useState<{
    fileId: string;
    webLink: string;
    uploadedAt: string;
  } | null>(null);

  const userEmail = 'yayasan.aminullah.psb99@gmail.com';

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/drive-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileSize: fileSizeKb,
          folderName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDriveResult({
          fileId: data.fileId,
          webLink: data.webLink,
          uploadedAt: data.uploadedAt,
        });
        setUploadSuccess(true);
      }
    } catch (err) {
      console.error('Drive backup error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cadangkan ke Google Drive</h3>
              <p className="text-xs text-slate-400">Penyimpanan cloud aman & tersinkronisasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!uploadSuccess ? (
          <div className="flex flex-col gap-4">
            {/* Account Info Pill */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-medium">Akun Terhubung:</span>
              </div>
              <span className="font-mono text-emerald-400 font-semibold truncate max-w-[200px]">
                {userEmail}
              </span>
            </div>

            {/* Target Document Details */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Nama File :</span>
                <span className="font-bold text-white truncate max-w-[220px]">{fileName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Ukuran PDF :</span>
                <span className="text-emerald-400 font-semibold">{formatFileSize(fileSizeKb)}</span>
              </div>
            </div>

            {/* Folder selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>Folder Tujuan di Drive:</span>
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="DocScan Uploads"
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition disabled:opacity-50 mt-1"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengunggah ke Drive...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Mulai Unggah ke Google Drive</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white mb-1">Berhasil Dicadangkan!</h4>
              <p className="text-xs text-slate-400">
                File <span className="text-emerald-300 font-semibold">{fileName}</span> tersimpan di folder{' '}
                <span className="text-blue-300 font-semibold">{folderName}</span> di akun Google Drive Anda.
              </p>
            </div>

            <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1 text-left mt-2">
              <span className="text-slate-400">ID File: {driveResult?.fileId}</span>
              <span className="text-slate-400">
                Waktu: {new Date(driveResult?.uploadedAt || '').toLocaleTimeString('id-ID')}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Selesai
              </button>
              <a
                href={driveResult?.webLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                <span>Buka di Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
