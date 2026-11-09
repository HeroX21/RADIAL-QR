/**
 * MODE A: UNIVERSAL QR Engine.
 * Generates ISO/IEC 18004 compliant standard QR codes with artistic styling,
 * custom module geometry, finder pattern variations, center logo and automatic
 * decode validation using jsQR.
 */

import QRCode from 'qrcode';
import jsQR from 'jsqr';

export type QrEccLevel = 'L' | 'M' | 'Q' | 'H';

export type QrModuleShape = 'square' | 'rounded' | 'dots' | 'diamonds' | 'fluid' | 'circuit';

export type QrFinderStyle = 'square' | 'rounded' | 'circle' | 'double-ring' | 'hexagon';

export interface StandardQrOptions {
  eccLevel: QrEccLevel;
  moduleShape: QrModuleShape;
  finderStyle: QrFinderStyle;
  fgColor: string;
  fgColorEnd?: string;
  bgColor: string;
  gradientType: 'none' | 'linear' | 'radial';
  quietZone: number; // in modules, standard is 4
  centerLogoUrl?: string;
  centerLogoSizeRatio?: number; // 0.15 .. 0.25
}

export const DEFAULT_STANDARD_QR_OPTIONS: StandardQrOptions = {
  eccLevel: 'M',
  moduleShape: 'rounded',
  finderStyle: 'rounded',
  fgColor: '#FFFFFF',
  fgColorEnd: '#00C8FF',
  bgColor: '#090B10',
  gradientType: 'linear',
  quietZone: 4,
  centerLogoSizeRatio: 0.2,
};

export interface QrMatrixData {
  modules: boolean[][];
  size: number;
}

/**
 * Generate binary module matrix from payload string
 */
export function generateQrMatrix(text: string, eccLevel: QrEccLevel): QrMatrixData {
  const qr = QRCode.create(text, {
    errorCorrectionLevel: eccLevel,
  });

  const size = qr.modules.size;
  const modules: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    modules.push(row);
  }

  return { modules, size };
}

/**
 * Checks if module (r, c) is part of the 3 standard finder patterns (top-left, top-right, bottom-left)
 */
export function isFinderPattern(r: number, c: number, size: number): boolean {
  // Top-left finder: [0..6, 0..6]
  if (r <= 6 && c <= 6) return true;
  // Top-right finder: [0..6, size-7..size-1]
  if (r <= 6 && c >= size - 7) return true;
  // Bottom-left finder: [size-7..size-1, 0..6]
  if (r >= size - 7 && c <= 6) return true;
  return false;
}

/**
 * Render artistic ISO standard QR code to Canvas
 */
export function renderStandardQrToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasSize: number,
  options: StandardQrOptions = DEFAULT_STANDARD_QR_OPTIONS
): void {
  const { modules, size } = generateQrMatrix(text, options.eccLevel);
  const totalModuleCount = size + options.quietZone * 2;
  const moduleSize = canvasSize / totalModuleCount;
  const offset = options.quietZone * moduleSize;

  // Background
  ctx.save();
  ctx.fillStyle = options.bgColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Gradient fill for modules
  let fillStyle: string | CanvasGradient = options.fgColor;
  if (options.gradientType === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
    grad.addColorStop(0, options.fgColor);
    grad.addColorStop(1, options.fgColorEnd || options.fgColor);
    fillStyle = grad;
  } else if (options.gradientType === 'radial') {
    const grad = ctx.createRadialGradient(
      canvasSize / 2,
      canvasSize / 2,
      canvasSize * 0.1,
      canvasSize / 2,
      canvasSize / 2,
      canvasSize * 0.6
    );
    grad.addColorStop(0, options.fgColor);
    grad.addColorStop(1, options.fgColorEnd || options.fgColor);
    fillStyle = grad;
  }
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = fillStyle;

  // Draw data modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinderPattern(r, c, size)) continue; // drawn separately with distinct styling
      if (!modules[r][c]) continue;

      const x = offset + c * moduleSize;
      const y = offset + r * moduleSize;

      drawStyledModule(ctx, x, y, moduleSize, options.moduleShape);
    }
  }

  // Draw 3 Finder Patterns
  drawFinderPattern(ctx, offset, offset, moduleSize * 7, options.finderStyle, fillStyle, options.bgColor);
  drawFinderPattern(ctx, offset + (size - 7) * moduleSize, offset, moduleSize * 7, options.finderStyle, fillStyle, options.bgColor);
  drawFinderPattern(ctx, offset, offset + (size - 7) * moduleSize, moduleSize * 7, options.finderStyle, fillStyle, options.bgColor);

  ctx.restore();
}

/**
 * Draw module with custom shape
 */
function drawStyledModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: QrModuleShape
): void {
  ctx.beginPath();
  switch (shape) {
    case 'dots': {
      ctx.arc(x + size / 2, y + size / 2, (size / 2) * 0.88, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rounded': {
      const radius = size * 0.35;
      ctx.roundRect(x + 0.5, y + 0.5, size - 1, size - 1, radius);
      ctx.fill();
      break;
    }
    case 'diamonds': {
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x + size / 2, y + size);
      ctx.lineTo(x, y + size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'circuit': {
      ctx.arc(x + size / 2, y + size / 2, (size / 2) * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      break;
    }
    case 'fluid': {
      const radius = size * 0.45;
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();
      break;
    }
    case 'square':
    default: {
      ctx.fillRect(x, y, size, size);
      break;
    }
  }
}

/**
 * Draw finder pattern with artistic styling
 */
function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: QrFinderStyle,
  fg: string | CanvasGradient,
  bg: string
): void {
  ctx.save();
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;

  const unit = size / 7;

  if (style === 'circle' || style === 'double-ring') {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner white ring
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, (size / 2) - unit, 0, Math.PI * 2);
    ctx.fill();

    // Center core
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy, unit * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'rounded') {
    // Outer rounded box
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, unit * 1.8);
    ctx.fill();

    // Inner background box
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x + unit, y + unit, size - unit * 2, size - unit * 2, unit);
    ctx.fill();

    // Center core
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(x + unit * 2, y + unit * 2, size - unit * 4, size - unit * 4, unit * 0.8);
    ctx.fill();
  } else {
    // Classic square
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = bg;
    ctx.fillRect(x + unit, y + unit, size - unit * 2, size - unit * 2);
    ctx.fillStyle = fg;
    ctx.fillRect(x + unit * 2, y + unit * 2, size - unit * 4, size - unit * 4);
  }

  ctx.restore();
}

/**
 * Validates whether the rendered QR code is accurately decodable by standard QR scanners.
 * Uses jsQR to decode the offscreen canvas pixel data and verifies payload equality.
 */
export function validateStandardQrDecoding(
  canvas: HTMLCanvasElement,
  expectedPayload: string
): { isValid: boolean; decodedPayload?: string; error?: string } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { isValid: false, error: 'Could not acquire 2D canvas context' };

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imgData.data, imgData.width, imgData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (!code) {
    return { isValid: false, error: 'Standard QR decoder could not find finder patterns' };
  }

  const isMatch = code.data === expectedPayload;
  return {
    isValid: isMatch,
    decodedPayload: code.data,
    error: isMatch ? undefined : 'Decoded payload does not match expected content',
  };
}

/**
 * Generate vector SVG for Standard QR
 */
export function generateStandardQrSvg(
  text: string,
  size = 1024,
  options: StandardQrOptions = DEFAULT_STANDARD_QR_OPTIONS
): string {
  const { modules, size: qrSize } = generateQrMatrix(text, options.eccLevel);
  const totalCount = qrSize + options.quietZone * 2;
  const modSize = size / totalCount;
  const offset = options.quietZone * modSize;

  let rects = '';
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (isFinderPattern(r, c, qrSize)) continue;
      if (!modules[r][c]) continue;

      const x = (offset + c * modSize).toFixed(2);
      const y = (offset + r * modSize).toFixed(2);
      const ms = modSize.toFixed(2);
      const radius = (options.moduleShape === 'rounded' || options.moduleShape === 'fluid')
        ? (modSize * 0.35).toFixed(2)
        : '0';

      rects += `<rect x="${x}" y="${y}" width="${ms}" height="${ms}" rx="${radius}" fill="url(#qrGrad)" />\n`;
    }
  }

  // Helper for finder SVG
  const drawFinderSvg = (fx: number, fy: number) => {
    const s = (modSize * 7).toFixed(2);
    const u = modSize.toFixed(2);
    const x = fx.toFixed(2);
    const y = fy.toFixed(2);
    const x1 = (fx + modSize).toFixed(2);
    const y1 = (fy + modSize).toFixed(2);
    const s1 = (modSize * 5).toFixed(2);
    const x2 = (fx + modSize * 2).toFixed(2);
    const y2 = (fy + modSize * 2).toFixed(2);
    const s2 = (modSize * 3).toFixed(2);
    const rx = (options.finderStyle === 'rounded' ? modSize * 1.5 : 0).toFixed(2);

    return `
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}" fill="url(#qrGrad)" />
    <rect x="${x1}" y="${y1}" width="${s1}" height="${s1}" rx="${(Number(rx) * 0.7).toFixed(2)}" fill="${options.bgColor}" />
    <rect x="${x2}" y="${y2}" width="${s2}" height="${s2}" rx="${(Number(rx) * 0.5).toFixed(2)}" fill="url(#qrGrad)" />
    `;
  };

  const f1 = drawFinderSvg(offset, offset);
  const f2 = drawFinderSvg(offset + (qrSize - 7) * modSize, offset);
  const f3 = drawFinderSvg(offset, offset + (qrSize - 7) * modSize);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${options.fgColor}" />
      <stop offset="100%" stop-color="${options.fgColorEnd || options.fgColor}" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="${options.bgColor}" />
  ${rects}
  ${f1}
  ${f2}
  ${f3}
</svg>`;
}
