/**
 * Global Application Settings Page.
 * Scanner preferences, default export resolution, scan history governance, and diagnostics.
 */

import React, { useState, useEffect } from 'react';
import {
  getUserPreferences,
  saveUserPreferences,
  clearScanHistory,
  UserPreferences,
} from '../data/designStore';
import { Settings, Save, Trash2, CheckCircle2, Sliders, Volume2, Crosshair, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPreferences>(getUserPreferences());
  const [savedMessage, setSavedMessage] = useState<string>('');

  useEffect(() => {
    setPrefs(getUserPreferences());
  }, []);

  const handleSave = () => {
    saveUserPreferences(prefs);
    setSavedMessage('Settings saved successfully!');
    setTimeout(() => setSavedMessage(''), 2500);
  };

  const handleClearHistory = () => {
    if (confirm('Clear all local scan history records?')) {
      clearScanHistory();
      setSavedMessage('Scan history cleared.');
      setTimeout(() => setSavedMessage(''), 2500);
    }
  };

  return (
    <div className="flex-1 bg-[#090B10] p-6 lg:p-10 max-w-4xl mx-auto w-full select-none text-slate-300">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-7 h-7 text-[#00C8FF]" />
          <span>Application Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure default generator behaviors, scanner diagnostics, and data retention.
        </p>
      </div>

      <div className="space-y-6">
        {/* Generator Defaults */}
        <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00C8FF]" />
            <span>Generator Defaults</span>
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-white">Default Generator Mode</div>
                <div className="text-[11px] text-slate-400">Choose which engine opens first when launching the editor</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrefs((p) => ({ ...p, defaultMode: 'radial' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    prefs.defaultMode === 'radial'
                      ? 'bg-[#00C8FF] text-black shadow-md'
                      : 'bg-[#090B10] text-slate-400 border border-[#1B2330]'
                  }`}
                >
                  Radial RQR1
                </button>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, defaultMode: 'standard' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    prefs.defaultMode === 'standard'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#090B10] text-slate-400 border border-[#1B2330]'
                  }`}
                >
                  Universal QR
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#1B2330]">
              <div>
                <div className="text-xs font-semibold text-white">Default Export Resolution</div>
                <div className="text-[11px] text-slate-400">Baseline pixel dimensions for high-resolution PNG exports</div>
              </div>
              <select
                value={prefs.defaultResolution}
                onChange={(e) => setPrefs((p) => ({ ...p, defaultResolution: Number(e.target.value) }))}
                className="px-3 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white"
              >
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024 (Recommended)</option>
                <option value={2048}>2048 × 2048 (Print HD)</option>
                <option value={4096}>4096 × 4096 (Ultra 4K)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scanner Preferences */}
        <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330]">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#00C8FF]" />
            <span>Scanner & Diagnostics</span>
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Computer Vision Diagnostic Overlay</div>
                <div className="text-[11px] text-slate-400">Display anchor centroid, orientation angle and polar grid sampling</div>
              </div>
              <input
                type="checkbox"
                checked={prefs.showDiagnostics}
                onChange={(e) => setPrefs((p) => ({ ...p, showDiagnostics: e.target.checked }))}
                className="w-4 h-4 accent-[#00C8FF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1B2330]">
              <div>
                <div className="text-xs font-semibold text-white">Scan Completion Chime</div>
                <div className="text-[11px] text-slate-400">Play an audible acoustic chime when a valid code is decoded</div>
              </div>
              <input
                type="checkbox"
                checked={prefs.soundEffects}
                onChange={(e) => setPrefs((p) => ({ ...p, soundEffects: e.target.checked }))}
                className="w-4 h-4 accent-[#00C8FF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1B2330]">
              <div>
                <div className="text-xs font-semibold text-white">Retain Local Scan History</div>
                <div className="text-[11px] text-slate-400">Store decrypted scan results in local device storage</div>
              </div>
              <input
                type="checkbox"
                checked={prefs.saveScanHistory}
                onChange={(e) => setPrefs((p) => ({ ...p, saveScanHistory: e.target.checked }))}
                className="w-4 h-4 accent-[#00C8FF] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Data Management & Save Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            onClick={handleClearHistory}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#121722] hover:bg-red-500/10 border border-[#1B2330] hover:border-red-500/40 text-xs font-semibold text-red-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Scan History</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {savedMessage && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{savedMessage}</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,200,255,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
