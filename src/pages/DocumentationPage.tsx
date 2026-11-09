/**
 * RQR1 Protocol Specification & Technical Documentation.
 * Interactive documentation explaining packet framing, GF(256) Reed-Solomon,
 * polar mathematics, computer vision recovery, and REST API curls.
 */

import React, { useState } from 'react';
import { FileCode2, Binary, Cpu, ShieldCheck, Terminal, Layers, Compass, Check } from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'protocol' | 'math' | 'vision' | 'api'>('protocol');

  return (
    <div className="flex-1 bg-[#090B10] p-6 lg:p-10 max-w-5xl mx-auto w-full select-none text-slate-300">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121722] border border-[#1B2330] text-xs text-slate-400 mb-3">
          <span className="text-[#00C8FF] font-semibold">RQR1 PROTOCOL SPECIFICATION</span>
          <span>·</span>
          <span>Version 1.0</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Engineering & Algorithmic Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl">
          Complete mathematical and architectural reference for the RADIAL QR proprietary polar data standard and dual-mode pipeline.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1B2330] mb-8 pb-1">
        {[
          { id: 'protocol', label: '1. RQR1 Packet Format', icon: Binary },
          { id: 'math', label: '2. GF(256) & Polar Math', icon: Cpu },
          { id: 'vision', label: '3. Computer Vision Pipeline', icon: Compass },
          { id: 'api', label: '4. REST API Spec', icon: Terminal },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === id
                ? 'bg-[#121722] text-[#00C8FF] border border-[#00C8FF]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: RQR1 PACKET FORMAT */}
      {activeTab === 'protocol' && (
        <div className="space-y-8 text-sm">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <h2 className="text-base font-bold text-white mb-3">Packet Header Byte Specification</h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Every RQR1 symbol begins with an explicit 12-byte header followed by variable-length UTF-8 payload bytes and a 4-byte IEEE 802.3 CRC32 checksum.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1B2330] text-slate-400">
                    <th className="pb-2">Byte Range</th>
                    <th className="pb-2">Field Name</th>
                    <th className="pb-2">Data Type</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2330] text-slate-300">
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x00 .. 0x03</td>
                    <td className="font-bold">Magic Signature</td>
                    <td>ASCII [4]</td>
                    <td>Fixed &quot;RQR1&quot; (0x52, 0x51, 0x52, 0x31)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x04</td>
                    <td className="font-bold">Version</td>
                    <td>Uint8</td>
                    <td>Protocol version index (0x01)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x05</td>
                    <td className="font-bold">Payload Type</td>
                    <td>Uint8</td>
                    <td>0:URL, 1:TEXT, 2:WIFI, 3:CONTACT, 4:EMAIL, 5:PHONE, 6:SMS, 7:UPI</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x06</td>
                    <td className="font-bold">Ring Count</td>
                    <td>Uint8</td>
                    <td>Number of concentric data tracks (12..24)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x07</td>
                    <td className="font-bold">Sector Count</td>
                    <td>Uint8</td>
                    <td>Angular subdivisions per ring (36..72)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x08</td>
                    <td className="font-bold">Mask Pattern</td>
                    <td>Uint8</td>
                    <td>Reversible XOR pattern index (0..3)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x09</td>
                    <td className="font-bold">ECC Level</td>
                    <td>Uint8</td>
                    <td>0:Low (8B), 1:Med (12B), 2:Quart (16B), 3:High (24B)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#00C8FF]">0x0A .. 0x0B</td>
                    <td className="font-bold">Payload Length</td>
                    <td>Uint16 (BE)</td>
                    <td>Byte count of the UTF-8 payload (N)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-emerald-400">0x0C .. 0x0C+N</td>
                    <td className="font-bold">Payload Bytes</td>
                    <td>Byte[N]</td>
                    <td>Raw UTF-8 encoded text or URI string</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-amber-400">0x0C+N .. End</td>
                    <td className="font-bold">CRC32 Checksum</td>
                    <td>Uint32 (BE)</td>
                    <td>Standard IEEE 802.3 32-bit polynomial hash</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATH SPECIFICATION */}
      {activeTab === 'math' && (
        <div className="space-y-8 text-sm">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <h2 className="text-base font-bold text-white mb-3">Galois Field GF(256) Reed-Solomon Arithmetic</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Data protection is calculated over Galois Field GF(2⁸) using the primitive polynomial:
            </p>

            <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330] font-mono text-xs text-[#00C8FF] mb-6">
              p(x) = x⁸ + x⁴ + x³ + x² + 1 &nbsp; (0x11D / 285)
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Generator polynomial for error correction capacity <code className="text-white font-mono">t</code> (where <code className="text-white font-mono">2t = eccLen</code>):
            </p>

            <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330] font-mono text-xs text-slate-300 mb-6">
              g(x) = ∏(x - αⁱ) &nbsp; for i = 0 to eccLen - 1
            </div>

            <h3 className="text-sm font-bold text-white mb-2">Polar Coordinate Projection</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Cell centers are transformed from discrete indices (ring <code className="text-white">r</code>, sector <code className="text-white">s</code>) into Cartesian canvas pixels:
            </p>

            <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330] font-mono text-xs text-emerald-400 leading-relaxed">
              r_radius = R_in + (r + 0.5) × ((R_out - R_in) / N_rings)<br />
              θ = s × (2π / N_sectors) - π/2 + θ_rotation<br />
              x = c_x + r_radius × cos(θ)<br />
              y = c_y + r_radius × sin(θ)
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPUTER VISION PIPELINE */}
      {activeTab === 'vision' && (
        <div className="space-y-8 text-sm">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <h2 className="text-base font-bold text-white mb-4">Independent Computer Vision Decoding Pipeline</h2>

            <ol className="space-y-4 text-xs leading-relaxed text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#1B2330] text-[#00C8FF] flex items-center justify-center font-mono font-bold shrink-0">1</span>
                <div>
                  <strong className="text-white">Luminance & Otsu Thresholding:</strong>
                  <p className="text-slate-400 mt-0.5">Converts camera frame pixels to grayscale using Rec. 601 coefficients (0.299R + 0.587G + 0.114B) and computes local adaptive threshold.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#1B2330] text-[#00C8FF] flex items-center justify-center font-mono font-bold shrink-0">2</span>
                <div>
                  <strong className="text-white">Central Anchor Centroid Detection:</strong>
                  <p className="text-slate-400 mt-0.5">Scans orthogonal axes to detect the concentric circular anchor disk and calculates exact centroid (cx, cy).</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#1B2330] text-[#00C8FF] flex items-center justify-center font-mono font-bold shrink-0">3</span>
                <div>
                  <strong className="text-white">Asymmetric Fiducial Angular Scanning:</strong>
                  <p className="text-slate-400 mt-0.5">Computes angular intensity convolution across 360° along the fiducial ring track to discover rotation angle θ₀ with 0.5° precision.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#1B2330] text-[#00C8FF] flex items-center justify-center font-mono font-bold shrink-0">4</span>
                <div>
                  <strong className="text-white">Anti-Aliased Polar Resampling:</strong>
                  <p className="text-slate-400 mt-0.5">Samples each logical polar cell with a 5-point cross kernel to eliminate camera pixel noise.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#1B2330] text-[#00C8FF] flex items-center justify-center font-mono font-bold shrink-0">5</span>
                <div>
                  <strong className="text-white">Syndrome Calculation & Berlekamp-Massey:</strong>
                  <p className="text-slate-400 mt-0.5">Locates corrupted angular sectors, computes Forney error magnitudes, and verifies 32-bit CRC32 checksum before returning the payload.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* TAB 4: REST API */}
      {activeTab === 'api' && (
        <div className="space-y-6 text-sm">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <h2 className="text-base font-bold text-white mb-2">Backend REST API Reference</h2>
            <p className="text-xs text-slate-400 mb-6">
              The built-in Express server exposes standard endpoints for authentication, design storage and templates.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330]">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                  <span className="text-white">/api/health</span>
                </div>
                <p className="text-xs text-slate-400">Check server runtime status and engine health.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330]">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">GET</span>
                  <span className="text-white">/api/designs</span>
                </div>
                <p className="text-xs text-slate-400">Retrieve all cloud-synchronized designs for the authenticated user.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090B10] border border-[#1B2330]">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">POST</span>
                  <span className="text-white">/api/designs</span>
                </div>
                <p className="text-xs text-slate-400">Save a new design configuration and payload.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
