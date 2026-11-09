/**
 * Templates Gallery Page.
 * Browse, filter and inspect starter templates for all 6 radial design families and standard QR.
 */

import React, { useState } from 'react';
import { STARTER_TEMPLATES, CodeTemplate } from '../data/templates';
import { LayoutGrid, ArrowRight, Sparkles, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface TemplatesPageProps {
  onSelectTemplate: (templateId: string) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onSelectTemplate }) => {
  const [filter, setFilter] = useState<'all' | 'radial' | 'standard'>('all');

  const filtered = STARTER_TEMPLATES.filter((t) => {
    if (filter === 'all') return true;
    return t.mode === filter;
  });

  return (
    <div className="flex-1 bg-[#090B10] p-6 lg:p-10 max-w-7xl mx-auto w-full select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <LayoutGrid className="w-7 h-7 text-[#00C8FF]" />
            <span>Curated Design Templates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Production starter templates engineered for high contrast, clean vector lines and reliable scanning.
          </p>
        </div>

        {/* Clean Segmented Filter (Button control with click handlers) */}
        <div className="flex items-center gap-1 p-1 bg-[#121722] rounded-xl border border-[#1B2330]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-[#00C8FF] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Presets
          </button>
          <button
            onClick={() => setFilter('radial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'radial' ? 'bg-[#00C8FF] text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Radial RQR1 (6 Families)
          </button>
          <button
            onClick={() => setFilter('standard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'standard' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Universal QR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330] hover:border-[#00C8FF]/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    t.mode === 'radial'
                      ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {t.mode === 'radial' ? <Sparkles className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>{t.familyLabel}</span>
                </span>
                <span className="text-xs font-mono text-slate-400 uppercase">{t.mode}</span>
              </div>

              {/* Graphic Icon Card */}
              <div className="w-full h-44 rounded-xl bg-[#090B10] border border-[#1B2330] mb-5 flex items-center justify-center relative overflow-hidden group-hover:border-[#00C8FF]/30 transition-colors">
                <div
                  className="w-28 h-28 rounded-full border-4 flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    borderColor: t.radialStyle?.fgColor || t.standardStyle?.fgColor || '#00C8FF',
                    boxShadow: `0 0 20px ${(t.radialStyle?.fgColor || t.standardStyle?.fgColor || '#00C8FF')}20`,
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: t.radialStyle?.fgColorEnd || t.standardStyle?.fgColorEnd || '#176BFF',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: t.radialStyle?.fgColor || t.standardStyle?.fgColor || '#00C8FF',
                      }}
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">{t.description}</p>
            </div>

            <button
              onClick={() => onSelectTemplate(t.id)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1B2330] hover:bg-[#00C8FF] text-slate-200 hover:text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Use in Generator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
