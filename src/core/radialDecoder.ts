/**
 * RADIAL QR Image Computer Vision Decoder.
 * Decodes circular RQR1 codes from ImageData, Canvas or Uploaded files.
 * Provides full diagnostic telemetry (center, radius, angle, grid samples, RS status).
 */

import { DEFAULT_GRID_CONFIG, RadialGridConfig, extractBitsFromRadialMatrix, getCellType, CellType } from './radialGeometry';
import { decodeRqrCodeword, RqrPacket } from './rqrProtocol';

export interface RadialDecodeDiagnostics {
  center: { x: number; y: number };
  outerRadius: number;
  innerRadius: number;
  orientationAngle: number; // in radians
  confidence: number;       // 0..1
  ringsDetected: number;
  sectorsDetected: number;
  samplingPoints: { x: number; y: number; value: number }[];
  isDarkOnLight: boolean;
  errorsCorrected: number;
}

export interface RadialDecodeResult {
  success: boolean;
  packet?: RqrPacket;
  text?: string;
  diagnostics?: RadialDecodeDiagnostics;
  errorMessage?: string;
}

/**
 * Main decoding entrypoint taking ImageData
 */
export function decodeRadialImageData(
  imageData: ImageData,
  customConfig?: Partial<RadialGridConfig>
): RadialDecodeResult {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  if (width < 64 || height < 64) {
    return { success: false, errorMessage: "Image resolution too small for radial decoding" };
  }

  // 1. Convert to Grayscale & compute statistics
  const gray = new Uint8Array(width * height);
  let minLum = 255;
  let maxLum = 0;
  let sumLum = 0;

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Rec. 601 luminance
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[j] = y;
    if (y < minLum) minLum = y;
    if (y > maxLum) maxLum = y;
    sumLum += y;
  }

  const contrast = maxLum - minLum;
  if (contrast < 20) {
    return { success: false, errorMessage: "Image contrast too low to detect radial pattern" };
  }

  // Global threshold (Otsu approximation)
  const threshold = Math.round(minLum + contrast * 0.5);

  // 2. Find Symbol Center Anchor
  // Most scans are centered or viewfinder-guided.
  // Search in center bounding box for central circular anchor
  const centerResult = locateCenterAnchor(gray, width, height, threshold);
  if (!centerResult) {
    return { success: false, errorMessage: "Could not find radial central anchor" };
  }
  const { cx, cy, anchorRadius, isDarkOnLight } = centerResult;

  // 3. Estimate Outer Symbol Radius
  const estimatedOuterRadius = estimateOuterRadius(gray, width, height, cx, cy, anchorRadius, threshold, isDarkOnLight);
  const outerRadius = customConfig?.outerRadiusRatio
    ? (Math.min(width, height) / 2) * customConfig.outerRadiusRatio
    : estimatedOuterRadius;

  if (outerRadius <= anchorRadius * 1.5) {
    return { success: false, errorMessage: "Invalid radial symbol dimensions detected" };
  }

  const innerRadius = customConfig?.innerRadiusRatio
    ? (Math.min(width, height) / 2) * customConfig.innerRadiusRatio
    : anchorRadius * 1.05;

  // 4. Test candidate configurations (default: 16 rings, 48 sectors; or custom)
  const candidateRingCounts = customConfig?.ringCount ? [customConfig.ringCount] : [16, 14, 18, 12, 20];
  const candidateSectorCounts = customConfig?.sectorCount ? [customConfig.sectorCount] : [48, 60, 36, 64];

  // 5. Detect Symbol Orientation Angle (0 to 2*PI)
  // Scan angular profile around the fiducial ring track
  const orientationAngle = detectOrientationAngle(
    gray,
    width,
    height,
    cx,
    cy,
    innerRadius,
    outerRadius,
    threshold,
    isDarkOnLight
  );

  // Try candidate grid geometries
  for (const ringCount of candidateRingCounts) {
    for (const sectorCount of candidateSectorCounts) {
      const sectorSpan = (2 * Math.PI) / sectorCount;
      const candidateAngles = [
        orientationAngle,
        0,
        Math.round(orientationAngle / sectorSpan) * sectorSpan,
        orientationAngle + sectorSpan * 0.5,
        orientationAngle - sectorSpan * 0.5,
      ];

      for (const angleCandidate of candidateAngles) {
        const config: RadialGridConfig = {
          ringCount,
          sectorCount,
          innerRadiusRatio: innerRadius / outerRadius,
          outerRadiusRatio: 1.0,
          maskPattern: customConfig?.maskPattern ?? 0,
        };

        // Sample cells at polar coordinates
        const { sampledMatrix, samplingPoints, signalConfidence } = samplePolarGrid(
          gray,
          width,
          height,
          cx,
          cy,
          innerRadius,
          outerRadius,
          angleCandidate,
          config,
          threshold,
          isDarkOnLight
        );

        // Try each mask pattern (0..3) if not explicitly fixed
        const maskPatterns = customConfig?.maskPattern !== undefined
          ? [customConfig.maskPattern]
          : [0, 1, 2, 3];

        for (const mask of maskPatterns) {
          config.maskPattern = mask;
          const rawBytes = extractBitsFromRadialMatrix(sampledMatrix, config);
          const decodeResult = decodeRqrCodeword(rawBytes);

          if (decodeResult.success && decodeResult.packet) {
            const diagnostics: RadialDecodeDiagnostics = {
              center: { x: Math.round(cx), y: Math.round(cy) },
              outerRadius: Math.round(outerRadius),
              innerRadius: Math.round(innerRadius),
              orientationAngle: angleCandidate,
              confidence: Math.min(1.0, signalConfidence + (decodeResult.errorsCorrected === 0 ? 0.3 : 0.1)),
              ringsDetected: ringCount,
              sectorsDetected: sectorCount,
              samplingPoints: samplingPoints.slice(0, 120),
              isDarkOnLight,
              errorsCorrected: decodeResult.errorsCorrected,
            };

            return {
              success: true,
              packet: decodeResult.packet,
              text: decodeResult.packet.payload,
              diagnostics,
            };
          }
        }
      }
    }
  }

  return {
    success: false,
    errorMessage: "Found radial symbol structure but could not decode valid RQR1 packet",
    diagnostics: {
      center: { x: Math.round(cx), y: Math.round(cy) },
      outerRadius: Math.round(outerRadius),
      innerRadius: Math.round(innerRadius),
      orientationAngle,
      confidence: 0.35,
      ringsDetected: 16,
      sectorsDetected: 48,
      samplingPoints: [],
      isDarkOnLight,
      errorsCorrected: 0,
    },
  };
}

/**
 * Locate center circular anchor
 */
function locateCenterAnchor(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold: number
): { cx: number; cy: number; anchorRadius: number; isDarkOnLight: boolean } | null {
  const searchMinX = Math.floor(width * 0.2);
  const searchMaxX = Math.floor(width * 0.8);
  const searchMinY = Math.floor(height * 0.2);
  const searchMaxY = Math.floor(height * 0.8);

  // Look for circular central dark mass (or light mass on dark background)
  // Check image center first
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  // Check polarity at center vs corner
  const centerPixel = gray[midY * width + midX];
  const cornerPixel = gray[10 * width + 10];
  const isDarkOnLight = centerPixel < cornerPixel;

  // Find radial extent of the central anchor disk in 4 orthogonal directions
  const isForeground = (val: number) => (isDarkOnLight ? val < threshold : val >= threshold);

  // Coarse search around middle for best candidate center
  let bestCx = midX;
  let bestCy = midY;
  let bestScore = -1;
  const step = Math.max(2, Math.floor(width / 100));

  for (let y = searchMinY; y < searchMaxY; y += step * 3) {
    for (let x = searchMinX; x < searchMaxX; x += step * 3) {
      if (isForeground(gray[y * width + x])) {
        // Measure horizontal and vertical span
        let rLeft = 0;
        while (x - rLeft > 0 && isForeground(gray[y * width + (x - rLeft)])) rLeft++;
        let rRight = 0;
        while (x + rRight < width && isForeground(gray[y * width + (x + rRight)])) rRight++;
        let rUp = 0;
        while (y - rUp > 0 && isForeground(gray[(y - rUp) * width + x])) rUp++;
        let rDown = 0;
        while (y + rDown < height && isForeground(gray[(y + rDown) * width + x])) rDown++;

        const hSpan = rLeft + rRight;
        const vSpan = rUp + rDown;
        const diff = Math.abs(hSpan - vSpan);
        const avgSpan = (hSpan + vSpan) / 2;

        // Circular disk has low eccentricity
        if (avgSpan > 10 && avgSpan < width * 0.4 && diff < avgSpan * 0.3) {
          const score = 1000 - diff * 10 + avgSpan;
          if (score > bestScore) {
            bestScore = score;
            bestCx = x - rLeft + Math.floor(hSpan / 2);
            bestCy = y - rUp + Math.floor(vSpan / 2);
          }
        }
      }
    }
  }

  // Refine anchor radius from best center
  // The bullseye anchor has FG -> BG -> FG transitions, followed by the quiet gap before Ring 0
  let span = 0;
  let transitions = 0;
  let prevFg = isForeground(gray[bestCy * width + bestCx]);

  for (let r = 1; r < Math.floor(width * 0.3); r++) {
    const p1 = gray[bestCy * width + (bestCx + r)];
    const fg = isForeground(p1);
    if (fg !== prevFg) {
      transitions++;
      prevFg = fg;
      // When we transition from the outer bullseye ring (FG) to the quiet gap (BG)
      if (transitions >= 3 && !fg) {
        span = r;
        break;
      }
    }
  }

  // If solid disk anchor (1 transition from FG to BG)
  if (span === 0) {
    for (let r = 1; r < Math.floor(width * 0.3); r++) {
      const p1 = gray[bestCy * width + (bestCx + r)];
      if (!isForeground(p1)) {
        span = r;
        break;
      }
    }
  }

  const anchorRadius = span > 15 ? span : Math.floor(width * 0.1);
  return { cx: bestCx, cy: bestCy, anchorRadius, isDarkOnLight };
}

/**
 * Estimate outer symbol radius along multiple radial spokes
 */
function estimateOuterRadius(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  anchorRadius: number,
  threshold: number,
  isDarkOnLight: boolean
): number {
  const maxPossibleRadius = Math.min(cx, cy, width - cx, height - cy) - 4;
  const spokes = 8;
  const radii: number[] = [];

  for (let s = 0; s < spokes; s++) {
    const angle = (s * 2 * Math.PI) / spokes;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    let lastTransition = anchorRadius * 2;
    let prevVal = -1;

    for (let r = anchorRadius; r < maxPossibleRadius; r += 2) {
      const px = Math.floor(cx + r * cosA);
      const py = Math.floor(cy + r * sinA);
      if (px < 0 || px >= width || py < 0 || py >= height) break;

      const val = gray[py * width + px] < threshold ? 1 : 0;
      if (prevVal !== -1 && val !== prevVal) {
        lastTransition = r;
      }
      prevVal = val;
    }
    radii.push(lastTransition);
  }

  // Median radius across spokes
  radii.sort((a, b) => a - b);
  const medianRadius = radii[Math.floor(radii.length / 2)];
  return Math.max(medianRadius, anchorRadius * 2.5);
}

/**
 * Detect rotation orientation angle (0 to 2*PI) by searching for the asymmetric fiducial
 */
function detectOrientationAngle(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  threshold: number,
  isDarkOnLight: boolean
): number {
  // Fiducial is situated on inner rings (e.g. ring 1..3)
  const fiducialRadius = innerRadius + (outerRadius - innerRadius) * 0.15;
  const numAngleSteps = 180;
  const scores: { angle: number; score: number }[] = [];

  for (let i = 0; i < numAngleSteps; i++) {
    const angle = (i * 2 * Math.PI) / numAngleSteps;
    // Check density in a window around this angle vs opposite
    let sumForeground = 0;
    const windowSteps = 7;
    for (let w = -windowSteps; w <= windowSteps; w++) {
      const a = angle + (w * 2 * Math.PI) / (numAngleSteps * 4);
      for (let deltaR = -4; deltaR <= 4; deltaR += 2) {
        const r = fiducialRadius + deltaR;
        const px = Math.floor(cx + r * Math.cos(a - Math.PI / 2));
        const py = Math.floor(cy + r * Math.sin(a - Math.PI / 2));
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const val = gray[py * width + px];
          const isFg = isDarkOnLight ? val < threshold : val >= threshold;
          if (isFg) sumForeground++;
        }
      }
    }
    scores.push({ angle, score: sumForeground });
  }

  // Peak score corresponds to the high-density asymmetric fiducial marker
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.angle ?? 0;
}

/**
 * Sample polar grid cells with 5-point anti-aliased kernel
 */
function samplePolarGrid(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  orientationAngle: number,
  config: RadialGridConfig,
  threshold: number,
  isDarkOnLight: boolean
): {
  sampledMatrix: { value: number; ring: number; sector: number }[][];
  samplingPoints: { x: number; y: number; value: number }[];
  signalConfidence: number;
} {
  const { ringCount, sectorCount } = config;
  const ringThickness = (outerRadius - innerRadius) / ringCount;
  const sectorSpan = (2 * Math.PI) / sectorCount;

  const sampledMatrix: { value: number; ring: number; sector: number }[][] = [];
  const samplingPoints: { x: number; y: number; value: number }[] = [];

  let clockMatches = 0;
  let totalClock = 0;

  for (let r = 0; r < ringCount; r++) {
    const row: { value: number; ring: number; sector: number }[] = [];
    const radius = innerRadius + (r + 0.5) * ringThickness;

    for (let s = 0; s < sectorCount; s++) {
      const angle = (s + 0.5) * sectorSpan - Math.PI / 2 + orientationAngle;
      const sampleX = cx + radius * Math.cos(angle);
      const sampleY = cy + radius * Math.sin(angle);

      // 5-point cross sampling for noise immunity
      let sampleSum = 0;
      let count = 0;
      const kernel = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      for (const [dx, dy] of kernel) {
        const px = Math.floor(sampleX + dx);
        const py = Math.floor(sampleY + dy);
        if (px >= 0 && px < width && py >= 0 && py < height) {
          sampleSum += gray[py * width + px];
          count++;
        }
      }

      const avgLum = count > 0 ? sampleSum / count : 128;
      const isForeground = isDarkOnLight ? avgLum < threshold : avgLum >= threshold;
      const bitValue = isForeground ? 1 : 0;

      row.push({ value: bitValue, ring: r, sector: s });

      // Track clock track synchronization
      if (r === 0) {
        totalClock++;
        const expectedClock = s % 2 === 0 ? 1 : 0;
        if (bitValue === expectedClock) clockMatches++;
      }

      // Keep sample points for UI diagnostics
      if (r % 2 === 0 && s % 3 === 0) {
        samplingPoints.push({ x: sampleX, y: sampleY, value: bitValue });
      }
    }
    sampledMatrix.push(row);
  }

  const clockSyncRate = totalClock > 0 ? clockMatches / totalClock : 0.5;
  return {
    sampledMatrix,
    samplingPoints,
    signalConfidence: clockSyncRate,
  };
}
