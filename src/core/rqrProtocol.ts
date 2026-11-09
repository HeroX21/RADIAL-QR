/**
 * RQR1: Radial QR Protocol Specification Version 1.
 * Provides deterministic serialization, packet encapsulation,
 * CRC32 verification and Reed-Solomon codeword framing.
 */

import { computeCRC32, crc32ToBytes, bytesToCRC32 } from './crc32';
import { encodeRS, decodeRS } from './reedsolomon';

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
  } = {}
): RqrEncodedResult & { codeword: Uint8Array } {
  const version = RQR_VERSION;
  const ringCount = options.ringCount ?? 16;
  const sectorCount = options.sectorCount ?? 48;
  const maskPattern = options.maskPattern ?? 0;
  const eccLevel = options.eccLevel ?? EccLevel.MEDIUM;
  const eccLen = ECC_LENGTHS[eccLevel];

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

  // Raw data packet = unchecksummed + 4 bytes CRC
  const rawPacket = new Uint8Array(unchecksummedLen + 4);
  rawPacket.set(unchecksummed, 0);
  rawPacket.set(crcBytes, unchecksummedLen);

  // Protect raw packet with Reed-Solomon codewords
  // If packet is large, we interleave across blocks of max size (e.g. 110 data bytes)
  const maxBlockData = 100;
  let codeword: Uint8Array;

  if (rawPacket.length <= maxBlockData) {
    // Single block
    codeword = encodeRS(rawPacket, eccLen);
  } else {
    // Multi-block interleaving
    const numBlocks = Math.ceil(rawPacket.length / maxBlockData);
    const blocks: Uint8Array[] = [];
    const blockEcc: Uint8Array[] = [];

    for (let b = 0; b < numBlocks; b++) {
      const start = b * maxBlockData;
      const end = Math.min(rawPacket.length, (b + 1) * maxBlockData);
      const chunk = rawPacket.slice(start, end);
      const encodedChunk = encodeRS(chunk, eccLen);
      blocks.push(chunk);
      blockEcc.push(encodedChunk.slice(chunk.length));
    }

    // Interleave data bytes, then interleave ECC bytes
    const totalLen = rawPacket.length + numBlocks * eccLen;
    codeword = new Uint8Array(totalLen);
    let outIdx = 0;

    // Interleave data
    const maxDataLen = Math.max(...blocks.map((b) => b.length));
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        if (i < blocks[b].length) {
          codeword[outIdx++] = blocks[b][i];
        }
      }
    }

    // Interleave ECC
    for (let i = 0; i < eccLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        codeword[outIdx++] = blockEcc[b][i];
      }
    }
  }

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
  };
}

/**
 * Decode an RQR1 bit stream / codeword back to verified packet
 */
export function decodeRqrCodeword(
  rawBytes: Uint8Array,
  expectedEccLevel?: EccLevel
): { success: boolean; packet?: RqrPacket; errorsCorrected: number; errorReason?: string } {
  if (rawBytes.length < 16) {
    return { success: false, errorsCorrected: 0, errorReason: "Data too short for RQR header" };
  }

  // We check ECC lengths starting from candidate level or try standard levels
  const eccLevelsToTry = expectedEccLevel !== undefined
    ? [expectedEccLevel]
    : [EccLevel.MEDIUM, EccLevel.LOW, EccLevel.QUARTILE, EccLevel.HIGH];

  let bestResult: { success: boolean; packet?: RqrPacket; errorsCorrected: number; errorReason?: string } = {
    success: false,
    errorsCorrected: 0,
    errorReason: "Decoding failed",
  };

  for (const level of eccLevelsToTry) {
    const eccLen = ECC_LENGTHS[level];
    if (rawBytes.length <= eccLen) continue;

    // Single block RS decode attempt
    const rsResult = decodeRS(rawBytes, eccLen);
    if (!rsResult.success) continue;

    const data = rsResult.data;
    if (data.length < 16) continue;

    // Check magic signature "RQR1"
    if (
      data[0] !== RQR_MAGIC[0] ||
      data[1] !== RQR_MAGIC[1] ||
      data[2] !== RQR_MAGIC[2] ||
      data[3] !== RQR_MAGIC[3]
    ) {
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
      continue;
    }

    // Verify CRC32
    const unchecksummed = data.slice(0, 12 + payloadLen);
    const computedCrc = computeCRC32(unchecksummed);
    const storedCrc = bytesToCRC32(data, 12 + payloadLen);

    if (computedCrc !== storedCrc) {
      // CRC mismatch
      bestResult = {
        success: false,
        errorsCorrected: rsResult.errorsCorrected,
        errorReason: `CRC32 checksum mismatch (computed: 0x${computedCrc.toString(16)}, stored: 0x${storedCrc.toString(16)})`,
      };
      continue;
    }

    // Decode UTF-8 payload
    const decoder = new TextDecoder("utf-8");
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
    };
  }

  return bestResult;
}
