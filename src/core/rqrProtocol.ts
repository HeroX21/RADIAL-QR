/**
 * RQR1: Radial QR Protocol Specification Version 1.
 * Provides deterministic serialization, packet encapsulation,
 * CRC32 verification and Reed-Solomon codeword framing.
 */

import { computeCRC32, crc32ToBytes, bytesToCRC32 } from './crc32';
import { encodeRS, decodeRS } from './reedsolomon';
import { calculateGridCapacity } from './radialGeometry';

export const RQR_MAGIC = new Uint8Array([0x52, 0x51, 0x52, 0x31]); // "RQR1"
export const RQR_VERSION = 1;

export enum PayloadType {
  URL = 0,
  TEXT = 1,
  WIFI = 2,
  CONTACT = 3,
  EMAIL = 4,
  PHONE = 5,
  SMS = 6,
  UPI = 7,
}

export enum EccLevel {
  LOW = 0,      // 8 parity bytes (corrects 4 byte errors)
  MEDIUM = 1,   // 12 parity bytes (corrects 6 byte errors)
  QUARTILE = 2, // 16 parity bytes (corrects 8 byte errors)
  HIGH = 3,     // 24 parity bytes (corrects 12 byte errors)
}

export const ECC_LENGTHS: Record<EccLevel, number> = {
  [EccLevel.LOW]: 8,
  [EccLevel.MEDIUM]: 12,
  [EccLevel.QUARTILE]: 16,
  [EccLevel.HIGH]: 24,
};

export enum RqrDiagnosticStatus {
  VALIDATED = 'VALIDATED',
  INSUFFICIENT_CAPACITY = 'INSUFFICIENT CAPACITY',
  LOW_MODULE_RESOLUTION = 'LOW MODULE RESOLUTION',
  STRUCTURAL_MARKER_ERROR = 'STRUCTURAL MARKER ERROR',
  ERROR_CORRECTION_FAILED = 'ERROR CORRECTION FAILED',
  CHECKSUM_FAILED = 'CHECKSUM FAILED',
  DECODING_FAILED = 'DECODING FAILED',
}

export interface RqrPacketHeader {
  version: number;
  payloadType: PayloadType;
  ringCount: number;
  sectorCount: number;
  maskPattern: number;
  eccLevel: EccLevel;
  payloadLength: number;
}

export interface RqrPacket {
  header: RqrPacketHeader;
  payload: string;
  crc32: number;
}

export interface RqrEncodedResult {
  bits: Uint8Array;        // 1D array of 0s and 1s ready for polar placement
  totalBytes: number;
  packet: RqrPacket;
  crcMatch: boolean;
  hasOverflow?: boolean;
  requiredBytes?: number;
  availableCapacityBytes?: number;
}


/**
 * Serialize an RQR1 packet into a protected binary codeword stream
 */
export function encodeRqrPacket(
  payload: string,
  payloadType: PayloadType,
  options: {
    ringCount?: number;
    sectorCount?: number;
    maskPattern?: number;
    eccLevel?: EccLevel;
    padToGridCapacity?: boolean;
  } = {}
): RqrEncodedResult & { codeword: Uint8Array } {
  const version = RQR_VERSION;
  const ringCount = options.ringCount ?? 16;
  const sectorCount = options.sectorCount ?? 48;
  const maskPattern = options.maskPattern ?? 0;
  const eccLevel = options.eccLevel ?? EccLevel.MEDIUM;
  const eccLen = ECC_LENGTHS[eccLevel];
  const padToGrid = options.padToGridCapacity !== false;

  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const payloadLength = payloadBytes.length;

  // Header:
  // 0..3: Magic "RQR1" (4 bytes)
  // 4: Version (1 byte)
  // 5: PayloadType (1 byte)
  // 6: RingCount (1 byte)
  // 7: SectorCount (1 byte)
  // 8: MaskPattern (1 byte)
  // 9: EccLevel (1 byte)
  // 10..11: PayloadLength (2 bytes uint16 big-endian)
  const headerLen = 12;
  const unchecksummedLen = headerLen + payloadLength;
  const unchecksummed = new Uint8Array(unchecksummedLen);

  unchecksummed.set(RQR_MAGIC, 0);
  unchecksummed[4] = version;
  unchecksummed[5] = payloadType;
  unchecksummed[6] = ringCount;
  unchecksummed[7] = sectorCount;
  unchecksummed[8] = maskPattern;
  unchecksummed[9] = eccLevel;
  unchecksummed[10] = (payloadLength >>> 8) & 0xFF;
  unchecksummed[11] = payloadLength & 0xFF;
  unchecksummed.set(payloadBytes, headerLen);

  // Compute CRC32 over magic + header + payload
  const crc = computeCRC32(unchecksummed);
  const crcBytes = crc32ToBytes(crc);

  // Base data packet: unchecksummed + 4 bytes CRC
  const minDataLen = unchecksummedLen + 4;
  const gridCap = calculateGridCapacity(ringCount, sectorCount);
  const targetCodewordBytes = gridCap.dataBytes;
  const targetDataBytes = Math.max(minDataLen, targetCodewordBytes - eccLen);

  const hasOverflow = minDataLen + eccLen > targetCodewordBytes;

  let dataBlock: Uint8Array;
  if (padToGrid && targetDataBytes >= minDataLen) {
    dataBlock = new Uint8Array(targetDataBytes);
    dataBlock.set(unchecksummed, 0);
    dataBlock.set(crcBytes, unchecksummedLen);
    // Pad remainder with alternating 0xEC, 0x11 (standard QR padding bytes)
    for (let i = minDataLen; i < targetDataBytes; i++) {
      dataBlock[i] = (i - minDataLen) % 2 === 0 ? 0xEC : 0x11;
    }
  } else {
    dataBlock = new Uint8Array(minDataLen);
    dataBlock.set(unchecksummed, 0);
    dataBlock.set(crcBytes, unchecksummedLen);
  }

  // Single-block Reed-Solomon over dataBlock
  const codeword = encodeRS(dataBlock, eccLen);

  // Convert bytes into bit array (MSB first)
  const bits = new Uint8Array(codeword.length * 8);
  for (let i = 0; i < codeword.length; i++) {
    const byte = codeword[i];
    for (let bit = 0; bit < 8; bit++) {
      bits[i * 8 + bit] = (byte >>> (7 - bit)) & 1;
    }
  }

  const packet: RqrPacket = {
    header: {
      version,
      payloadType,
      ringCount,
      sectorCount,
      maskPattern,
      eccLevel,
      payloadLength,
    },
    payload,
    crc32: crc,
  };

  return {
    codeword,
    bits,
    totalBytes: codeword.length,
    packet,
    crcMatch: true,
    hasOverflow,
    requiredBytes: minDataLen + eccLen,
    availableCapacityBytes: targetCodewordBytes,
  };
}

/**
 * Decode an RQR1 bit stream / codeword back to verified packet
 */
export function decodeRqrCodeword(
  rawBytes: Uint8Array,
  expectedEccLevel?: EccLevel
): {
  success: boolean;
  packet?: RqrPacket;
  errorsCorrected: number;
  status: RqrDiagnosticStatus;
  errorReason?: string;
} {
  if (rawBytes.length < 16) {
    return {
      success: false,
      errorsCorrected: 0,
      status: RqrDiagnosticStatus.DECODING_FAILED,
      errorReason: 'Data too short for RQR header',
    };
  }

  const eccLevelsToTry = expectedEccLevel !== undefined
    ? [expectedEccLevel]
    : [EccLevel.MEDIUM, EccLevel.LOW, EccLevel.QUARTILE, EccLevel.HIGH];

  let bestStatus = RqrDiagnosticStatus.DECODING_FAILED;
  let bestError = 'Decoding failed';
  let bestErrorsCorrected = 0;

  for (const level of eccLevelsToTry) {
    const eccLen = ECC_LENGTHS[level];
    if (rawBytes.length <= eccLen) continue;

    const candidateBuffers: Uint8Array[] = [rawBytes];

    // If rawBytes has uncorrupted header, also test exact sliced length
    if (
      rawBytes[0] === RQR_MAGIC[0] &&
      rawBytes[1] === RQR_MAGIC[1] &&
      rawBytes[2] === RQR_MAGIC[2] &&
      rawBytes[3] === RQR_MAGIC[3]
    ) {
      const explicitPayloadLen = (rawBytes[10] << 8) | rawBytes[11];
      const explicitCodewordLen = 12 + explicitPayloadLen + 4 + eccLen;
      if (explicitCodewordLen > eccLen && explicitCodewordLen < rawBytes.length) {
        candidateBuffers.push(rawBytes.slice(0, explicitCodewordLen));
      }
    }

    for (const buf of candidateBuffers) {
      const rsResult = decodeRS(buf, eccLen);
      if (!rsResult.success) {
        bestStatus = RqrDiagnosticStatus.ERROR_CORRECTION_FAILED;
        bestError = 'Reed-Solomon error correction failed (exceeded correctable error budget)';
        continue;
      }

      const data = rsResult.data;
      if (data.length < 16) continue;

      // Check magic signature "RQR1"
      if (
        data[0] !== RQR_MAGIC[0] ||
        data[1] !== RQR_MAGIC[1] ||
        data[2] !== RQR_MAGIC[2] ||
        data[3] !== RQR_MAGIC[3]
      ) {
        bestStatus = RqrDiagnosticStatus.STRUCTURAL_MARKER_ERROR;
        bestError = 'RQR1 signature magic header invalid';
        continue;
      }

      const version = data[4];
      const payloadType = data[5] as PayloadType;
      const ringCount = data[6];
      const sectorCount = data[7];
      const maskPattern = data[8];
      const decodedEcc = data[9] as EccLevel;
      const payloadLen = (data[10] << 8) | data[11];

      const expectedTotalLen = 12 + payloadLen + 4; // header + payload + CRC
      if (data.length < expectedTotalLen) {
        bestStatus = RqrDiagnosticStatus.INSUFFICIENT_CAPACITY;
        bestError = `Data length (${data.length} bytes) shorter than payload requirement (${expectedTotalLen} bytes)`;
        continue;
      }

      // Verify CRC32
      const unchecksummed = data.slice(0, 12 + payloadLen);
      const computedCrc = computeCRC32(unchecksummed);
      const storedCrc = bytesToCRC32(data, 12 + payloadLen);

      if (computedCrc !== storedCrc) {
        bestStatus = RqrDiagnosticStatus.CHECKSUM_FAILED;
        bestError = `CRC32 checksum mismatch (computed: 0x${computedCrc.toString(16)}, stored: 0x${storedCrc.toString(16)})`;
        bestErrorsCorrected = rsResult.errorsCorrected;
        continue;
      }

      // Decode UTF-8 payload
      const decoder = new TextDecoder('utf-8');
      const payloadStr = decoder.decode(data.slice(12, 12 + payloadLen));

      return {
        success: true,
        packet: {
          header: {
            version,
            payloadType,
            ringCount,
            sectorCount,
            maskPattern,
            eccLevel: decodedEcc,
            payloadLength: payloadLen,
          },
          payload: payloadStr,
          crc32: storedCrc,
        },
        errorsCorrected: rsResult.errorsCorrected,
        status: RqrDiagnosticStatus.VALIDATED,
      };
    }
  }

  return {
    success: false,
    errorsCorrected: bestErrorsCorrected,
    status: bestStatus,
    errorReason: bestError,
  };
}

