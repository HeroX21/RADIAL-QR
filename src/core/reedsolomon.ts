/**
 * Reed-Solomon Error Correction over GF(256).
 * Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11D / 285).
 * Primitive element: alpha = 2.
 */

const PRIMITIVE_POLY = 0x11D;
const FIELD_SIZE = 256;

// Precompute log and antilog (exp) tables
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(FIELD_SIZE);

let x = 1;
for (let i = 0; i < 255; i++) {
  EXP_TABLE[i] = x;
  EXP_TABLE[i + 255] = x;
  LOG_TABLE[x] = i;
  x <<= 1;
  if (x & 0x100) {
    x ^= PRIMITIVE_POLY;
  }
}
LOG_TABLE[0] = 0; // log(0) is undefined, conventionally mapped to 0

export function gfAdd(a: number, b: number): number {
  return a ^ b;
}

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error("GF(256) division by zero");
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] - LOG_TABLE[b] + 255) % 255];
}

export function gfInv(a: number): number {
  if (a === 0) throw new Error("GF(256) inverse of zero");
  return EXP_TABLE[255 - LOG_TABLE[a]];
}

/**
 * Multiply two polynomials over GF(256)
 */
export function polyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
  const result = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      result[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return result;
}

/**
 * Generate RS generator polynomial: g(x) = (x - alpha^0)(x - alpha^1)...(x - alpha^(eccLen-1))
 */
const generatorCache = new Map<number, Uint8Array<any>>();

export function getGeneratorPoly(eccLen: number): Uint8Array {
  if (generatorCache.has(eccLen)) {
    return generatorCache.get(eccLen)!;
  }
  let g: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < eccLen; i++) {
    // (x - alpha^i) in GF(256) is [1, EXP_TABLE[i]]
    const factor = new Uint8Array([1, EXP_TABLE[i]]);
    g = polyMul(g, factor);
  }
  generatorCache.set(eccLen, g);
  return g;
}

/**
 * Encode message with Reed-Solomon parity bytes.
 * Returns Uint8Array of length: message.length + eccLen
 */
export function encodeRS(data: Uint8Array, eccLen: number): Uint8Array {
  if (eccLen <= 0) return new Uint8Array(data);
  const gen = getGeneratorPoly(eccLen);
  const out = new Uint8Array(data.length + eccLen);
  out.set(data, 0);

  // Remainder calculation via polynomial division
  const remainder = new Uint8Array(eccLen);
  for (let i = 0; i < data.length; i++) {
    const feedback = data[i] ^ remainder[0];
    for (let j = 0; j < eccLen - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], feedback);
    }
    remainder[eccLen - 1] = gfMul(gen[eccLen], feedback);
  }

  out.set(remainder, data.length);
  return out;
}

/**
 * Decode and correct Reed-Solomon codeword.
 * Input codeword has length: dataLen + eccLen
 */
export function decodeRS(
  received: Uint8Array,
  eccLen: number
): { success: boolean; data: Uint8Array; errorsCorrected: number } {
  const n = received.length;
  const k = n - eccLen;
  if (k <= 0) {
    return { success: false, data: new Uint8Array(0), errorsCorrected: 0 };
  }

  // 1. Calculate syndromes S_0 ... S_(eccLen-1)
  const syndromes = new Uint8Array(eccLen);
  let hasError = false;
  for (let i = 0; i < eccLen; i++) {
    const alpha_i = EXP_TABLE[i];
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum = received[j] ^ gfMul(sum, alpha_i);
    }
    syndromes[i] = sum;
    if (sum !== 0) hasError = true;
  }

  // If no error, return original data
  if (!hasError) {
    return {
      success: true,
      data: received.slice(0, k),
      errorsCorrected: 0,
    };
  }

  // 2. Berlekamp-Massey Algorithm to find error locator polynomial Lambda(x)
  let lambda = new Uint8Array([1]); // C(x)
  let b = new Uint8Array([1]);      // B(x)
  let l = 0;                        // current degree
  let m = 1;

  for (let r = 0; r < eccLen; r++) {
    // Calculate discrepancy delta
    let delta = syndromes[r];
    for (let i = 1; i < lambda.length; i++) {
      if (r - i >= 0) {
        delta ^= gfMul(lambda[i], syndromes[r - i]);
      }
    }

    if (delta === 0) {
      m++;
    } else {
      const prevLambda = new Uint8Array(lambda);
      // scale B by delta
      const scaledB = new Uint8Array(b.length + m);
      for (let i = 0; i < b.length; i++) {
        scaledB[i + m] = gfMul(b[i], delta);
      }

      // lambda = lambda - (delta * x^m * B)
      const maxLen = Math.max(lambda.length, scaledB.length);
      const newLambda = new Uint8Array(maxLen);
      for (let i = 0; i < lambda.length; i++) newLambda[i] ^= lambda[i];
      for (let i = 0; i < scaledB.length; i++) newLambda[i] ^= scaledB[i];
      lambda = newLambda;

      if (2 * l <= r) {
        l = r + 1 - l;
        // b = prevLambda / delta
        const invDelta = gfInv(delta);
        b = new Uint8Array(prevLambda.length);
        for (let i = 0; i < prevLambda.length; i++) {
          b[i] = gfMul(prevLambda[i], invDelta);
        }
        m = 1;
      } else {
        m++;
      }
    }
  }

  // Trim trailing zeros from lambda
  let lambdaDeg = lambda.length - 1;
  while (lambdaDeg > 0 && lambda[lambdaDeg] === 0) lambdaDeg--;
  lambda = lambda.slice(0, lambdaDeg + 1);

  // Maximum correctable errors is floor(eccLen / 2)
  if (lambdaDeg > Math.floor(eccLen / 2)) {
    return { success: false, data: received.slice(0, k), errorsCorrected: 0 };
  }

  // 3. Chien Search to find roots of Lambda(x)
  const errorPositions: number[] = [];
  for (let i = 0; i < n; i++) {
    // evaluate lambda at alpha^(-i) = alpha^(255 - i)
    const xi = EXP_TABLE[(255 - i) % 255];
    let sum = 0;
    let xpow = 1;
    for (let j = 0; j < lambda.length; j++) {
      sum ^= gfMul(lambda[j], xpow);
      xpow = gfMul(xpow, xi);
    }
    if (sum === 0) {
      // root found! The error position from left (0 to n-1) is i
      errorPositions.push(n - 1 - i);
    }
  }

  if (errorPositions.length !== lambdaDeg) {
    // Number of roots does not match degree -> uncorrectable error
    return { success: false, data: received.slice(0, k), errorsCorrected: 0 };
  }

  // 4. Forney Algorithm to compute error magnitudes
  // Omega(x) = [Syndromes(x) * Lambda(x)] mod x^eccLen
  const synPoly = new Uint8Array(syndromes);
  const fullOmega = polyMul(synPoly, lambda);
  const omega = fullOmega.slice(0, eccLen);

  // Derivative of Lambda: Lambda'(x) (formal derivative in GF(2) odd powers only)
  const corrected = new Uint8Array(received);
  for (let idx = 0; idx < errorPositions.length; idx++) {
    const pos = errorPositions[idx];
    const X = EXP_TABLE[(n - 1 - pos) % 255]; // root inverse
    const invX = gfInv(X);

    // Evaluate Omega(X^-1)
    let omegaVal = 0;
    let p = 1;
    for (let j = 0; j < omega.length; j++) {
      omegaVal ^= gfMul(omega[j], p);
      p = gfMul(p, invX);
    }

    // Evaluate Lambda'(X^-1)
    let lambdaPrimeVal = 0;
    p = 1;
    for (let j = 1; j < lambda.length; j += 2) {
      // In char 2, derivative has non-zero coefficients only at odd powers
      lambdaPrimeVal ^= gfMul(lambda[j], p);
      p = gfMul(p, gfMul(invX, invX));
    }

    if (lambdaPrimeVal === 0) {
      return { success: false, data: received.slice(0, k), errorsCorrected: 0 };
    }

    // Error magnitude Y_k = X * Omega(X^-1) / Lambda'(X^-1)
    const magnitude = gfMul(X, gfDiv(omegaVal, lambdaPrimeVal));
    corrected[pos] ^= magnitude;
  }

  return {
    success: true,
    data: corrected.slice(0, k),
    errorsCorrected: errorPositions.length,
  };
}
