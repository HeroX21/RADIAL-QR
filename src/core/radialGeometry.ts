/**
 * Radial Polar Coordinate Geometry Engine.
 * Defines deterministic mapping between bitstreams and concentric polar cells.
 * Manages reserved structural regions (Center Anchor, Clock Track, Asymmetric Fiducial, Boundary).
 */

export interface RadialGridConfig {
  ringCount: number;      // e.g. 14 to 20 concentric rings
  sectorCount: number;    // e.g. 48 or 60 sectors per ring
  innerRadiusRatio: number; // e.g. 0.22 (center anchor zone)
  outerRadiusRatio: number; // e.g. 0.95 (quiet zone margin)
  maskPattern: number;
}

export const DEFAULT_GRID_CONFIG: RadialGridConfig = {
  ringCount: 16,
  sectorCount: 48,
  innerRadiusRatio: 0.22,
  outerRadiusRatio: 0.96,
  maskPattern: 0,
};

export enum CellType {
  DATA = 'DATA',
  CLOCK = 'CLOCK',
  FIDUCIAL = 'FIDUCIAL',
  ANCHOR = 'ANCHOR',
  BOUNDARY = 'BOUNDARY',
}

export interface RadialCell {
  ring: number;
  sector: number;
  type: CellType;
  value: number; // 0 or 1
  rawBitIndex?: number;
}

/**
 * Deterministically checks whether cell (ring, sector) is reserved for structural markers
 */
export function getCellType(ring: number, sector: number, ringCount: number, sectorCount: number): CellType {
  // Ring 0 is the Clock Synchronization Track
  if (ring === 0) {
    return CellType.CLOCK;
  }

  // Outer ring is the Boundary Calibration Track
  if (ring === ringCount - 1) {
    return CellType.BOUNDARY;
  }

  // Asymmetric Orientation Fiducial:
  // Located at sector 0..3 and sectors (sectorCount - 2)..(sectorCount - 1) on rings 1, 2, 3
  const isFiducialSector = sector <= 2 || sector >= sectorCount - 2;
  const isFiducialRing = ring >= 1 && ring <= 3;
  if (isFiducialRing && isFiducialSector) {
    return CellType.FIDUCIAL;
  }

  return CellType.DATA;
}

/**
 * Reversible masking function to balance light and dark cell distribution
 */
export function applyMask(bit: number, ring: number, sector: number, pattern: number): number {
  let maskBit = 0;
  switch (pattern % 4) {
    case 0:
      maskBit = (ring + sector) % 2 === 0 ? 1 : 0;
      break;
    case 1:
      maskBit = sector % 3 === 0 ? 1 : 0;
      break;
    case 2:
      maskBit = (ring * sector) % 2 === 0 ? 1 : 0;
      break;
    case 3:
      maskBit = ((ring + sector) + (ring * sector)) % 2 === 0 ? 1 : 0;
      break;
    default:
      maskBit = (ring + sector) % 2 === 0 ? 1 : 0;
  }
  return bit ^ maskBit;
}

/**
 * Map encoded bitstream onto the polar cell matrix
 */
export function buildRadialMatrix(
  bits: Uint8Array,
  config: RadialGridConfig = DEFAULT_GRID_CONFIG
): {
  cells: RadialCell[][];
  totalDataCapacity: number;
  bitsUsed: number;
  config: RadialGridConfig;
} {
  const { ringCount, sectorCount, maskPattern } = config;
  const cells: RadialCell[][] = [];

  let dataBitIndex = 0;
  let totalDataCapacity = 0;

  // Initialize grid
  for (let r = 0; r < ringCount; r++) {
    const ringCells: RadialCell[] = [];
    for (let s = 0; s < sectorCount; s++) {
      const type = getCellType(r, s, ringCount, sectorCount);
      let value = 0;

      if (type === CellType.CLOCK) {
        // Clock track has alternating 1, 0, 1, 0...
        value = s % 2 === 0 ? 1 : 0;
      } else if (type === CellType.BOUNDARY) {
        // Boundary calibration: alternating double-sector pattern
        value = Math.floor(s / 2) % 2 === 0 ? 1 : 0;
      } else if (type === CellType.FIDUCIAL) {
        // Solid high-contrast fiducial marker at top sector (0-degrees)
        // Distinctive pattern: outer frame 1s with inner core 0 for sharp centroid
        if (r === 2 && (s === 0 || s === 1)) {
          value = 0; // eye center
        } else {
          value = 1; // fiducial surround
        }
      } else {
        // Data cell
        totalDataCapacity++;
        const rawBit = dataBitIndex < bits.length ? bits[dataBitIndex] : 0;
        value = applyMask(rawBit, r, s, maskPattern);
        ringCells.push({
          ring: r,
          sector: s,
          type,
          value,
          rawBitIndex: dataBitIndex < bits.length ? dataBitIndex : undefined,
        });
        dataBitIndex++;
        continue;
      }

      ringCells.push({
        ring: r,
        sector: s,
        type,
        value,
      });
    }
    cells.push(ringCells);
  }

  return {
    cells,
    totalDataCapacity,
    bitsUsed: Math.min(dataBitIndex, bits.length),
    config,
  };
}

/**
 * Extract bits from a sampled radial cell matrix
 */
export function extractBitsFromRadialMatrix(
  cells: { value: number; ring: number; sector: number }[][],
  config: RadialGridConfig
): Uint8Array {
  const { ringCount, sectorCount, maskPattern } = config;
  const rawBits: number[] = [];

  for (let r = 0; r < ringCount; r++) {
    for (let s = 0; s < sectorCount; s++) {
      const type = getCellType(r, s, ringCount, sectorCount);
      if (type === CellType.DATA) {
        const sampledVal = cells[r] && cells[r][s] ? cells[r][s].value : 0;
        const unmaskedBit = applyMask(sampledVal, r, s, maskPattern);
        rawBits.push(unmaskedBit);
      }
    }
  }

  // Convert bits array to Uint8Array bytes (MSB first)
  const byteCount = Math.floor(rawBits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let b = 0;
    for (let bit = 0; bit < 8; bit++) {
      b = (b << 1) | rawBits[i * 8 + bit];
    }
    bytes[i] = b;
  }

  return bytes;
}

/**
 * Polar coordinate calculation:
 * Returns center of cell (ring, sector) in normalized canvas coordinates [0..size]
 */
export function getCellCenterPolar(
  ring: number,
  sector: number,
  ringCount: number,
  sectorCount: number,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  rotationAngle = 0
): { x: number; y: number; radius: number; angle: number; ringThickness: number; sectorSpan: number } {
  const ringThickness = (outerRadius - innerRadius) / ringCount;
  const radius = innerRadius + (ring + 0.5) * ringThickness;
  const sectorSpan = (2 * Math.PI) / sectorCount;
  // Offset by rotation angle, top is -PI/2
  const angle = (sector * sectorSpan) - Math.PI / 2 + rotationAngle;

  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  return { x, y, radius, angle, ringThickness, sectorSpan };
}
