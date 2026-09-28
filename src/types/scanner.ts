export interface Point {
  x: number;
  y: number;
}

export interface Quad {
  tl: Point; // Top-Left
  tr: Point; // Top-Right
  br: Point; // Bottom-Right
  bl: Point; // Bottom-Left
}

export type FilterType = 'original' | 'magic' | 'grayscale' | 'bw';

export interface PageItem {
  id: string;
  originalDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  cropQuad: Quad;
  filter: FilterType;
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  rotation: number; // 0, 90, 180, 270
  processedDataUrl: string;
  thumbnailUrl: string;
  ocrText?: string;
  detectedType?: string;
}

export interface ScannedDocument {
  id: string;
  title: string;
  pageCount: number;
  thumbnailUrl: string;
  createdAt: string;
  pdfSizeKb?: number;
  pdfBase64?: string;
  deviceSource?: string;
  category?: string;
  pages: PageItem[];
}

export type PaperSize = 'a4' | 'letter' | 'auto';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type CompressionQuality = 'high' | 'medium' | 'low';

export interface PdfExportOptions {
  fileName: string;
  pageSize: PaperSize;
  orientation: PageOrientation;
  quality: CompressionQuality;
  includeTimestampFooter: boolean;
}
