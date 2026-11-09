/**
 * Automated test suite for RADIAL QR core algorithms.
 * Uses node:test and node:assert/strict.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCRC32, crc32ToBytes, bytesToCRC32 } from './crc32';
import { encodeRS, decodeRS, gfAdd, gfMul, gfDiv } from './reedsolomon';
import { encodeRqrPacket, decodeRqrCodeword, PayloadType, EccLevel } from './rqrProtocol';
import {
  buildRadialMatrix,
  extractBitsFromRadialMatrix,
  calculateGridCapacity,
  getRecommendedGridDimensions,
  DEFAULT_GRID_CONFIG,
} from './radialGeometry';


test('CRC32 computation & roundtrip byte conversion', () => {
  const encoder = new TextEncoder();
  const testData = encoder.encode('RADIAL_QR_PROTOCOL_V1_TEST_VECTOR');
  const crc1 = computeCRC32(testData);
  assert.ok(typeof crc1 === 'number');
  assert.ok(crc1 > 0);

  // Roundtrip conversion
  const bytes = crc32ToBytes(crc1);
  assert.equal(bytes.length, 4);
  const crc2 = bytesToCRC32(bytes);
  assert.equal(crc1, crc2);

  // Deterministic value for "123456789"
  const standardTest = encoder.encode('123456789');
  assert.equal(computeCRC32(standardTest), 0xCBF43926);
});

test('Galois Field GF(256) basic arithmetic', () => {
  assert.equal(gfAdd(5, 5), 0);
  assert.equal(gfAdd(10, 4), 14);
  assert.equal(gfMul(0, 50), 0);
  assert.equal(gfMul(1, 42), 42);

  // Multiplication and division inverse
  const a = 123;
  const b = 45;
  const prod = gfMul(a, b);
  assert.equal(gfDiv(prod, b), a);
});

test('Reed-Solomon encode and clean decode', () => {
  const message = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const eccLen = 8; // can correct up to 4 byte errors

  const encoded = encodeRS(message, eccLen);
  assert.equal(encoded.length, message.length + eccLen);

  // Decode without corruption
  const result = decodeRS(encoded, eccLen);
  assert.equal(result.success, true);
  assert.equal(result.errorsCorrected, 0);
  assert.deepEqual(result.data, message);
});

test('Reed-Solomon corrects up to t errors', () => {
  const message = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const eccLen = 8; // corrects up to 4 corrupted bytes

  const encoded = encodeRS(message, eccLen);

  // Corrupt 3 random byte positions
  const corrupted = new Uint8Array(encoded);
  corrupted[1] ^= 0x5A;
  corrupted[4] ^= 0x3C;
  corrupted[7] ^= 0xF0;

  const result = decodeRS(corrupted, eccLen);
  assert.equal(result.success, true);
  assert.equal(result.errorsCorrected, 3);
  assert.deepEqual(result.data, message);
});

test('RQR1 packet serialization, integrity and roundtrip decoding', () => {
  const testPayload = 'https://radialqr.art/decode?ref=geometric';
  const { codeword, bits, packet } = encodeRqrPacket(testPayload, PayloadType.URL, {
    ringCount: 16,
    sectorCount: 48,
    eccLevel: EccLevel.MEDIUM,
  });

  assert.ok(codeword.length > 0);
  assert.equal(bits.length, codeword.length * 8);
  assert.equal(packet.payload, testPayload);

  // Direct decode without noise
  const decoded = decodeRqrCodeword(codeword, EccLevel.MEDIUM);
  assert.equal(decoded.success, true);
  assert.equal(decoded.packet?.payload, testPayload);
  assert.equal(decoded.packet?.header.payloadType, PayloadType.URL);
});

test('End-to-end radial grid bit mapping and unmasking', () => {
  const payload = 'WIFI:S:RadialStudio;T:WPA;P:Geometric2026;;';
  const { bits, codeword } = encodeRqrPacket(payload, PayloadType.WIFI, {
    ringCount: 16,
    sectorCount: 48,
    maskPattern: 0,
  });

  const matrixResult = buildRadialMatrix(bits, {
    ...DEFAULT_GRID_CONFIG,
    maskPattern: 0,
  });

  assert.ok(matrixResult.totalDataCapacity >= bits.length);

  // Extract bits from matrix
  const extractedBytes = extractBitsFromRadialMatrix(matrixResult.cells, {
    ...DEFAULT_GRID_CONFIG,
    maskPattern: 0,
  });

  const decodeResult = decodeRqrCodeword(extractedBytes);
  assert.equal(decodeResult.success, true);
  assert.equal(decodeResult.packet?.payload, payload);
});

test('Dynamic capacity calculation & tier recommendation for large payloads', () => {
  const shortText = 'https://radialqr.art';
  const shortRec = getRecommendedGridDimensions(new TextEncoder().encode(shortText).length + 28);
  assert.equal(shortRec.ringCount, 14);
  assert.equal(shortRec.sectorCount, 44);

  const longText = 'Enter the Labyrinth: Geometric data unlocked through radial coordinates.';
  const longRec = getRecommendedGridDimensions(new TextEncoder().encode(longText).length + 28);
  assert.ok(longRec.ringCount >= 18);
  assert.ok(longRec.maxBytes >= 96);

  const vCardPayload = 'BEGIN:VCARD\nVERSION:3.0\nN:Rostova;Elena\nORG:Prism Dynamics\nTEL:+15550199\nEMAIL:elena@radialqr.art\nEND:VCARD';
  const vCardRec = getRecommendedGridDimensions(new TextEncoder().encode(vCardPayload).length + 28);
  assert.ok(vCardRec.ringCount >= 20);
  assert.ok(vCardRec.maxBytes >= 130);

  const capacity = calculateGridCapacity(vCardRec.ringCount, vCardRec.sectorCount);
  assert.ok(capacity.dataBytes >= vCardRec.maxBytes);
});

test('All 6 design families preserve deterministic RQR1 data coordinates', () => {
  const testPayload = 'https://radialqr.art/gallery/all-six-families';
  const families = [
    'radial-angular',
    'spiral-flow',
    'circular-labyrinth',
    'circuit-matrix',
    'concentric-rings',
    'abstract-hybrid',
  ] as const;

  const { bits, packet } = encodeRqrPacket(testPayload, PayloadType.URL, {
    ringCount: 16,
    sectorCount: 48,
    eccLevel: EccLevel.MEDIUM,
  });

  for (const family of families) {
    const spiralFactor = family === 'spiral-flow' ? 0.8 : 0;
    const config = {
      ...DEFAULT_GRID_CONFIG,
      ringCount: 16,
      sectorCount: 48,
      spiralFactor,
    };

    const matrix = buildRadialMatrix(bits, config);
    assert.equal(matrix.hasOverflow, false);

    // Verify structural markers remain solid and unshifted
    for (let s = 0; s < 48; s++) {
      assert.equal(matrix.cells[0][s].type, 'CLOCK');
      assert.equal(matrix.cells[15][s].type, 'BOUNDARY');
    }

    // Verify bits extract and decode back to exact payload
    const extractedBytes = extractBitsFromRadialMatrix(matrix.cells, config);
    const decoded = decodeRqrCodeword(extractedBytes);

    assert.equal(decoded.success, true, `Decoding failed for family: ${family}`);
    assert.equal(decoded.packet?.payload, testPayload, `Payload mismatch for family: ${family}`);
  }
});

