import { ScannedDocument } from '../types/scanner';

const STORAGE_KEY = 'docscan_saved_documents_v1';
const SYNC_TIMESTAMP_KEY = 'docscan_last_sync_timestamp';

/**
 * Detects device platform for cross-device metadata badge
 */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac Desktop';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux Desktop';
  return 'Web Device';
}

/**
 * Generates default file name based on pattern [AppName]_[YYYYMMDD]_[HHMMSS]
 * Example: Scan_20260928_153022.pdf
 */
export function generateDefaultFileName(prefix = 'Scan'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');

  return `${prefix}_${year}${month}${day}_${hours}${mins}${secs}.pdf`;
}

/**
 * Formats bytes into human-readable string (KB, MB)
 */
export function formatFileSize(kb: number): string {
  if (!kb) return '0 KB';
  if (kb < 1024) {
    return `${kb} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Retrieves all locally cached documents
 */
export function getSavedDocuments(): ScannedDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as ScannedDocument[];
  } catch (err) {
    console.error('Failed to get saved documents from localStorage:', err);
    return [];
  }
}

/**
 * Saves a document to local persistent storage (cache)
 */
export function saveDocumentToLocalStorage(doc: ScannedDocument): void {
  try {
    const list = getSavedDocuments();
    const filtered = list.filter((item) => item.id !== doc.id);
    const updated = [doc, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning, trimming payload:', err);
    try {
      const list = getSavedDocuments().slice(0, 10);
      const cleaned = list.map((item) => ({ ...item, pdfBase64: undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([doc, ...cleaned]));
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch documents from the server API, enabling cross-device sync.
 * Merges server documents with any pending local documents.
 */
export async function fetchDocumentsCrossDevice(): Promise<ScannedDocument[]> {
  const localDocs = getSavedDocuments();

  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.documents)) {
      const serverDocs: ScannedDocument[] = data.documents;

      // Merge: create a map keyed by id
      const map = new Map<string, ScannedDocument>();
      // First put server docs
      serverDocs.forEach((d) => map.set(d.id, d));

      // If any local doc is not on server yet, upload it in background
      for (const loc of localDocs) {
        if (!map.has(loc.id)) {
          map.set(loc.id, loc);
          // Push to server
          saveDocumentToServer(loc).catch((e) => console.warn('Background sync failed:', e));
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Update local storage cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 30)));
        localStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
      } catch (e) {
        console.warn('Could not cache merged docs to localStorage:', e);
      }

      return merged;
    }
  } catch (err) {
    console.warn('Network or server error during document sync, using local cache:', err);
  }

  return localDocs;
}

/**
 * Saves a document to server for cross-device visibility
 */
async function saveDocumentToServer(doc: ScannedDocument): Promise<boolean> {
  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    const result = await res.json();
    return Boolean(result.success);
  } catch (err) {
    console.warn('Failed to save document to server:', err);
    return false;
  }
}

/**
 * Primary save function: saves locally AND broadcasts to server for all devices
 */
export async function saveDocumentCrossDevice(doc: ScannedDocument): Promise<void> {
  // Attach current device metadata if missing
  if (!doc.deviceSource) {
    doc.deviceSource = getDeviceName();
  }

  // 1. Instant local persistence
  saveDocumentToLocalStorage(doc);

  // 2. Synchronize to server API
  await saveDocumentToServer(doc);
}

/**
 * Deletes a document both locally and on server
 */
export async function deleteDocumentCrossDevice(id: string): Promise<void> {
  // 1. Delete locally
  try {
    const list = getSavedDocuments().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Delete local error:', err);
  }

  // 2. Delete on server
  try {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Delete server error:', err);
  }
}

/**
 * Renames a document both locally and on server
 */
export async function renameDocumentCrossDevice(id: string, newTitle: string): Promise<void> {
  const safeTitle = newTitle.endsWith('.pdf') ? newTitle : `${newTitle}.pdf`;

  // 1. Rename locally
  try {
    const list = getSavedDocuments().map((d) => {
      if (d.id === id) {
        return { ...d, title: safeTitle };
      }
      return d;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Rename local error:', err);
  }

  // 2. Rename on server
  try {
    await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: safeTitle }),
    });
  } catch (err) {
    console.warn('Rename server error:', err);
  }
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(SYNC_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

export const deleteDocumentFromStorage = deleteDocumentCrossDevice;
export const renameDocumentInStorage = renameDocumentCrossDevice;
export const saveDocumentToStorage = saveDocumentCrossDevice;

