/**
 * User Account & Workspace Profile Page.
 * Local-first profile management, cloud sync preferences, backup export and storage statistics.
 */

import React, { useState, useEffect } from 'react';
import { getSavedDesigns, getScanHistory } from '../data/designStore';
import { User, ShieldCheck, Download, HardDrive, Sparkles, LogOut, Check } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const [designCount, setDesignCount] = useState<number>(0);
  const [scanCount, setScanCount] = useState<number>(0);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);
  const [exported, setExported] = useState<boolean>(false);

  useEffect(() => {
    setDesignCount(getSavedDesigns().length);
    setScanCount(getScanHistory().length);
  }, []);

  const handleExportBackup = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      designs: getSavedDesigns(),
      scanHistory: getScanHistory(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radial-qr-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="flex-1 bg-[#090B10] p-6 lg:p-10 max-w-4xl mx-auto w-full select-none text-slate-300">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <User className="w-7 h-7 text-[#00C8FF]" />
          <span>Creator Profile</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Local-first workspace identity and library backups.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00C8FF] to-[#176BFF] flex items-center justify-center text-black font-extrabold text-2xl shadow-[0_0_20px_rgba(0,200,255,0.3)]">
              ER
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Elena Rostova</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00C8FF]/15 text-[#00C8FF] text-[10px] font-bold">
                  PRO CREATOR
                </span>
              </div>
              <p className="text-xs text-slate-400">elena@radialqr.art</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: usr_guest_local_8492</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#1B2330] pt-4 sm:pt-0 sm:pl-6 text-xs">
            <div>
              <div className="text-xl font-bold text-white font-mono">{designCount}</div>
              <div className="text-[11px] text-slate-400">Saved Designs</div>
            </div>
            <div className="w-[1px] h-8 bg-[#1B2330]" />
            <div>
              <div className="text-xl font-bold text-white font-mono">{scanCount}</div>
              <div className="text-[11px] text-slate-400">Scans Logged</div>
            </div>
          </div>
        </div>

        {/* Local Storage & Backup Card */}
        <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#00C8FF]" />
            <span>Workspace Storage & Backup</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            All designs, custom geometries, and templates are stored locally in your browser storage for zero-latency offline access.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleExportBackup}
              className="px-4 py-2.5 rounded-xl bg-[#1B2330] hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              {exported ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-[#00C8FF]" />}
              <span>{exported ? 'Backup Downloaded!' : 'Export JSON Backup'}</span>
            </button>

            <button
              onClick={() => setCloudSyncEnabled((s) => !s)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                cloudSyncEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-[#090B10] text-slate-400 border-[#1B2330] hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{cloudSyncEnabled ? 'Cloud Sync Enabled' : 'Enable Cloud Sync (Beta)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
