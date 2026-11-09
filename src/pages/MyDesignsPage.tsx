/**
 * My Designs Page.
 * View, edit, duplicate, export and delete saved custom code designs.
 */

import React, { useState, useEffect } from 'react';
import { getSavedDesigns, deleteDesign, saveDesign, SavedDesign } from '../data/designStore';
import { PageView } from '../components/Navbar';
import { Bookmark, QrCode, Trash2, Copy, ArrowRight, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface MyDesignsPageProps {
  onNavigate: (page: PageView) => void;
  onOpenDesign: (design: SavedDesign) => void;
}

export const MyDesignsPage: React.FC<MyDesignsPageProps> = ({ onNavigate, onOpenDesign }) => {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);

  useEffect(() => {
    setDesigns(getSavedDesigns());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this design permanently?')) {
      deleteDesign(id);
      setDesigns(getSavedDesigns());
    }
  };

  const handleDuplicate = (d: SavedDesign, e: React.MouseEvent) => {
    e.stopPropagation();
    saveDesign({
      name: `${d.name} (Copy)`,
      mode: d.mode,
      payload: d.payload,
      radialStyle: d.radialStyle,
      standardStyle: d.standardStyle,
    });
    setDesigns(getSavedDesigns());
  };

  return (
    <div className="flex-1 bg-[#090B10] p-6 lg:p-10 max-w-7xl mx-auto w-full select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bookmark className="w-7 h-7 text-[#00C8FF]" />
            <span>My Saved Designs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Locally stored custom radial geometries, color themes, and payloads.
          </p>
        </div>

        <button
          onClick={() => onNavigate('generator')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,200,255,0.25)] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Design</span>
        </button>
      </div>

      {designs.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#121722] border border-[#1B2330] text-center flex flex-col items-center justify-center">
          <QrCode className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-base font-bold text-white mb-2">No Saved Designs Yet</h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
            Generate and customize your first artistic radial or universal QR code, then click &quot;Save Design&quot; to keep it in your library.
          </p>
          <button
            onClick={() => onNavigate('generator')}
            className="px-5 py-2.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-colors cursor-pointer"
          >
            Open Generator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <div
              key={design.id}
              onClick={() => onOpenDesign(design)}
              className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330] hover:border-[#00C8FF]/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      design.mode === 'radial'
                        ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {design.mode === 'radial' ? <Sparkles className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>{design.mode === 'radial' ? 'Radial RQR1' : 'Universal QR'}</span>
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {new Date(design.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Graphic Preview Disc */}
                <div className="w-full h-36 rounded-xl bg-[#090B10] border border-[#1B2330] mb-4 flex items-center justify-center relative overflow-hidden group-hover:border-[#00C8FF]/30">
                  <div
                    className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
                    style={{
                      borderColor: design.radialStyle?.fgColor || design.standardStyle?.fgColor || '#00C8FF',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full border border-dashed flex items-center justify-center"
                      style={{
                        borderColor: design.radialStyle?.fgColorEnd || design.standardStyle?.fgColorEnd || '#176BFF',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: design.radialStyle?.fgColor || design.standardStyle?.fgColor || '#00C8FF',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#00C8FF] transition-colors truncate">
                  {design.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate mb-4">
                  {design.payload.kind.toUpperCase()}: {design.payload.rawText || 'Structured payload'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1B2330]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleDuplicate(design, e)}
                    className="p-1.5 rounded-lg bg-[#1B2330] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Duplicate Design"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(design.id, e)}
                    className="p-1.5 rounded-lg bg-[#1B2330] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete Design"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-[#00C8FF]">
                  <span>Edit in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
