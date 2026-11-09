/**
 * Clean Footer with navigational links and project attribution.
 */

import React from 'react';
import { PageView } from './Navbar';

interface FooterProps {
  onNavigate: (page: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-[#1B2330] bg-[#090B10] py-12 px-6 text-sm text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">RADIAL QR</span>
            <span className="text-[#00C8FF] text-xs font-semibold">·</span>
            <span className="text-xs text-slate-400">Decode Beyond the Square</span>
          </div>
          <p className="text-xs text-slate-400">
            Next-generation artistic polar QR generation and proprietary RQR1 computer vision decoder.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">
            Home
          </button>
          <button onClick={() => onNavigate('generator')} className="hover:text-white transition-colors cursor-pointer">
            Generator
          </button>
          <button onClick={() => onNavigate('scanner')} className="hover:text-white transition-colors cursor-pointer">
            Scanner
          </button>
          <button onClick={() => onNavigate('templates')} className="hover:text-white transition-colors cursor-pointer">
            Templates
          </button>
          <button onClick={() => onNavigate('designs')} className="hover:text-white transition-colors cursor-pointer">
            My Designs
          </button>
          <button onClick={() => onNavigate('docs')} className="hover:text-white transition-colors cursor-pointer">
            RQR1 Protocol Spec
          </button>
        </nav>

        <div className="text-xs text-slate-400 text-center md:text-right">
          <span>Galois Field GF(256) Reed-Solomon · IEEE 802.3 CRC32</span>
        </div>
      </div>
    </footer>
  );
};
