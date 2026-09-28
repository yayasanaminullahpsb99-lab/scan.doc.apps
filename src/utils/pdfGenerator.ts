import { jsPDF } from 'jspdf';
import { PageItem, PdfExportOptions } from '../types/scanner';

/**
 * Downscales an image DataURL if needed according to target quality
 */
async function compressImageForPdf(
  dataUrl: string,
  quality: 'high' | 'medium' | 'low'
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let maxDim = 2200;
      let encoderQuality = 0.92;

      if (quality === 'medium') {
        maxDim = 1600;
        encoderQuality = 0.75;
      } else if (quality === 'low') {
        maxDim = 1100;
        encoderQuality = 0.55;
      }

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w > maxDim || h > maxDim) {
        const scale = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const compressed = canvas.toDataURL('image/jpeg', encoderQuality);
      resolve({ dataUrl: compressed, width: w, height: h });
    };
    img.onerror = () => {
      resolve({ dataUrl, width: 800, height: 1100 });
    };
    img.src = dataUrl;
  });
}

/**
 * Builds a multi-page PDF document using jsPDF
 */
export async function generatePdf(
  pages: PageItem[],
  options: PdfExportOptions
): Promise<{ blob: Blob; blobUrl: string; sizeKb: number; base64: string }> {
  if (pages.length === 0) {
    throw new Error('Tidak ada halaman untuk dibuat PDF');
  }

  // Pre-process all pages (compress according to settings)
  const processedImages = await Promise.all(
    pages.map((p) => compressImageForPdf(p.processedDataUrl || p.originalDataUrl, options.quality))
  );

  let doc: jsPDF | null = null;

  for (let i = 0; i < processedImages.length; i++) {
    const item = processedImages[i];
    const isImageLandscape = item.width > item.height;

    // Determine orientation
    let pageOrientation: 'p' | 'l' = 'p';
    if (options.orientation === 'landscape') {
      pageOrientation = 'l';
    } else if (options.orientation === 'portrait') {
      pageOrientation = 'p';
    } else {
      // Auto: match image aspect
      pageOrientation = isImageLandscape ? 'l' : 'p';
    }

    // Determine format
    let pdfFormat: string | [number, number] = 'a4';
    if (options.pageSize === 'letter') {
      pdfFormat = 'letter';
    } else if (options.pageSize === 'auto') {
      // Auto: Exact aspect ratio of image in mm (e.g. 210mm width, dynamic height)
      const baseMm = 210;
      const hMm = Math.round((baseMm * item.height) / item.width);
      pdfFormat = [baseMm, hMm];
      pageOrientation = 'p';
    }

    if (i === 0) {
      doc = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: pdfFormat,
        compress: true,
      });
    } else {
      doc!.addPage(pdfFormat, pageOrientation);
    }

    const pageWidth = doc!.internal.pageSize.getWidth();
    const pageHeight = doc!.internal.pageSize.getHeight();

    // Calculate margins & fitting
    let margin = 0;
    if (options.pageSize !== 'auto') {
      margin = 6; // subtle 6mm margin
    }

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const imgAspect = item.width / item.height;
    const availAspect = availableWidth / availableHeight;

    let renderW = availableWidth;
    let renderH = availableHeight;
    let renderX = margin;
    let renderY = margin;

    if (imgAspect > availAspect) {
      // Image is wider than available space
      renderW = availableWidth;
      renderH = availableWidth / imgAspect;
      renderY = margin + (availableHeight - renderH) / 2;
    } else {
      // Image is taller
      renderH = availableHeight;
      renderW = availableHeight * imgAspect;
      renderX = margin + (availableWidth - renderW) / 2;
    }

    doc!.addImage(item.dataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');

    if (options.includeTimestampFooter && options.pageSize !== 'auto') {
      doc!.setFontSize(8);
      doc!.setTextColor(140, 140, 140);
      const footerText = `DocScan Pro | Halaman ${i + 1} dari ${pages.length} | ${new Date().toLocaleDateString('id-ID')}`;
      doc!.text(footerText, pageWidth / 2, pageHeight - 2.5, { align: 'center' });
    }
  }

  if (!doc) {
    throw new Error('Gagal menginisialisasi dokumen PDF');
  }

  // Set document metadata
  const docTitle = options.fileName.replace(/\.pdf$/i, '');
  doc.setProperties({
    title: docTitle,
    subject: 'Scanned with DocScan Pro',
    creator: 'DocScan Pro Mobile Web App',
    author: 'DocScan Pro User'
  });

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const sizeKb = Math.round(blob.size / 1024);
  const base64 = doc.output('datauristring');

  return { blob, blobUrl, sizeKb, base64 };
}
