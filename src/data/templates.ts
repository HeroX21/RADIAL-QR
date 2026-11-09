/**
 * Curated Design Templates for the 6 Radial Families & Standard Universal QR.
 */

import { RadialStyleOptions, DEFAULT_STYLE_OPTIONS } from '../core/radialRenderer';
import { StandardQrOptions, DEFAULT_STANDARD_QR_OPTIONS } from '../core/standardQrEngine';
import { ContentPayload } from '../core/contentTypes';

export interface CodeTemplate {
  id: string;
  name: string;
  mode: 'radial' | 'standard';
  familyLabel: string;
  description: string;
  radialStyle?: RadialStyleOptions;
  standardStyle?: StandardQrOptions;
  defaultPayload: ContentPayload;
}

export const STARTER_TEMPLATES: CodeTemplate[] = [
  {
    id: 'cyber-wedge',
    name: 'Cyber Wedge',
    mode: 'radial',
    familyLabel: 'Radial Angular',
    description: 'Dense concentric geometric segments inspired by radar & optics. Maximum contrast & high density.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'radial-angular',
      moduleShape: 'wedge',
      fgColor: '#00C8FF',
      fgColorEnd: '#176BFF',
      bgColor: '#090B10',
      density: 0.9,
      gradientType: 'radial',
      showDecorativeBorder: true,
      borderStyle: 'ticks',
      showCenterAnchor: true,
      centerAnchorStyle: 'bullseye',
    },
    defaultPayload: {
      kind: 'url',
      rawText: 'https://radialqr.art/gallery/cyber-wedge',
    },
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    mode: 'radial',
    familyLabel: 'Spiral Flow',
    description: 'Archimedean spiral data arrangement with dynamic swirling angular sweeps.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'spiral-flow',
      moduleShape: 'wedge',
      fgColor: '#F59E0B',
      fgColorEnd: '#EF4444',
      bgColor: '#090B10',
      density: 0.85,
      gradientType: 'radial',
      showDecorativeBorder: true,
      borderStyle: 'compass',
      showCenterAnchor: true,
      centerAnchorStyle: 'target',
    },
    defaultPayload: {
      kind: 'url',
      rawText: 'https://radialqr.art/gallery/solar-flare',
    },
  },
  {
    id: 'chronos-maze',
    name: 'Chronos Maze',
    mode: 'radial',
    familyLabel: 'Circular Labyrinth',
    description: 'Maze-like concentric corridors and orthogonal connecting bridges.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'circular-labyrinth',
      moduleShape: 'wedge',
      fgColor: '#10B981',
      fgColorEnd: '#06B6D4',
      bgColor: '#090B10',
      density: 0.92,
      gradientType: 'linear',
      showDecorativeBorder: true,
      borderStyle: 'rings',
      showCenterAnchor: true,
      centerAnchorStyle: 'ring-core',
    },
    defaultPayload: {
      kind: 'text',
      rawText: 'Enter the Labyrinth: Geometric data unlocked through radial coordinates.',
    },
  },
  {
    id: 'quantum-traces',
    name: 'Quantum Traces',
    mode: 'radial',
    familyLabel: 'Circuit Matrix',
    description: 'Futuristic electronic PCB board aesthetics with radial traces and terminal via pads.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'circuit-matrix',
      moduleShape: 'circuit',
      fgColor: '#38BDF8',
      fgColorEnd: '#818CF8',
      bgColor: '#090B10',
      density: 0.88,
      gradientType: 'radial',
      showDecorativeBorder: true,
      borderStyle: 'ticks',
      showCenterAnchor: true,
      centerAnchorStyle: 'target',
    },
    defaultPayload: {
      kind: 'wifi',
      rawText: '',
      wifi: {
        ssid: 'Quantum_Mesh_5G',
        password: 'radial-secure-protocol',
        encryption: 'WPA',
        hidden: false,
      },
    },
  },
  {
    id: 'orbital-rings',
    name: 'Orbital Rings',
    mode: 'radial',
    familyLabel: 'Concentric Rings',
    description: 'Crisp layered circular arc bands and monochromatic luxury aesthetic.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'concentric-rings',
      moduleShape: 'rounded',
      fgColor: '#FFFFFF',
      fgColorEnd: '#94A3B8',
      bgColor: '#090B10',
      density: 0.86,
      gradientType: 'linear',
      showDecorativeBorder: true,
      borderStyle: 'dots',
      showCenterAnchor: true,
      centerAnchorStyle: 'bullseye',
    },
    defaultPayload: {
      kind: 'url',
      rawText: 'https://radialqr.art/gallery/orbital-rings',
    },
  },
  {
    id: 'prism-shards',
    name: 'Prism Shards',
    mode: 'radial',
    familyLabel: 'Abstract Hybrid',
    description: 'Faceted diamond polygons, angular experimental geometry and jewel cuts.',
    radialStyle: {
      ...DEFAULT_STYLE_OPTIONS,
      family: 'abstract-hybrid',
      moduleShape: 'faceted',
      fgColor: '#EC4899',
      fgColorEnd: '#8B5CF6',
      bgColor: '#090B10',
      density: 0.84,
      gradientType: 'radial',
      showDecorativeBorder: true,
      borderStyle: 'compass',
      showCenterAnchor: true,
      centerAnchorStyle: 'target',
    },
    defaultPayload: {
      kind: 'contact',
      rawText: '',
      contact: {
        firstName: 'Elena',
        lastName: 'Rostova',
        phone: '+1 555-0199',
        email: 'elena@radialqr.art',
        organization: 'Prism Dynamics',
        title: 'Lead Architect',
        url: 'https://radialqr.art',
      },
    },
  },
  // Standard QR Presets
  {
    id: 'obsidian-minimal',
    name: 'Obsidian Minimal',
    mode: 'standard',
    familyLabel: 'Universal QR',
    description: 'ISO-compliant standard QR with softened rounded modules and dark luxury finish.',
    standardStyle: {
      ...DEFAULT_STANDARD_QR_OPTIONS,
      moduleShape: 'rounded',
      finderStyle: 'rounded',
      fgColor: '#FFFFFF',
      fgColorEnd: '#94A3B8',
      bgColor: '#090B10',
      gradientType: 'linear',
      eccLevel: 'M',
    },
    defaultPayload: {
      kind: 'url',
      rawText: 'https://radialqr.art',
    },
  },
  {
    id: 'neon-cyber-standard',
    name: 'Neon Cyber Standard',
    mode: 'standard',
    familyLabel: 'Universal QR',
    description: 'High-visibility ISO-standard QR with cyan gradient and circular finders.',
    standardStyle: {
      ...DEFAULT_STANDARD_QR_OPTIONS,
      moduleShape: 'dots',
      finderStyle: 'circle',
      fgColor: '#00C8FF',
      fgColorEnd: '#176BFF',
      bgColor: '#090B10',
      gradientType: 'linear',
      eccLevel: 'Q',
    },
    defaultPayload: {
      kind: 'url',
      rawText: 'https://radialqr.art/scanner',
    },
  },
];
