/**
 * Home Page: Hero with animated radial geometry, 6 design families showcase,
 * compatibility breakdown, technology architecture and quick actions.
 */

import React from 'react';
import { PageView } from '../components/Navbar';
import { AnimatedRadialBackground } from '../components/AnimatedRadialBackground';
import {
  QrCode,
  ScanLine,
  LayoutGrid,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { STARTER_TEMPLATES } from '../data/templates';
import { DesignFamily } from '../core/radialRenderer';

interface HomePageProps {
  onNavigate: (page: PageView) => void;
  onSelectTemplate: (templateId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectTemplate }) => {
  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-28 px-6 border-b border-[#1B2330]">
        <AnimatedRadialBackground />

        <div className="relative max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Subtle unboxed badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121722] border border-[#1B2330] text-xs text-slate-300 mb-6 shadow-sm">
            <span className="text-[#00C8FF] font-semibold">RADIAL QR</span>
            <span className="text-slate-600">·</span>
            <span>Versioned RQR1 Protocol</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">Reed–Solomon GF(256)</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 text-balance max-w-4xl">
            Decode Beyond <br />
            <span className="bg-gradient-to-r from-white via-[#00C8FF] to-[#176BFF] bg-clip-text text-transparent">
              the Square
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A next-generation artistic QR generation & computer vision scanning platform.
            Experience dense concentric segments, polar coordinates, and mathematical error correction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('generator')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-sm transition-all shadow-[0_0_25px_rgba(0,200,255,0.3)] hover:scale-[1.02] cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Generator</span>
            </button>

            <button
              onClick={() => onNavigate('scanner')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#121722] hover:bg-[#1B2330] border border-[#1B2330] text-white font-semibold text-sm transition-all hover:border-[#00C8FF]/50 cursor-pointer"
            >
              <ScanLine className="w-4 h-4 text-[#00C8FF]" />
              <span>Open Scanner</span>
            </button>

            <button
              onClick={() => onNavigate('templates')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white font-medium text-sm transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Browse 6 Design Families</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6 DESIGN FAMILIES SHOWCASE */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Six Proprietary Design Families
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Constructed with polar coordinates <code className="text-[#00C8FF] font-mono text-xs">(r, θ)</code>,
            concentric angular wedges, and deterministic error protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STARTER_TEMPLATES.filter((t) => t.mode === 'radial').map((template) => {
            const fam = template.radialStyle?.family as DesignFamily;
            return (
              <div
                key={template.id}
                className="group p-6 rounded-2xl bg-[#121722] border border-[#1B2330] hover:border-[#00C8FF]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#00C8FF]">
                      {template.familyLabel}
                    </span>
                    <span className="text-xs text-slate-400">RQR1</span>
                  </div>

                  {/* Thumbnail illustration representing the geometry */}
                  <div className="w-full h-44 rounded-xl bg-[#090B10] border border-[#1B2330] mb-5 flex items-center justify-center relative overflow-hidden group-hover:border-[#00C8FF]/30 transition-colors">
                    <div
                      className="w-32 h-32 rounded-full border-4 flex items-center justify-center relative transition-transform duration-500 group-hover:scale-105"
                      style={{
                        borderColor: template.radialStyle?.fgColor || '#00C8FF',
                        boxShadow: `0 0 25px ${(template.radialStyle?.fgColor || '#00C8FF')}20`,
                      }}
                    >
                      <div
                        className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center"
                        style={{ borderColor: template.radialStyle?.fgColorEnd || '#176BFF' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: template.radialStyle?.fgColor || '#00C8FF' }}
                        />
                      </div>
                      {/* Decorative crosshairs */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-[1px] bg-white/10" />
                        <div className="h-full w-[1px] bg-white/10 absolute" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {template.description}
                  </p>
                </div>

                <button
                  onClick={() => onSelectTemplate(template.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1B2330] hover:bg-[#00C8FF] text-slate-200 hover:text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Customize in Generator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPATIBILITY ARCHITECTURE: TWO ENGINES EXPLAINED */}
      <section className="py-20 px-6 bg-[#0E131E] border-y border-[#1B2330]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Honest Architecture: Two Distinct Engines
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              We never falsify standard QR compatibility. RADIAL QR provides two fully independent pipelines for distinct use cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mode A: Universal QR */}
            <div className="p-8 rounded-2xl bg-[#121722] border border-[#1B2330] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Mode A: Universal QR</h3>
                    <span className="text-xs text-emerald-400 font-medium">100% Smartphone Camera Compatible</span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Standard ISO/IEC 18004 specification. Retains strict finder patterns, timing tracks and alignment matrices while allowing artistic dot styling, color gradients and logos.
                </p>

                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Scans natively with iOS Camera, Android Google Lens & all barcode apps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Standard Error Correction Levels: L (7%), M (15%), Q (25%), H (30%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Automatic pre-export decode validation using jsQR engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Square matrix bounds with artistic module sculpting</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('generator')}
                className="w-full py-3 px-4 rounded-xl bg-[#1B2330] hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create Universal Standard QR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mode B: Proprietary Radial QR */}
            <div className="p-8 rounded-2xl bg-[#121722] border border-[#00C8FF]/30 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00C8FF]/5 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 rounded-lg bg-[#00C8FF]/10 text-[#00C8FF]">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Mode B: Proprietary Radial QR</h3>
                    <span className="text-xs text-[#00C8FF] font-medium">Requires RADIAL QR Scanner</span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  True circular, angular and spiral data placement. Employs polar coordinate math, asymmetric fiducial markers, and custom Galois Field GF(256) Reed-Solomon correction.
                </p>

                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#00C8FF] font-bold">★</span>
                    <span>Concentric angular wedges, spiral tracks & circular labyrinths</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00C8FF] font-bold">★</span>
                    <span>Asymmetric fiducials for 0°–360° arbitrary rotation invariance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00C8FF] font-bold">★</span>
                    <span>CRC32 integrity hashing + Reed–Solomon codeword protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">!</span>
                    <span className="text-slate-400">Decoded exclusively by RADIAL QR scanner (web & camera)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('generator')}
                className="w-full py-3 px-4 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,200,255,0.2)]"
              >
                <span>Create Proprietary Radial QR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / TECHNOLOGY PIPELINE */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Under the Hood: The RQR1 Pipeline
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            From UTF-8 string to polar geometry and computer vision recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <div className="w-10 h-10 rounded-xl bg-[#1B2330] flex items-center justify-center text-[#00C8FF] mb-4 font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-white mb-2">Packet Encapsulation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Constructs RQR1 header with version, payload type, geometry parameters, payload bytes and IEEE 802.3 CRC32 checksum.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <div className="w-10 h-10 rounded-xl bg-[#1B2330] flex items-center justify-center text-[#00C8FF] mb-4 font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-white mb-2">Reed–Solomon GF(256)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates parity codewords over primitive polynomial <code className="text-[#00C8FF]">x⁸+x⁴+x³+x²+1</code> to correct damaged or obstructed angular sectors.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <div className="w-10 h-10 rounded-xl bg-[#1B2330] flex items-center justify-center text-[#00C8FF] mb-4 font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-white mb-2">Polar Placement & Masking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maps interleaved codewords into concentric rings with deterministic masking and reserves clock and fiducial tracks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <div className="w-10 h-10 rounded-xl bg-[#1B2330] flex items-center justify-center text-[#00C8FF] mb-4 font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-white mb-2">Computer Vision Recovery</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Locates central anchor centroid, detects 0°–360° orientation angle, samples polar grid with 5-point kernels and decodes.
            </p>
          </div>
        </div>
      </section>

      {/* QUICK CTA BANNER */}
      <section className="py-16 px-6 border-t border-[#1B2330] bg-gradient-to-b from-[#090B10] to-[#121722]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Design Beyond the Square?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8">
            Create high-resolution radial and standard QR codes. Export in SVG vectors, high-res PNG, or printable PDF.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('generator')}
              className="px-6 py-3 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,200,255,0.25)] cursor-pointer"
            >
              Start Generating Now
            </button>
            <button
              onClick={() => onNavigate('docs')}
              className="px-6 py-3 rounded-xl bg-[#121722] hover:bg-[#1B2330] border border-[#1B2330] text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
            >
              Read RQR1 Docs
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
