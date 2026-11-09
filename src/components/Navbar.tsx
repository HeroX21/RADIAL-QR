/**
 * Top Navigation Bar following the strict 3-zone Top Bar Contract.
 * Zone 1: Single text element wordmark "RADIAL QR"
 * Zone 2: Single-line text navigation links
 * Zone 3: 1 primary action button + quick tools
 */

import React from 'react';
import { QrCode, ScanLine, LayoutGrid, Bookmark, FileCode2, Settings, User } from 'lucide-react';

export type PageView =
  | 'home'
  | 'generator'
  | 'scanner'
  | 'templates'
  | 'designs'
  | 'account'
  | 'settings'
  | 'docs';

interface NavbarProps {
  activePage: PageView;
  onNavigate: (page: PageView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#090B10]/90 backdrop-blur-md border-b border-[#1B2330]">
      {/* Zone 1: Single-element Brand Wordmark */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2.5 text-left text-white tracking-tight hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 group cursor-pointer"
        aria-label="RADIAL QR Home"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00C8FF] to-[#176BFF] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(0,200,255,0.3)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-black stroke-[2.5]">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>
        <div>
          <span className="text-base font-extrabold tracking-wider text-white">RADIAL</span>
          <span className="text-base font-extrabold tracking-wider text-[#00C8FF] ml-1">QR</span>
        </div>
      </button>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('generator')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
            activePage === 'generator' ? 'text-[#00C8FF] font-semibold border-b-2 border-[#00C8FF]' : 'hover:text-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Generator</span>
        </button>

        <button
          onClick={() => onNavigate('scanner')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
            activePage === 'scanner' ? 'text-[#00C8FF] font-semibold border-b-2 border-[#00C8FF]' : 'hover:text-slate-100'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          <span>Scanner</span>
        </button>

        <button
          onClick={() => onNavigate('templates')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
            activePage === 'templates' ? 'text-[#00C8FF] font-semibold border-b-2 border-[#00C8FF]' : 'hover:text-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Templates</span>
        </button>

        <button
          onClick={() => onNavigate('designs')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
            activePage === 'designs' ? 'text-[#00C8FF] font-semibold border-b-2 border-[#00C8FF]' : 'hover:text-slate-100'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>My Designs</span>
        </button>

        <button
          onClick={() => onNavigate('docs')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
            activePage === 'docs' ? 'text-[#00C8FF] font-semibold border-b-2 border-[#00C8FF]' : 'hover:text-slate-100'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Docs</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action + profile & settings */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onNavigate('scanner')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-[#121722] hover:bg-[#1B2330] border border-[#1B2330] rounded-lg transition-colors cursor-pointer"
        >
          <ScanLine className="w-3.5 h-3.5 text-[#00C8FF]" />
          <span>Quick Scan</span>
        </button>

        <button
          onClick={() => onNavigate('generator')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-[#00C8FF] hover:bg-[#38BDF8] rounded-lg transition-all shadow-[0_0_20px_rgba(0,200,255,0.25)] hover:shadow-[0_0_25px_rgba(0,200,255,0.4)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Generate QR</span>
        </button>

        <div className="h-4 w-[1px] bg-[#1B2330] hidden sm:block" />

        <button
          onClick={() => onNavigate('settings')}
          className={`p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#121722] transition-colors cursor-pointer ${
            activePage === 'settings' ? 'text-[#00C8FF] bg-[#121722]' : ''
          }`}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={() => onNavigate('account')}
          className={`p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#121722] transition-colors cursor-pointer ${
            activePage === 'account' ? 'text-[#00C8FF] bg-[#121722]' : ''
          }`}
          aria-label="Account"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
