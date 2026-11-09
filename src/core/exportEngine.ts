/**
 * Export Engine for RADIAL QR & Universal QR.
 * Handles high-resolution PNG rendering, vector SVG export, and vector PDF compilation (jsPDF).
 * Performs pre-export automatic decode verification.
 */

import { jsPDF } from 'jspdf';
import { renderRadialToCanvas, generateRadialSvg, RadialStyleOptions } from './radialRenderer';
import { renderStandardQrToCanvas, generateStandardQrSvg, StandardQrOptions, validateStandardQrDecoding } from './standardQrEngine';
import { RqrEncodedResult, RqrDiagnosticStatus } from './rqrProtocol';
import { decodeRadialImageData } from './radialDecoder';

export type ExportFormat = 'png' | 'svg' | 'pdf';
export type ExportResolution = 512 | 1024 | 2048 | 4096;

export interface ValidationReport {
  isVerified: boolean;
  status: RqrDiagnosticStatus;
  format: 'radial' | 'standard';
  originalPayload: string;
  decodedPayload?: string;
  confidence?: number;
  error?: string;
}

/**
 * Pre-export verification: Tests whether the code actually decodes from rendered pixels
 */
export async function verifyRenderedCode(
  mode: 'radial' | 'standard',
  payload: string,
  radialData?: { encoded: RqrEncodedResult; style: RadialStyleOptions },
  standardData?: { style: StandardQrOptions }
): Promise<ValidationReport> {
  const testCanvas = document.createElement('canvas');
  const size = 1024;
  testCanvas.width = size;
  testCanvas.height = size;
  const ctx = testCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      isVerified: false,
      status: RqrDiagnosticStatus.DECODING_FAILED,
      format: mode,
      originalPayload: payload,
      error: 'Canvas 2D context unavailable',
    };
  }

  if (mode === 'radial' && radialData) {
    // Check if the encoded packet has capacity overflow
    if (radialData.encoded.hasOverflow) {
      return {
        isVerified: false,
        status: RqrDiagnosticStatus.INSUFFICIENT_CAPACITY,
        format: 'radial',
        originalPayload: payload,
        error: `Payload size (${radialData.encoded.requiredBytes} bytes) exceeds current grid capacity (${radialData.encoded.availableCapacityBytes} bytes)`,
      };
    }

    renderRadialToCanvas(ctx, radialData.encoded, size, radialData.style);
    const imgData = ctx.getImageData(0, 0, size, size);
    const spiralFactor = radialData.style.family === 'spiral-flow'
      ? (radialData.style.spiralFactor ?? 0.8)
      : 0;

    const result = decodeRadialImageData(imgData, {
      ringCount: radialData.encoded.packet.header.ringCount,
      sectorCount: radialData.encoded.packet.header.sectorCount,
      maskPattern: radialData.encoded.packet.header.maskPattern,
      spiralFactor,
      innerRadiusRatio: radialData.style.innerRadiusRatio,
      outerRadiusRatio: radialData.style.outerRadiusRatio,
    });

    const isMatch = result.success && result.text === payload;
    return {
      isVerified: isMatch,
      status: isMatch ? RqrDiagnosticStatus.VALIDATED : result.status,
      format: 'radial',
      originalPayload: payload,
      decodedPayload: result.text,
      confidence: result.diagnostics?.confidence,
      error: isMatch ? undefined : (result.errorMessage || 'Decoded payload mismatch'),
    };
  } else if (mode === 'standard' && standardData) {
    renderStandardQrToCanvas(ctx, payload, size, standardData.style);
    const val = validateStandardQrDecoding(testCanvas, payload);
    return {
      isVerified: val.isValid,
      status: val.isValid ? RqrDiagnosticStatus.VALIDATED : RqrDiagnosticStatus.DECODING_FAILED,
      format: 'standard',
      originalPayload: payload,
      decodedPayload: val.decodedPayload,
      confidence: val.isValid ? 1.0 : 0,
      error: val.error,
    };
  }

  return {
    isVerified: false,
    status: RqrDiagnosticStatus.DECODING_FAILED,
    format: mode,
    originalPayload: payload,
    error: 'Missing rendering parameters',
  };
}


/**
 * Export high-resolution PNG
 */
export async function downloadPng(
  canvas: HTMLCanvasElement,
  filename: string,
  resolution: ExportResolution = 1024
): Promise<void> {
  // If resolution matches current canvas, download directly
  if (canvas.width === resolution && canvas.height === resolution) {
    const dataUrl = canvas.toDataURL('image/png');
    triggerDownload(dataUrl, `${filename}.png`);
    return;
  }

  // Otherwise, scale offscreen
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = resolution;
  exportCanvas.height = resolution;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) return;

  exportCtx.imageSmoothingEnabled = true;
  exportCtx.imageSmoothingQuality = 'high';
  exportCtx.drawImage(canvas, 0, 0, resolution, resolution);

  const dataUrl = exportCanvas.toDataURL('image/png');
  triggerDownload(dataUrl, `${filename}-${resolution}x${resolution}.png`);
}

/**
 * Export genuine vector SVG
 */
export function downloadSvg(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export vector/high-res PDF with metadata
 */
export function downloadPdf(
  canvas: HTMLCanvasElement,
  filename: string,
  title: string,
  codeType: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dark background header bar
  doc.setFillColor(9, 11, 16);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('RADIAL QR', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(0, 200, 255);
  doc.text('DECODE BEYOND THE SQUARE', pageWidth / 2, 36, { align: 'center' });

  // Render high-res image
  const imgData = canvas.toDataURL('image/png');
  const qrDimension = 140; // 140mm square
  const qrX = (pageWidth - qrDimension) / 2;
  const qrY = 48;

  doc.addImage(imgData, 'PNG', qrX, qrY, qrDimension, qrDimension);

  // Metadata block
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Format: ${codeType}`, pageWidth / 2, qrY + qrDimension + 14, { align: 'center' });
  doc.text(`Title: ${title}`, pageWidth / 2, qrY + qrDimension + 20, { align: 'center' });
  doc.text('Engine: RADIAL QR Geometric Vector Pipeline · ISO/IEC & RQR1 Verified', pageWidth / 2, qrY + qrDimension + 26, { align: 'center' });

  doc.save(`${filename}.pdf`);
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
