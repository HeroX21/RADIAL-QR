# RADIAL QR

> **Decode Beyond the Square**  
> Next-Generation Artistic QR Generation Engine & Custom Radial Code Scanner

RADIAL QR transcends the traditional square matrix paradigm of conventional 2D barcodes. It introduces a proprietary polar data encoding standard (**RQR1**) featuring dense concentric radial segments, angular data sectors, spiral arrangements, and real Galois Field GF(256) Reed–Solomon error correction—while simultaneously providing an artistic **Universal QR** engine with 100% standard smartphone camera compatibility.

---

## 1. Core Architecture & Application Modes

RADIAL QR maintains two completely independent, uncompromised encoding and decoding pipelines:

### Mode A: Universal QR (ISO/IEC 18004)
- **Compatibility**: 100% compatible with native iOS Camera, Android Google Lens, and all standard barcode readers.
- **Matrix Geometry**: Standard square QR matrix with finder patterns, timing patterns, alignment patterns, and quiet zones.
- **Artistic Customization**: Module shapes (Rounded, Dots, Diamonds, Fluid, Circuit), custom finder styles, linear/radial color gradients, custom background, and center logo.
- **Automatic Decode Validation**: Pre-export verification using `jsQR` ensures generated artwork is 100% decodable by standard readers.

### Mode B: Radial QR (Proprietary RQR1 Protocol)
- **Compatibility**: Decoded exclusively by the RADIAL QR multi-stage computer vision scanner.
- **Geometry**: Concentric circular rings ($N_{rings}$), angular sectors ($N_{sectors}$), and Archimedean spirals mapped via polar coordinate equations:
  $$x = c_x + r \cdot \cos(\theta), \quad y = c_y + r \cdot \sin(\theta)$$
- **Orientation Invariance**: Asymmetric fiducial marker enables $0^\circ \dots 360^\circ$ arbitrary rotation detection.
- **Clock Track**: Alternating-bit inner synchronization track provides exact sector calibration.
- **Integrity & Correction**: 32-bit IEEE 802.3 CRC32 checksum combined with Reed–Solomon error correction over GF(256).

---

## 2. Six Proprietary Radial Design Families

1. **Radial Angular**: Reference-inspired high-contrast concentric angular segments and crisp radial gaps.
2. **Spiral Flow**: Archimedean spiral data tracks with logarithmic and linear angular sweeps.
3. **Circular Labyrinth**: Maze-like interconnected radial corridors and orthogonal connecting bridges.
4. **Circuit Matrix**: Futuristic electronic PCB traces, terminal via pads, and radial trace junctions.
5. **Concentric Rings**: Layered continuous and segmented circular arc bands.
6. **Abstract Hybrid**: Faceted diamond polygons, multifaceted angular wedges, and experimental geometry.

---

## 3. RQR1 Packet Specification

| Byte Offset | Field | Type | Description |
|---|---|---|---|
| `0x00 .. 0x03` | Magic Signature | ASCII[4] | Fixed `"RQR1"` (`0x52`, `0x51`, `0x52`, `0x31`) |
| `0x04` | Protocol Version | Uint8 | Version index (`0x01`) |
| `0x05` | Payload Type | Uint8 | `0`:URL, `1`:TEXT, `2`:WIFI, `3`:CONTACT, `4`:EMAIL, `5`:PHONE, `6`:SMS, `7`:UPI |
| `0x06` | Ring Count | Uint8 | Number of concentric data tracks (12..24) |
| `0x07` | Sector Count | Uint8 | Number of angular sectors (36..72) |
| `0x08` | Mask Pattern | Uint8 | Reversible XOR mask index (`0..3`) |
| `0x09` | ECC Level | Uint8 | `0`:Low (8B), `1`:Med (12B), `2`:Quart (16B), `3`:High (24B) |
| `0x0A .. 0x0B` | Payload Length | Uint16 (BE) | Byte length of the UTF-8 payload ($N$) |
| `0x0C .. 0x0C+N` | Payload Bytes | Byte[$N$] | Raw UTF-8 payload |
| `0x0C+N .. End` | CRC32 Checksum | Uint32 (BE) | IEEE 802.3 CRC32 over magic + header + payload |

### Galois Field GF(256) Error Correction
- Primitive Polynomial: $p(x) = x^8 + x^4 + x^3 + x^2 + 1$ (`0x11D` / 285)
- Generator Polynomial: $g(x) = \prod_{i=0}^{2t-1} (x - \alpha^i)$
- Syndrome calculation, Berlekamp–Massey discrepancy resolution, Chien root search, and Forney algorithm error magnitude evaluation.

---

## 4. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion.
- **Graphics Engine**: HTML5 Canvas 2D, genuine polar vector SVG (`<path>` arcs), jsPDF.
- **Decoding Engines**: `jsqr` (ISO QR) + Custom Computer Vision RQR1 Decoder (grayscale, Otsu thresholding, centroid calculation, spoke profiling, polar resampling).
- **Backend**: Node.js, Express, TypeScript, full REST API (`server.ts`).
- **Testing**: Node built-in test runner (`node:test`, `node:assert/strict`) via `tsx`.

---

## 5. Local Development & Installation

### Prerequisites
- Node.js >= 18.0.0
- npm or bun

### Setup
```bash
# Clone the repository
git clone <repo-url>
cd radial-qr

# Install dependencies
npm install

# Run automated unit tests
npm test

# Start full-stack development server (Express API + Vite Dev Server on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 6. Production Build & Deployment

```bash
# Build production client bundles
npm run build

# Start production Express server
npm start
```

---

## 7. MongoDB Schemas (Optional Cloud Persistence)

For multi-user cloud synchronization, the Express backend integrates with MongoDB via the following document schemas:

```typescript
// User Schema
interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'creator' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Design Schema
interface DesignDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  codeType: 'radial' | 'standard';
  contentType: 'url' | 'text' | 'wifi' | 'contact' | 'email' | 'phone' | 'sms' | 'upi';
  payload: string;
  config: {
    family?: string;
    ringCount?: number;
    sectorCount?: number;
    fgColor: string;
    fgColorEnd?: string;
    bgColor: string;
    moduleShape: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Scan History Schema (Opt-in)
interface ScanHistoryDocument {
  _id: ObjectId;
  userId?: ObjectId;
  format: 'standard' | 'radial';
  payload: string;
  kind: string;
  confidence: number;
  errorsCorrected: number;
  timestamp: Date;
}
```

---

## 8. License & Attribution

Apache-2.0 License. Built with RADIAL QR Geometric Computing Engine.
