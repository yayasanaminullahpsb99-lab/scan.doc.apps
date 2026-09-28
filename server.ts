import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { ALL_LEVELS, TIERS } from './src/data/levels.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// GET /api/levels - Retrieve 100 Steps of Logic puzzle database
app.get('/api/levels', (req, res) => {
  const { tier } = req.query;
  if (tier && typeof tier === 'string') {
    const filtered = ALL_LEVELS.filter((l) => l.tier === tier);
    return res.json({ success: true, count: filtered.length, levels: filtered, tiers: TIERS });
  }
  res.json({
    success: true,
    count: ALL_LEVELS.length,
    tiers: TIERS,
    levels: ALL_LEVELS
  });
});

// GET /api/levels/:id - Retrieve specific level
app.get('/api/levels/:id', (req, res) => {
  const levelId = parseInt(req.params.id, 10);
  const level = ALL_LEVELS.find((l) => l.id === levelId);
  if (!level) {
    return res.status(404).json({ success: false, error: 'Level not found' });
  }
  res.json({ success: true, level });
});

// Persistent storage file path for documents
const DATA_DIR = path.resolve(__dirname, 'data');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'documents.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory document cache synchronized with file
interface StoredDocument {
  id: string;
  title: string;
  pageCount: number;
  thumbnailUrl: string;
  createdAt: string;
  pdfSizeKb?: number;
  pdfBase64?: string;
  deviceSource?: string;
  category?: string;
  pages?: any[];
}

function loadDocumentsFromFile(): StoredDocument[] {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const data = fs.readFileSync(DOCUMENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading documents from file:', err);
  }
  return [];
}

function saveDocumentsToFile(docs: StoredDocument[]) {
  try {
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing documents to file:', err);
  }
}

let documentsStore: StoredDocument[] = loadDocumentsFromFile();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    totalDocs: documentsStore.length
  });
});

// GET /api/documents - Get all synced documents across devices
app.get('/api/documents', (req, res) => {
  try {
    // Reload from file to ensure multiple server instances / workers stay in sync
    documentsStore = loadDocumentsFromFile();
    res.json({
      success: true,
      documents: documentsStore,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/:id - Get specific document
app.get('/api/documents/:id', (req, res) => {
  const doc = documentsStore.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  res.json({ success: true, document: doc });
});

// POST /api/documents - Save/Upload a scanned document to cross-device storage
app.post('/api/documents', (req, res) => {
  try {
    const newDoc: StoredDocument = req.body;
    if (!newDoc || !newDoc.id || !newDoc.title) {
      return res.status(400).json({ success: false, error: 'Invalid document payload' });
    }

    // Refresh existing list
    documentsStore = loadDocumentsFromFile();

    // Check if doc exists; update if so, else prepend
    const existingIndex = documentsStore.findIndex((d) => d.id === newDoc.id);
    if (existingIndex >= 0) {
      documentsStore[existingIndex] = { ...documentsStore[existingIndex], ...newDoc };
    } else {
      documentsStore.unshift(newDoc);
    }

    // Retain up to 100 documents
    if (documentsStore.length > 100) {
      documentsStore = documentsStore.slice(0, 100);
    }

    saveDocumentsToFile(documentsStore);

    res.json({
      success: true,
      document: newDoc,
      message: 'Dokumen berhasil disinkronkan ke server untuk semua perangkat'
    });
  } catch (err: any) {
    console.error('Error saving document:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/documents/:id - Rename / update document
app.put('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, category } = req.body;

    documentsStore = loadDocumentsFromFile();
    const index = documentsStore.findIndex((d) => d.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (title) {
      documentsStore[index].title = title.endsWith('.pdf') ? title : `${title}.pdf`;
    }
    if (category) {
      documentsStore[index].category = category;
    }

    saveDocumentsToFile(documentsStore);

    res.json({ success: true, document: documentsStore[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/documents/:id - Delete document across all devices
app.delete('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    documentsStore = loadDocumentsFromFile();
    documentsStore = documentsStore.filter((d) => d.id !== id);
    saveDocumentsToFile(documentsStore);

    res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Gemini OCR and Document Title Recommendation endpoint
app.post('/api/ocr-analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'No GEMINI_API_KEY configured on server, using fallback name generator',
        suggestedTitles: [],
        extractedText: ''
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const ai = new GoogleGenAI();

    const prompt = `Analyze this scanned document image.
1. Extract the main title or header at the top of the document (e.g., "INVOICE #1029", "KUITANSI PEMBAYARAN", "SURAT PERJANJIAN", "CERTIFICATE OF APPRECIATION", "RECEIPT").
2. Propose 3 clean, safe file name recommendations suitable for saving as a PDF file (use underscores, no spaces, no special characters like /\\:*?"<>|), e.g. "Invoice_PT_Maju_1029", "Kuitansi_Pembayaran_Maret", "Scan_Sertifikat_2026".
3. Extract the top 3-5 lines of text or key document fields (Type, Date, Reference/Doc Number, Sender/Recipient).

Return ONLY valid JSON matching this schema:
{
  "documentType": "string (e.g. Invoice, Receipt, Letter, ID, Certificate, Form, Note)",
  "detectedTitle": "string",
  "suggestedFileNames": ["string", "string", "string"],
  "extractedSummary": "string",
  "topText": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {
        detectedTitle: 'Document',
        suggestedFileNames: ['Scan_Document_' + Date.now()],
        extractedSummary: text.substring(0, 150)
      };
    }

    return res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    console.error('OCR Error:', err);
    return res.status(200).json({
      success: false,
      error: err.message || 'Failed to process document with OCR',
      suggestedFileNames: []
    });
  }
});

// Mock / Simulated Google Drive Backup endpoint
app.post('/api/drive-backup', async (req, res) => {
  try {
    const { fileName, fileSize, folderName = 'DocScan Uploads' } = req.body;
    await new Promise((resolve) => setTimeout(resolve, 1200));

    res.json({
      success: true,
      fileId: 'gdrive_' + Math.random().toString(36).substring(2, 10),
      fileName,
      folderName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      webLink: `https://drive.google.com/file/d/mock_${Date.now()}/view`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`scandocapp Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
