import { Point, Quad, FilterType } from '../types/scanner';

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes Quad so points are within [0, width] and [0, height]
 */
export function clampQuad(quad: Quad, width: number, height: number): Quad {
  const clamp = (val: number, max: number) => Math.max(0, Math.min(val, max));
  return {
    tl: { x: clamp(quad.tl.x, width), y: clamp(quad.tl.y, height) },
    tr: { x: clamp(quad.tr.x, width), y: clamp(quad.tr.y, height) },
    br: { x: clamp(quad.br.x, width), y: clamp(quad.br.y, height) },
    bl: { x: clamp(quad.bl.x, width), y: clamp(quad.bl.y, height) },
  };
}

/**
 * Returns a fallback default quadrilateral inset from margins (e.g. 8%)
 */
export function getDefaultQuad(width: number, height: number, insetRatio = 0.08): Quad {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;
  return {
    tl: { x: insetX, y: insetY },
    tr: { x: width - insetX, y: insetY },
    br: { x: width - insetX, y: height - insetY },
    bl: { x: insetX, y: height - insetY },
  };
}

/**
 * Real-time fast edge & contour detection for documents
 * Analyzes video frame or canvas to detect the 4 corners of a rectangular document.
 */
export function detectDocumentCorners(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number
): Quad {
  try {
    // 1. Downscale to a small analysis canvas (max 240px) for super fast 60fps real-time detection
    const maxDim = 240;
    const scale = Math.min(maxDim / sourceWidth, maxDim / sourceHeight, 1.0);
    const sw = Math.round(sourceWidth * scale);
    const sh = Math.round(sourceHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return getDefaultQuad(sourceWidth, sourceHeight);

    ctx.drawImage(source, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // 2. Convert to Grayscale & compute Sobel edge gradients
    const gray = new Uint8Array(sw * sh);
    for (let i = 0; i < data.length; i += 4) {
      // Perceptual luminance
      gray[i >> 2] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }

    const edges = new Uint8Array(sw * sh);
    let edgeThreshold = 35;
    let edgeCount = 0;

    // Sobel operator (3x3 kernel)
    for (let y = 1; y < sh - 1; y++) {
      const yOffset = y * sw;
      for (let x = 1; x < sw - 1; x++) {
        const idx = yOffset + x;
        // Horizontal gradient Gx
        const gx =
          -gray[idx - sw - 1] + gray[idx - sw + 1] +
          -2 * gray[idx - 1] + 2 * gray[idx + 1] +
          -gray[idx + sw - 1] + gray[idx + sw + 1];

        // Vertical gradient Gy
        const gy =
          -gray[idx - sw - 1] - 2 * gray[idx - sw] - gray[idx - sw + 1] +
          gray[idx + sw - 1] + 2 * gray[idx + sw] + gray[idx + sw + 1];

        const mag = Math.abs(gx) + Math.abs(gy);
        if (mag > edgeThreshold) {
          edges[idx] = 255;
          edgeCount++;
        }
      }
    }

    // 3. Find Candidate Corners in the four quadrants
    // If not enough strong edges are found, fallback gracefully
    if (edgeCount < (sw * sh) * 0.015) {
      return getDefaultQuad(sourceWidth, sourceHeight);
    }

    const midX = sw / 2;
    const midY = sh / 2;

    // We look for extreme points in 4 quadrants minimizing / maximizing projection:
    // Top-Left: minimizes (x + y)
    // Top-Right: maximizes (x - y) -> minimizes (-x + y)
    // Bottom-Right: maximizes (x + y)
    // Bottom-Left: maximizes (-x + y) -> minimizes (x - y)
    let bestTl = { x: sw * 0.12, y: sh * 0.12, score: Infinity };
    let bestTr = { x: sw * 0.88, y: sh * 0.12, score: -Infinity };
    let bestBr = { x: sw * 0.88, y: sh * 0.88, score: -Infinity };
    let bestBl = { x: sw * 0.12, y: sh * 0.88, score: Infinity };

    // Ignore margins (first 4% and last 4%) to avoid camera border artefacts
    const borderX = Math.round(sw * 0.04);
    const borderY = Math.round(sh * 0.04);

    for (let y = borderY; y < sh - borderY; y++) {
      const yOffset = y * sw;
      for (let x = borderX; x < sw - borderX; x++) {
        if (edges[yOffset + x] === 255) {
          // Weight edges closer to expected aspect and away from extreme noise
          const distToCenter = Math.hypot(x - midX, y - midY);
          if (distToCenter < sw * 0.15) continue; // Skip document center content

          // Quadrant 1: Top-Left (x < midX, y < midY)
          if (x < midX && y < midY) {
            const score = x + y;
            if (score < bestTl.score) {
              bestTl = { x, y, score };
            }
          }
          // Quadrant 2: Top-Right (x >= midX, y < midY)
          else if (x >= midX && y < midY) {
            const score = x - y;
            if (score > bestTr.score) {
              bestTr = { x, y, score };
            }
          }
          // Quadrant 3: Bottom-Right (x >= midX, y >= midY)
          else if (x >= midX && y >= midY) {
            const score = x + y;
            if (score > bestBr.score) {
              bestBr = { x, y, score };
            }
          }
          // Quadrant 4: Bottom-Left (x < midX, y >= midY)
          else if (x < midX && y >= midY) {
            const score = x - y;
            if (score < bestBl.score) {
              bestBl = { x, y, score };
            }
          }
        }
      }
    }

    // Scale back up to original image resolution
    const invScale = 1 / scale;
    const detectedQuad: Quad = {
      tl: { x: bestTl.x * invScale, y: bestTl.y * invScale },
      tr: { x: bestTr.x * invScale, y: bestTr.y * invScale },
      br: { x: bestBr.x * invScale, y: bestBr.y * invScale },
      bl: { x: bestBl.x * invScale, y: bestBl.y * invScale },
    };

    // Sanity check: Ensure quad forms a reasonably convex shape of adequate size
    const topW = distance(detectedQuad.tl, detectedQuad.tr);
    const botW = distance(detectedQuad.bl, detectedQuad.br);
    const leftH = distance(detectedQuad.tl, detectedQuad.bl);
    const rightH = distance(detectedQuad.tr, detectedQuad.br);

    const minW = sourceWidth * 0.35;
    const minH = sourceHeight * 0.35;

    if (topW < minW || botW < minW || leftH < minH || rightH < minH) {
      return getDefaultQuad(sourceWidth, sourceHeight);
    }

    return clampQuad(detectedQuad, sourceWidth, sourceHeight);
  } catch (err) {
    console.error('Error in detectDocumentCorners:', err);
    return getDefaultQuad(sourceWidth, sourceHeight);
  }
}

/**
 * Solves 3x3 Homography Matrix mapping 4 points from source to destination
 */
function getHomography(src: Point[], dst: Point[]): number[] | null {
  // src and dst have 4 points: [tl, tr, br, bl]
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Solve 8x8 linear system a * h = b using Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
        maxRow = k;
      }
    }
    const tmpA = a[i];
    a[i] = a[maxRow];
    a[maxRow] = tmpA;
    const tmpB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tmpB;

    if (Math.abs(a[i][i]) < 1e-12) return null;

    for (let k = i + 1; k < n; k++) {
      const c = a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        a[k][j] -= c * a[i][j];
      }
      b[k] -= c * b[i];
    }
  }

  const h = new Array(9);
  h[8] = 1;
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= a[i][j] * h[j];
    }
    h[i] = sum / a[i][i];
  }

  return h;
}

/**
 * Inverts a 3x3 matrix
 */
function invert3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  return [
    A * invDet,
    -(b * i - c * h) * invDet,
    (b * f - c * e) * invDet,
    B * invDet,
    (a * i - c * g) * invDet,
    -(a * f - c * d) * invDet,
    C * invDet,
    -(a * h - b * g) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * High-performance Perspective Warp (Homography Flattening)
 * Warps any skewed document quad into a perfectly flat rectangular canvas.
 */
export async function warpPerspective(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  quad: Quad
): Promise<HTMLCanvasElement> {
  const topW = distance(quad.tl, quad.tr);
  const botW = distance(quad.bl, quad.br);
  const leftH = distance(quad.tl, quad.bl);
  const rightH = distance(quad.tr, quad.br);

  // Determine target document dimensions based on max side lengths
  let destWidth = Math.round(Math.max(topW, botW));
  let destHeight = Math.round(Math.max(leftH, rightH));

  // Limit max dimension to 2400px to maintain memory efficiency and ultra-crisp output
  const maxOutputDim = 2400;
  if (destWidth > maxOutputDim || destHeight > maxOutputDim) {
    const scale = Math.min(maxOutputDim / destWidth, maxOutputDim / destHeight);
    destWidth = Math.round(destWidth * scale);
    destHeight = Math.round(destHeight * scale);
  }

  // Ensure minimum dimensions
  destWidth = Math.max(100, destWidth);
  destHeight = Math.max(100, destHeight);

  // Create temporary canvas of source image to extract pixel buffer
  const srcWidth = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width;
  const srcHeight = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not get 2d context for source');
  srcCtx.drawImage(sourceImage, 0, 0);

  const srcImgData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcData = srcImgData.data;

  // Create destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = destWidth;
  dstCanvas.height = destHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not get 2d context for destination');

  const dstImgData = dstCtx.createImageData(destWidth, destHeight);
  const dstData = dstImgData.data;

  // Source Quad and Destination Rect
  const srcQuad = [quad.tl, quad.tr, quad.br, quad.bl];
  const dstQuad = [
    { x: 0, y: 0 },
    { x: destWidth, y: 0 },
    { x: destWidth, y: destHeight },
    { x: 0, y: destHeight },
  ];

  // We need inverse homography: mapping from destination coordinate (dx, dy) back to source (sx, sy)
  const forwardH = getHomography(srcQuad, dstQuad);
  if (!forwardH) {
    // Fallback: draw directly if homography fails
    dstCtx.drawImage(sourceImage, 0, 0, destWidth, destHeight);
    return dstCanvas;
  }

  const invH = invert3x3(forwardH);
  if (!invH) {
    dstCtx.drawImage(sourceImage, 0, 0, destWidth, destHeight);
    return dstCanvas;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = invH;

  // Pixel mapping with bilinear interpolation for crystal clear text
  let dstIdx = 0;
  for (let dy = 0; dy < destHeight; dy++) {
    for (let dx = 0; dx < destWidth; dx++) {
      // Perspective projection: [sx, sy, w] = H * [dx, dy, 1]
      const w = h6 * dx + h7 * dy + h8;
      const sx = (h0 * dx + h1 * dy + h2) / w;
      const sy = (h3 * dx + h4 * dy + h5) / w;

      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const i00 = (y0 * srcWidth + x0) << 2;
        const i10 = (y0 * srcWidth + x1) << 2;
        const i01 = (y1 * srcWidth + x0) << 2;
        const i11 = (y1 * srcWidth + x1) << 2;

        dstData[dstIdx] = Math.round(
          srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11
        );
        dstData[dstIdx + 1] = Math.round(
          srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11
        );
        dstData[dstIdx + 2] = Math.round(
          srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11
        );
        dstData[dstIdx + 3] = 255;
      } else {
        // Outside bounds: clean white background
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }

      dstIdx += 4;
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}

/**
 * Applies Image Filters: Magic Color, Grayscale, B&W (Adaptive Thresholding)
 * Also applies brightness (-50..50) and contrast (-50..50).
 */
export function applyFilter(
  sourceCanvas: HTMLCanvasElement,
  filter: FilterType,
  brightness = 0,
  contrast = 0,
  rotation = 0
): HTMLCanvasElement {
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const outWidth = isRotated90or270 ? sourceCanvas.height : sourceCanvas.width;
  const outHeight = isRotated90or270 ? sourceCanvas.width : sourceCanvas.height;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = outWidth;
  resultCanvas.height = outHeight;
  const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  // Handle rotation first
  ctx.save();
  ctx.translate(outWidth / 2, outHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  ctx.restore();

  if (filter === 'original' && brightness === 0 && contrast === 0) {
    return resultCanvas;
  }

  const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
  const data = imgData.data;
  const len = data.length;

  // Contrast factor calculation
  // contrast in [-50, 50]
  const cFactor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
  const bVal = brightness * 1.5;

  if (filter === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      // 0.299 R + 0.587 G + 0.114 B
      let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Apply contrast & brightness
      gray = cFactor * (gray - 128) + 128 + bVal;
      const v = Math.min(255, Math.max(0, Math.round(gray)));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
  } else if (filter === 'magic') {
    // Magic Color CamScanner style:
    // 1. Dynamic histogram stretch / shadow attenuation
    // 2. Saturation boost & text sharpening
    let minL = 255, maxL = 0;
    for (let i = 0; i < len; i += 16) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;
    }
    const range = Math.max(30, maxL - minL);

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Stretch contrast
      r = ((r - minL) / range) * 255;
      g = ((g - minL) / range) * 255;
      b = ((b - minL) / range) * 255;

      // Shadow lightening: boost mid-tones and dark background to pure white while preserving dark text
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 95) {
        // Boost light paper areas towards white
        const boost = (lum - 95) * 0.45;
        r += boost;
        g += boost;
        b += boost;
      } else {
        // Deepen text
        r *= 0.88;
        g *= 0.88;
        b *= 0.88;
      }

      // Saturation enhance (1.18x)
      const avg = (r + g + b) / 3;
      r = avg + (r - avg) * 1.18;
      g = avg + (g - avg) * 1.18;
      b = avg + (b - avg) * 1.18;

      // Contrast & Brightness adjustment
      r = cFactor * (r - 128) + 128 + bVal + 10;
      g = cFactor * (g - 128) + 128 + bVal + 10;
      b = cFactor * (b - 128) + 128 + bVal + 10;

      data[i] = Math.min(255, Math.max(0, Math.round(r)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }
  } else if (filter === 'bw') {
    // High-contrast clean Black & White (Sauvola / Adaptive local thresholding)
    // Uses integral image for fast local average thresholding
    const w = outWidth;
    const h = outHeight;
    const gray = new Uint8Array(w * h);

    for (let i = 0, p = 0; i < len; i += 4, p++) {
      gray[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Integral image
    const integral = new Float64Array(w * h);
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      const yOffset = y * w;
      for (let x = 0; x < w; x++) {
        rowSum += gray[yOffset + x];
        integral[yOffset + x] = (y > 0 ? integral[(y - 1) * w + x] : 0) + rowSum;
      }
    }

    // Adaptive window radius (around 12-20px)
    const radius = Math.max(8, Math.round(Math.min(w, h) * 0.025));
    const k = 0.88 + (contrast / 200); // threshold factor

    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h - 1, y + radius);
      const yOffset = y * w;

      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - radius);
        const x1 = Math.min(w - 1, x + radius);

        const count = (x1 - x0 + 1) * (y1 - y0 + 1);
        const a = integral[y1 * w + x1];
        const b = x0 > 0 ? integral[y1 * w + (x0 - 1)] : 0;
        const c = y0 > 0 ? integral[(y0 - 1) * w + x1] : 0;
        const d = x0 > 0 && y0 > 0 ? integral[(y0 - 1) * w + (x0 - 1)] : 0;
        const sum = a - b - c + d;
        const localMean = sum / count;

        const pIdx = yOffset + x;
        const dIdx = pIdx << 2;
        const val = gray[pIdx] < (localMean * k + bVal) ? 0 : 255;

        data[dIdx] = val;
        data[dIdx + 1] = val;
        data[dIdx + 2] = val;
      }
    }
  } else {
    // Original with brightness & contrast
    for (let i = 0; i < len; i += 4) {
      data[i] = Math.min(255, Math.max(0, Math.round(cFactor * (data[i] - 128) + 128 + bVal)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(cFactor * (data[i + 1] - 128) + 128 + bVal)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(cFactor * (data[i + 2] - 128) + 128 + bVal)));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return resultCanvas;
}

/**
 * Helper to generate small thumbnail DataURL for fast previews
 */
export function generateThumbnail(canvas: HTMLCanvasElement, maxDim = 180): string {
  const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1.0);
  const tw = Math.round(canvas.width * scale);
  const th = Math.round(canvas.height * scale);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const ctx = thumbCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, tw, th);
    return thumbCanvas.toDataURL('image/jpeg', 0.7);
  }
  return canvas.toDataURL('image/jpeg', 0.5);
}
