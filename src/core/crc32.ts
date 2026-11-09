/**
 * IEEE 802.3 CRC32 calculation table and utility.
 * Standard polynomial: 0xEDB88320 (reversed).
 */

const CRC_TABLE = new Uint32Array(256);

// Precompute CRC32 lookup table
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

export function computeCRC32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    const tableIndex = (crc ^ data[i]) & 0xFF;
    crc = (crc >>> 8) ^ CRC_TABLE[tableIndex];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function crc32ToBytes(crc: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = (crc >>> 24) & 0xFF;
  bytes[1] = (crc >>> 16) & 0xFF;
  bytes[2] = (crc >>> 8) & 0xFF;
  bytes[3] = crc & 0xFF;
  return bytes;
}

export function bytesToCRC32(bytes: Uint8Array, offset = 0): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}
