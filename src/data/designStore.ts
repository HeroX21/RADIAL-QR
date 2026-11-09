/**
 * Local-First Design & State Store for RADIAL QR.
 * Handles saved designs, scan history, editor undo/redo, and preferences.
 */

import { RadialStyleOptions, DEFAULT_STYLE_OPTIONS } from '../core/radialRenderer';
import { StandardQrOptions, DEFAULT_STANDARD_QR_OPTIONS } from '../core/standardQrEngine';
import { ContentPayload, formatContentPayload } from '../core/contentTypes';
import { STARTER_TEMPLATES } from './templates';

export interface SavedDesign {
  id: string;
  name: string;
  mode: 'radial' | 'standard';
  payload: ContentPayload;
  radialStyle: RadialStyleOptions;
  standardStyle: StandardQrOptions;
  createdAt: string;
  updatedAt: string;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  format: 'standard' | 'radial' | 'unknown';
  payload: string;
  kind: string;
  confidence?: number;
  errorsCorrected?: number;
}

export interface UserPreferences {
  defaultMode: 'radial' | 'standard';
  defaultResolution: number;
  showDiagnostics: boolean;
  saveScanHistory: boolean;
  soundEffects: boolean;
}

const STORAGE_KEY_DESIGNS = 'radialqr_designs_v1';
const STORAGE_KEY_HISTORY = 'radialqr_scans_v1';
const STORAGE_KEY_PREFS = 'radialqr_prefs_v1';

export function getSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DESIGNS);
    if (!raw) {
      // Seed with 2 starter designs
      const initial: SavedDesign[] = [
        {
          id: 'design-1',
          name: 'Cyber Wedge Launch',
          mode: 'radial',
          payload: { kind: 'url', rawText: 'https://radialqr.art' },
          radialStyle: { ...DEFAULT_STYLE_OPTIONS },
          standardStyle: { ...DEFAULT_STANDARD_QR_OPTIONS },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'design-2',
          name: 'Obsidian Pass',
          mode: 'standard',
          payload: { kind: 'url', rawText: 'https://radialqr.art/docs' },
          radialStyle: { ...DEFAULT_STYLE_OPTIONS },
          standardStyle: { ...DEFAULT_STANDARD_QR_OPTIONS, moduleShape: 'rounded' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDesign(design: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): SavedDesign {
  const designs = getSavedDesigns();
  const now = new Date().toISOString();

  if (existingId) {
    const idx = designs.findIndex((d) => d.id === existingId);
    if (idx !== -1) {
      const updated: SavedDesign = {
        ...designs[idx],
        ...design,
        updatedAt: now,
      };
      designs[idx] = updated;
      localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
      return updated;
    }
  }

  const newDesign: SavedDesign = {
    ...design,
    id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  designs.unshift(newDesign);
  localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
  return newDesign;
}

export function deleteDesign(id: string): void {
  const designs = getSavedDesigns().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(designs));
}

export function getScanHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addScanHistoryItem(item: Omit<ScanHistoryItem, 'id' | 'timestamp'>): void {
  const prefs = getUserPreferences();
  if (!prefs.saveScanHistory) return;

  const history = getScanHistory();
  const newItem: ScanHistoryItem = {
    ...item,
    id: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  history.unshift(newItem);
  // Keep max 50 scans
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));
}

export function clearScanHistory(): void {
  localStorage.removeItem(STORAGE_KEY_HISTORY);
}

export function getUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS);
    if (!raw) {
      const def: UserPreferences = {
        defaultMode: 'radial',
        defaultResolution: 1024,
        showDiagnostics: true,
        saveScanHistory: true,
        soundEffects: true,
      };
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(def));
      return def;
    }
    return JSON.parse(raw);
  } catch {
    return {
      defaultMode: 'radial',
      defaultResolution: 1024,
      showDiagnostics: true,
      saveScanHistory: true,
      soundEffects: true,
    };
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
}
