/**
 * RADIAL QR Geometric Rendering Engine.
 * Implements 6 distinct design families inspired by concentric radial geometry:
 * 1. Radial Angular (Reference-inspired dense geometric angular segments)
 * 2. Spiral Flow (Concentric Archimedean spiral data tracks)
 * 3. Circular Labyrinth (Maze-like interconnected radial pathways)
 * 4. Circuit Matrix (Futuristic electronic radial traces, vias & nodes)
 * 5. Concentric Rings (Nested circular data bands)
 * 6. Abstract Hybrid (Faceted polygonal wedges & angular geometry)
 *
 * Supports both HTML5 Canvas 2D rendering and genuine vector SVG path generation.
 */

import { RadialCell, RadialGridConfig, buildRadialMatrix, getCellCenterPolar, CellType } from './radialGeometry';
import { RqrEncodedResult } from './rqrProtocol';

export type DesignFamily =
  | 'radial-angular'
  | 'spiral-flow'
  | 'circular-labyrinth'
  | 'circuit-matrix'
  | 'concentric-rings'
  | 'abstract-hybrid';

export type ModuleShape = 'wedge' | 'rounded' | 'sharp' | 'pill' | 'faceted' | 'circuit';

export interface RadialStyleOptions {
  family: DesignFamily;
  moduleShape: ModuleShape;
  rotation: number;           // in degrees (0..360)
  density: number;            // 0.5 .. 1.0 (gap spacing)
  strokeWidth: number;        // in pixels
  innerRadiusRatio: number;   // 0.15 .. 0.35
  outerRadiusRatio: number;   // 0.85 .. 0.98
  fgColor: string;            // hex/rgb
  fgColorEnd?: string;        // optional gradient end
  bgColor: string;
  gradientType: 'none' | 'radial' | 'angular' | 'linear';
  showCenterAnchor: boolean;
  centerAnchorStyle: 'bullseye' | 'solid' | 'target' | 'ring-core';
  centerLogoUrl?: string;
  centerLogoSizeRatio?: number; // 0.1 .. 0.25
  showDecorativeBorder: boolean;
  borderStyle: 'ticks' | 'rings' | 'compass' | 'dots';
  showCalibrationGuides: boolean;
}

export const DEFAULT_STYLE_OPTIONS: RadialStyleOptions = {
  family: 'radial-angular',
  moduleShape: 'wedge',
  rotation: 0,
  density: 0.88,
  strokeWidth: 2,
  innerRadiusRatio: 0.22,
  outerRadiusRatio: 0.94,
  fgColor: '#00C8FF',
  fgColorEnd: '#176BFF',
  bgColor: '#090B10',
  gradientType: 'radial',
  showCenterAnchor: true,
  centerAnchorStyle: 'bullseye',
  centerLogoSizeRatio: 0.14,
  showDecorativeBorder: true,
  borderStyle: 'ticks',
  showCalibrationGuides: false,
};

/**
 * Render Radial QR Code onto an HTML Canvas 2D Context
 */
export function renderRadialToCanvas(
  ctx: CanvasRenderingContext2D,
  encoded: RqrEncodedResult,
  size: number,
  style: RadialStyleOptions = DEFAULT_STYLE_OPTIONS
): void {
  const { width, height } = ctx.canvas;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = (Math.min(width, height) / 2) * style.outerRadiusRatio;
  const innerRadius = (Math.min(width, height) / 2) * style.innerRadiusRatio;

  // Clear background
  ctx.save();
  ctx.fillStyle = style.bgColor;
  ctx.fillRect(0, 0, width, height);

  // Background radial glow effect
  if (style.gradientType === 'radial') {
    const glow = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, maxRadius * 1.1);
    glow.addColorStop(0, `${style.fgColor}10`);
    glow.addColorStop(0.7, `${style.fgColorEnd || style.fgColor}05`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  const gridConfig: RadialGridConfig = {
    ringCount: encoded.packet.header.ringCount,
    sectorCount: encoded.packet.header.sectorCount,
    innerRadiusRatio: style.innerRadiusRatio,
    outerRadiusRatio: style.outerRadiusRatio,
    maskPattern: encoded.packet.header.maskPattern,
  };

  const { cells } = buildRadialMatrix(encoded.bits, gridConfig);
  const ringCount = gridConfig.ringCount;
  const sectorCount = gridConfig.sectorCount;
  const ringThickness = (maxRadius - innerRadius) / ringCount;
  const sectorSpan = (2 * Math.PI) / sectorCount;
  const rotRad = (style.rotation * Math.PI) / 180;

  // Create color style / gradient
  let cellFillStyle: string | CanvasGradient = style.fgColor;
  if (style.gradientType === 'radial') {
    const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, maxRadius);
    grad.addColorStop(0, style.fgColor);
    grad.addColorStop(1, style.fgColorEnd || style.fgColor);
    cellFillStyle = grad;
  } else if (style.gradientType === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, style.fgColor);
    grad.addColorStop(1, style.fgColorEnd || style.fgColor);
    cellFillStyle = grad;
  }

  // 1. Draw Cells based on Design Family
  for (let r = 0; r < ringCount; r++) {
    const rInner = innerRadius + r * ringThickness;
    const rOuter = rInner + ringThickness;

    // Spiral flow offset modifier
    const spiralOffset = style.family === 'spiral-flow' ? (r / ringCount) * 1.2 : 0;

    for (let s = 0; s < sectorCount; s++) {
      const cell = cells[r][s];
      if (cell.value === 0 && cell.type !== CellType.FIDUCIAL) continue;

      const baseAngle = s * sectorSpan - Math.PI / 2 + rotRad + spiralOffset;
      // Gap spacing by density
      const angularGap = ((1 - style.density) * sectorSpan) / 2;
      const radialGap = ((1 - style.density) * ringThickness) / 2;

      const aStart = baseAngle + angularGap;
      const aEnd = baseAngle + sectorSpan - angularGap;
      const rIn = rInner + radialGap;
      const rOut = rOuter - radialGap;

      ctx.fillStyle = cellFillStyle;
      ctx.strokeStyle = cellFillStyle;

      if (style.family === 'radial-angular' || style.family === 'concentric-rings') {
        // Crisp angular segment arc
        drawArcWedge(ctx, cx, cy, rIn, rOut, aStart, aEnd, style.moduleShape);
      } else if (style.family === 'spiral-flow') {
        // Swirling tapered arcs
        drawSpiralSegment(ctx, cx, cy, rIn, rOut, aStart, aEnd);
      } else if (style.family === 'circular-labyrinth') {
        // Maze-like interconnected orthogonal tracks
        drawLabyrinthSegment(ctx, cx, cy, rIn, rOut, aStart, aEnd, r, s, cells);
      } else if (style.family === 'circuit-matrix') {
        // PCB circuit traces, tracks, and circular vias
        drawCircuitSegment(ctx, cx, cy, rIn, rOut, aStart, aEnd, r, s);
      } else if (style.family === 'abstract-hybrid') {
        // Faceted diamond cuts and multifaceted angular geometry
        drawFacetedSegment(ctx, cx, cy, rIn, rOut, aStart, aEnd, r, s);
      }
    }
  }

  // 2. Draw Center Anchor (Bullseye / Calibrator)
  if (style.showCenterAnchor) {
    drawCenterAnchor(ctx, cx, cy, innerRadius * 0.9, style.centerAnchorStyle, cellFillStyle, style.bgColor);
  }

  // 3. Draw Decorative Outer Border & Scale Ticks
  if (style.showDecorativeBorder) {
    drawDecorativeBorder(ctx, cx, cy, maxRadius, style.borderStyle, cellFillStyle);
  }

  // 4. Calibration Guides (Diagnostic mode)
  if (style.showCalibrationGuides) {
    drawGuides(ctx, cx, cy, innerRadius, maxRadius, ringCount, sectorCount, rotRad);
  }

  ctx.restore();
}

/**
 * Draw an arc wedge with optional corner rounding or shaping
 */
function drawArcWedge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  aStart: number,
  aEnd: number,
  shape: ModuleShape
): void {
  ctx.beginPath();
  if (shape === 'rounded' || shape === 'pill') {
    // Pill-like rounded segment
    const rMid = (rInner + rOuter) / 2;
    const aMid = (aStart + aEnd) / 2;
    const spanRad = (rOuter - rInner) / 2;
    const xMid = cx + rMid * Math.cos(aMid);
    const yMid = cy + rMid * Math.sin(aMid);
    ctx.arc(xMid, yMid, spanRad * 0.9, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Standard angular wedge arc
  ctx.arc(cx, cy, rOuter, aStart, aEnd, false);
  ctx.arc(cx, cy, rInner, aEnd, aStart, true);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw spiral flow tapered segments
 */
function drawSpiralSegment(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  aStart: number,
  aEnd: number
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, aStart, aEnd, false);
  const endX = cx + rInner * Math.cos(aEnd);
  const endY = cy + rInner * Math.sin(aEnd);
  ctx.lineTo(endX, endY);
  ctx.arc(cx, cy, rInner, aEnd, aStart, true);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw maze-like interconnected tracks for Circular Labyrinth
 */
function drawLabyrinthSegment(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  aStart: number,
  aEnd: number,
  r: number,
  s: number,
  cells: RadialCell[][]
): void {
  const rMid = (rInner + rOuter) / 2;
  const aMid = (aStart + aEnd) / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, aStart, aEnd, false);
  ctx.arc(cx, cy, rInner, aEnd, aStart, true);
  ctx.closePath();
  ctx.fill();

  // Connective bridge to adjacent radial cell if active
  if (r > 0 && cells[r - 1]?.[s]?.value === 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, rInner + 2, aStart, aEnd, false);
    ctx.arc(cx, cy, rInner - 2, aEnd, aStart, true);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Draw circuit traces, via pads and nodes for Circuit Matrix
 */
function drawCircuitSegment(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  aStart: number,
  aEnd: number,
  r: number,
  s: number
): void {
  const rMid = (rInner + rOuter) / 2;
  const aMid = (aStart + aEnd) / 2;
  const traceWidth = Math.max(2, (rOuter - rInner) * 0.45);

  ctx.beginPath();
  ctx.lineWidth = traceWidth;
  ctx.arc(cx, cy, rMid, aStart, aEnd, false);
  ctx.stroke();

  // Terminal via node (small circular pad at sector ends)
  if (s % 3 === 0) {
    const xNode = cx + rMid * Math.cos(aMid);
    const yNode = cy + rMid * Math.sin(aMid);
    ctx.beginPath();
    ctx.arc(xNode, yNode, traceWidth * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw faceted diamond and polygon cuts for Abstract Hybrid
 */
function drawFacetedSegment(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  aStart: number,
  aEnd: number,
  r: number,
  s: number
): void {
  const rMid = (rInner + rOuter) / 2;
  const aMid = (aStart + aEnd) / 2;

  // Diamond / faceted polygon
  const p1x = cx + rInner * Math.cos(aMid);
  const p1y = cy + rInner * Math.sin(aMid);
  const p2x = cx + rMid * Math.cos(aEnd);
  const p2y = cy + rMid * Math.sin(aEnd);
  const p3x = cx + rOuter * Math.cos(aMid);
  const p3y = cy + rOuter * Math.sin(aMid);
  const p4x = cx + rMid * Math.cos(aStart);
  const p4y = cy + rMid * Math.sin(aStart);

  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(p3x, p3y);
  ctx.lineTo(p4x, p4y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw Center Anchor (Bullseye calibration marker)
 */
function drawCenterAnchor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  style: 'bullseye' | 'solid' | 'target' | 'ring-core',
  fgStyle: string | CanvasGradient,
  bgColor: string
): void {
  ctx.save();
  ctx.fillStyle = fgStyle;
  ctx.strokeStyle = fgStyle;

  if (style === 'solid') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'target') {
    // Crosshair target with center dot
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.2, cy);
    ctx.lineTo(cx + radius * 1.2, cy);
    ctx.moveTo(cx, cy - radius * 1.2);
    ctx.lineTo(cx, cy + radius * 1.2);
    ctx.stroke();
  } else {
    // Bullseye: Outer ring + inner disc + center dot
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fgStyle;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw decorative border rings and scale ticks
 */
function drawDecorativeBorder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxRadius: number,
  style: 'ticks' | 'rings' | 'compass' | 'dots',
  fgStyle: string | CanvasGradient
): void {
  ctx.save();
  ctx.strokeStyle = fgStyle;
  ctx.fillStyle = fgStyle;
  ctx.lineWidth = 1.5;

  const borderR = maxRadius + 10;

  // Outer framing circle
  ctx.beginPath();
  ctx.arc(cx, cy, borderR, 0, Math.PI * 2);
  ctx.stroke();

  // Fine outer hairline
  ctx.beginPath();
  ctx.arc(cx, cy, borderR + 8, 0, Math.PI * 2);
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Ticks or compass marks
  const tickCount = style === 'compass' ? 16 : 72;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i * 2 * Math.PI) / tickCount;
    const isMajor = i % (tickCount / 8) === 0;
    const len = isMajor ? 8 : 4;
    const r1 = borderR;
    const r2 = borderR + len;

    const x1 = cx + r1 * Math.cos(angle);
    const y1 = cy + r1 * Math.sin(angle);
    const x2 = cx + r2 * Math.cos(angle);
    const y2 = cy + r2 * Math.sin(angle);

    ctx.beginPath();
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw diagnostic alignment guides (visible in editor inspection mode)
 */
function drawGuides(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  ringCount: number,
  sectorCount: number,
  rotRad: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  // Concentric ring guides
  const ringThickness = (outerRadius - innerRadius) / ringCount;
  for (let r = 0; r <= ringCount; r++) {
    const radius = innerRadius + r * ringThickness;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Angular sector spokes (every 4 sectors)
  const sectorSpan = (2 * Math.PI) / sectorCount;
  for (let s = 0; s < sectorCount; s += 4) {
    const angle = s * sectorSpan - Math.PI / 2 + rotRad;
    ctx.beginPath();
    ctx.moveTo(cx + innerRadius * Math.cos(angle), cy + innerRadius * Math.sin(angle));
    ctx.lineTo(cx + outerRadius * Math.cos(angle), cy + outerRadius * Math.sin(angle));
    ctx.stroke();
  }

  // Crosshairs
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(cx - outerRadius * 1.05, cy);
  ctx.lineTo(cx + outerRadius * 1.05, cy);
  ctx.moveTo(cx, cy - outerRadius * 1.05);
  ctx.lineTo(cx, cy + outerRadius * 1.05);
  ctx.stroke();

  ctx.restore();
}

/**
 * Generate genuine vector SVG string for export
 */
export function generateRadialSvg(
  encoded: RqrEncodedResult,
  size = 1024,
  style: RadialStyleOptions = DEFAULT_STYLE_OPTIONS
): string {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = (size / 2) * style.outerRadiusRatio;
  const innerRadius = (size / 2) * style.innerRadiusRatio;

  const gridConfig: RadialGridConfig = {
    ringCount: encoded.packet.header.ringCount,
    sectorCount: encoded.packet.header.sectorCount,
    innerRadiusRatio: style.innerRadiusRatio,
    outerRadiusRatio: style.outerRadiusRatio,
    maskPattern: encoded.packet.header.maskPattern,
  };

  const { cells } = buildRadialMatrix(encoded.bits, gridConfig);
  const ringCount = gridConfig.ringCount;
  const sectorCount = gridConfig.sectorCount;
  const ringThickness = (maxRadius - innerRadius) / ringCount;
  const sectorSpan = (2 * Math.PI) / sectorCount;
  const rotRad = (style.rotation * Math.PI) / 180;

  let pathData = '';

  for (let r = 0; r < ringCount; r++) {
    const rInner = innerRadius + r * ringThickness;
    const rOuter = rInner + ringThickness;
    const spiralOffset = style.family === 'spiral-flow' ? (r / ringCount) * 1.2 : 0;

    for (let s = 0; s < sectorCount; s++) {
      const cell = cells[r][s];
      if (cell.value === 0 && cell.type !== CellType.FIDUCIAL) continue;

      const baseAngle = s * sectorSpan - Math.PI / 2 + rotRad + spiralOffset;
      const angularGap = ((1 - style.density) * sectorSpan) / 2;
      const radialGap = ((1 - style.density) * ringThickness) / 2;

      const aStart = baseAngle + angularGap;
      const aEnd = baseAngle + sectorSpan - angularGap;
      const rIn = rInner + radialGap;
      const rOut = rOuter - radialGap;

      // Polar arc path: Move to (rOut, aStart) -> Arc to (rOut, aEnd) -> Line to (rIn, aEnd) -> Arc to (rIn, aStart) -> Z
      const p1x = (cx + rOut * Math.cos(aStart)).toFixed(2);
      const p1y = (cy + rOut * Math.sin(aStart)).toFixed(2);
      const p2x = (cx + rOut * Math.cos(aEnd)).toFixed(2);
      const p2y = (cy + rOut * Math.sin(aEnd)).toFixed(2);
      const p3x = (cx + rIn * Math.cos(aEnd)).toFixed(2);
      const p3y = (cy + rIn * Math.sin(aEnd)).toFixed(2);
      const p4x = (cx + rIn * Math.cos(aStart)).toFixed(2);
      const p4y = (cy + rIn * Math.sin(aStart)).toFixed(2);

      const largeArc = aEnd - aStart > Math.PI ? 1 : 0;

      pathData += `M ${p1x} ${p1y} A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 ${largeArc} 1 ${p2x} ${p2y} L ${p3x} ${p3y} A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 ${largeArc} 0 ${p4x} ${p4y} Z `;
    }
  }

  // Bullseye SVG
  const anchorR = (innerRadius * 0.9).toFixed(2);
  const anchorR2 = (innerRadius * 0.9 * 0.65).toFixed(2);
  const anchorR3 = (innerRadius * 0.9 * 0.35).toFixed(2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${style.fgColor}" />
      <stop offset="100%" stop-color="${style.fgColorEnd || style.fgColor}" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${style.bgColor}" />
  <path d="${pathData}" fill="url(#radialGlow)" />
  <!-- Center Anchor -->
  <circle cx="${cx}" cy="${cy}" r="${anchorR}" fill="url(#radialGlow)" />
  <circle cx="${cx}" cy="${cy}" r="${anchorR2}" fill="${style.bgColor}" />
  <circle cx="${cx}" cy="${cy}" r="${anchorR3}" fill="url(#radialGlow)" />
  <!-- Outer border -->
  <circle cx="${cx}" cy="${cy}" r="${(maxRadius + 10).toFixed(2)}" fill="none" stroke="${style.fgColor}" stroke-width="1.5" />
  <circle cx="${cx}" cy="${cy}" r="${(maxRadius + 18).toFixed(2)}" fill="none" stroke="${style.fgColor}" stroke-width="0.75" />
</svg>`;

  return svg;
}
