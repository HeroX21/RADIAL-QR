/**
 * 3-Panel Advanced Graphics & Code Generator Editor.
 * Left Panel: Content Type, Input, Mode Toggle, Design Family, Templates.
 * Center Panel: Interactive Canvas Viewport (Pan/Zoom/Guides/Undo/Redo), Live Decode Verification.
 * Right Panel: Module Geometry, Concentric Rings/Sectors, Gradients, Logo, Export.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  RadialStyleOptions,
  DEFAULT_STYLE_OPTIONS,
  renderRadialToCanvas,
  generateRadialSvg,
  DesignFamily,
  ModuleShape,
} from '../core/radialRenderer';
import {
  StandardQrOptions,
  DEFAULT_STANDARD_QR_OPTIONS,
  renderStandardQrToCanvas,
  generateStandardQrSvg,
  QrEccLevel,
  QrModuleShape,
  QrFinderStyle,
} from '../core/standardQrEngine';
import {
  ContentPayload,
  ContentKind,
  formatContentPayload,
  CONTENT_TYPE_MAP,
} from '../core/contentTypes';
import { encodeRqrPacket, EccLevel } from '../core/rqrProtocol';
import { STARTER_TEMPLATES } from '../data/templates';
import { saveDesign, SavedDesign } from '../data/designStore';
import {
  verifyRenderedCode,
  downloadPng,
  downloadSvg,
  downloadPdf,
  ExportFormat,
  ExportResolution,
  ValidationReport,
} from '../core/exportEngine';
import {
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  Bookmark,
  Layers,
  Palette,
  Crosshair,
  Sliders,
  Globe,
  Type,
  Wifi,
  Contact,
  Mail,
  Phone,
  MessageSquare,
  CreditCard,
  Image as ImageIcon,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface GeneratorPageProps {
  initialTemplateId?: string;
}

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ initialTemplateId }) => {
  // Mode selection: 'radial' (Mode B) vs 'standard' (Mode A)
  const [mode, setMode] = useState<'radial' | 'standard'>('radial');

  // Content state
  const [content, setContent] = useState<ContentPayload>({
    kind: 'url',
    rawText: 'https://radialqr.art',
  });

  // Radial styling state
  const [radialStyle, setRadialStyle] = useState<RadialStyleOptions>({
    ...DEFAULT_STYLE_OPTIONS,
  });

  // Standard QR styling state
  const [standardStyle, setStandardStyle] = useState<StandardQrOptions>({
    ...DEFAULT_STANDARD_QR_OPTIONS,
  });

  // Geometry configuration
  const [ringCount, setRingCount] = useState<number>(16);
  const [sectorCount, setSectorCount] = useState<number>(48);
  const [radialEccLevel, setRadialEccLevel] = useState<EccLevel>(EccLevel.MEDIUM);

  // Canvas viewport state (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasBgStyle, setCanvasBgStyle] = useState<'dark' | 'grid' | 'slate'>('dark');

  // Alignment guides
  const [showGuides, setShowGuides] = useState<boolean>(false);

  // Live decode verification state
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Undo / Redo history
  const [history, setHistory] = useState<Array<{ radialStyle: RadialStyleOptions; standardStyle: StandardQrOptions }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Export dialog state
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [exportResolution, setExportResolution] = useState<ExportResolution>(1024);
  const [exportStatusMessage, setExportStatusMessage] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute formatted payload
  const formattedPayload = useMemo(() => formatContentPayload(content), [content]);

  // Compute RQR1 encoded codeword for Radial QR
  const rqrEncoded = useMemo(() => {
    if (mode !== 'radial') return null;
    const payloadType = CONTENT_TYPE_MAP[content.kind];
    return encodeRqrPacket(formattedPayload, payloadType, {
      ringCount,
      sectorCount,
      eccLevel: radialEccLevel,
    });
  }, [mode, formattedPayload, content.kind, ringCount, sectorCount, radialEccLevel]);

  // Handle template selection
  useEffect(() => {
    if (initialTemplateId) {
      const t = STARTER_TEMPLATES.find((item) => item.id === initialTemplateId);
      if (t) {
        setMode(t.mode);
        setContent(t.defaultPayload);
        if (t.radialStyle) setRadialStyle({ ...t.radialStyle });
        if (t.standardStyle) setStandardStyle({ ...t.standardStyle });
      }
    }
  }, [initialTemplateId]);

  // Render to canvas
  const renderCode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;

    if (mode === 'radial' && rqrEncoded) {
      renderRadialToCanvas(ctx, rqrEncoded, size, {
        ...radialStyle,
        showCalibrationGuides: showGuides,
      });
    } else if (mode === 'standard') {
      renderStandardQrToCanvas(ctx, formattedPayload, size, standardStyle);
    }
  }, [mode, rqrEncoded, formattedPayload, radialStyle, standardStyle, showGuides]);

  // Redraw when dependencies change
  useEffect(() => {
    renderCode();
  }, [renderCode]);

  // Run live automatic decode verification with debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const report = await verifyRenderedCode(
          mode,
          formattedPayload,
          rqrEncoded ? { encoded: rqrEncoded, style: radialStyle } : undefined,
          mode === 'standard' ? { style: standardStyle } : undefined
        );
        if (active) {
          setValidationReport(report);
          setIsValidating(false);
        }
      } catch (err) {
        if (active) {
          setValidationReport({
            isVerified: false,
            format: mode,
            originalPayload: formattedPayload,
            error: String(err),
          });
          setIsValidating(false);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, formattedPayload, rqrEncoded, radialStyle, standardStyle]);

  // Viewport Pan/Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Save current design to store
  const handleSaveDesign = () => {
    saveDesign({
      name: `${mode === 'radial' ? 'Radial' : 'Standard'} Design - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      mode,
      payload: content,
      radialStyle,
      standardStyle,
    });
    setSaveSuccessMessage('Design saved to My Designs!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Perform export
  const handleExecuteExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setExportStatusMessage('Verifying render decodability...');
    const report = await verifyRenderedCode(
      mode,
      formattedPayload,
      rqrEncoded ? { encoded: rqrEncoded, style: radialStyle } : undefined,
      mode === 'standard' ? { style: standardStyle } : undefined
    );

    const filename = `radial-qr-${mode}-${Date.now()}`;

    if (exportFormat === 'png') {
      await downloadPng(canvas, filename, exportResolution);
    } else if (exportFormat === 'svg') {
      const svg = mode === 'radial' && rqrEncoded
        ? generateRadialSvg(rqrEncoded, exportResolution, radialStyle)
        : generateStandardQrSvg(formattedPayload, exportResolution, standardStyle);
      downloadSvg(svg, filename);
    } else if (exportFormat === 'pdf') {
      downloadPdf(
        canvas,
        filename,
        content.kind.toUpperCase(),
        mode === 'radial' ? 'Proprietary RQR1 Radial Format' : 'Universal ISO/IEC 18004 Standard QR'
      );
    }

    setExportStatusMessage('Export completed successfully!');
    setTimeout(() => {
      setExportStatusMessage('');
      setExportModalOpen(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-61px)] overflow-hidden bg-[#090B10]">
      {/* ============================================================== */}
      {/* LEFT PANEL: CONTENT, MODE, AND PRESETS (Scrollable)            */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-[#1B2330] bg-[#121722] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-[#1B2330]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00C8FF]" />
            <span>1. Code Architecture</span>
          </h2>

          {/* MODE TOGGLE: Universal vs Radial */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#090B10] rounded-xl border border-[#1B2330]">
            <button
              onClick={() => setMode('radial')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                mode === 'radial'
                  ? 'bg-gradient-to-r from-[#00C8FF] to-[#176BFF] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Mode B: Radial QR</span>
              <span className={`text-[10px] ${mode === 'radial' ? 'text-black/80 font-semibold' : 'text-[#00C8FF]'}`}>
                Artistic Polar RQR1
              </span>
            </button>

            <button
              onClick={() => setMode('standard')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                mode === 'standard'
                  ? 'bg-white text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Mode A: Universal QR</span>
              <span className={`text-[10px] ${mode === 'standard' ? 'text-black/70 font-semibold' : 'text-emerald-400'}`}>
                100% Smartphone
              </span>
            </button>
          </div>

          {/* Mode Explanation Notice */}
          <div className="mt-3 p-2.5 rounded-lg bg-[#1B2330]/60 border border-[#1B2330] text-[11px] leading-relaxed">
            {mode === 'radial' ? (
              <div className="text-slate-300 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00C8FF] shrink-0 mt-0.5" />
                <span>
                  <strong>Proprietary Radial Format:</strong> Uses concentric angular sectors and polar math. Decoded using the built-in RADIAL QR scanner.
                </span>
              </div>
            ) : (
              <div className="text-slate-300 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Universal Standard QR:</strong> ISO/IEC 18004 compatible with all phone cameras with artistic module styling.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT TYPE SELECTOR */}
        <div className="p-5 border-b border-[#1B2330]">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 block">
            Content Type
          </label>

          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[
              { id: 'url', label: 'URL', icon: Globe },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
              { id: 'contact', label: 'Contact', icon: Contact },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'phone', label: 'Phone', icon: Phone },
              { id: 'sms', label: 'SMS', icon: MessageSquare },
              { id: 'upi', label: 'UPI', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setContent((c) => ({ ...c, kind: id as ContentKind }))}
                className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  content.kind === id
                    ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/40'
                    : 'bg-[#090B10] text-slate-400 hover:text-white border border-[#1B2330]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>

          {/* DYNAMIC CONTENT INPUT FIELDS */}
          {content.kind === 'url' && (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Website URL</label>
              <input
                type="url"
                value={content.rawText}
                onChange={(e) => setContent((c) => ({ ...c, rawText: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}

          {content.kind === 'text' && (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Plain Text</label>
              <textarea
                value={content.rawText}
                onChange={(e) => setContent((c) => ({ ...c, rawText: e.target.value }))}
                placeholder="Enter text payload..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}

          {content.kind === 'wifi' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Network Name (SSID)</label>
                <input
                  type="text"
                  value={content.wifi?.ssid || ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      wifi: { ...(c.wifi || { password: '', encryption: 'WPA', hidden: false }), ssid: e.target.value },
                    }))
                  }
                  placeholder="MyHomeWiFi"
                  className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Password</label>
                <input
                  type="password"
                  value={content.wifi?.password || ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      wifi: { ...(c.wifi || { ssid: '', encryption: 'WPA', hidden: false }), password: e.target.value },
                    }))
                  }
                  placeholder="SecretPassword"
                  className="w-full px-3 py-2 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Security</span>
                <select
                  value={content.wifi?.encryption || 'WPA'}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      wifi: { ...(c.wifi || { ssid: '', password: '', hidden: false }), encryption: e.target.value as any },
                    }))
                  }
                  className="px-2 py-1 bg-[#090B10] border border-[#1B2330] rounded text-white text-xs"
                >
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None (Open)</option>
                </select>
              </div>
            </div>
          )}

          {content.kind === 'contact' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={content.contact?.firstName || ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      contact: { ...(c.contact || { lastName: '', phone: '', email: '', organization: '', title: '', url: '' }), firstName: e.target.value },
                    }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={content.contact?.lastName || ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      contact: { ...(c.contact || { firstName: '', phone: '', email: '', organization: '', title: '', url: '' }), lastName: e.target.value },
                    }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone number"
                value={content.contact?.phone || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    contact: { ...(c.contact || { firstName: '', lastName: '', email: '', organization: '', title: '', url: '' }), phone: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
              <input
                type="email"
                placeholder="Email address"
                value={content.contact?.email || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    contact: { ...(c.contact || { firstName: '', lastName: '', phone: '', organization: '', title: '', url: '' }), email: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}

          {content.kind === 'upi' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="UPI ID / VPA (e.g. name@okhdfcbank)"
                value={content.upi?.payeeAddress || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    upi: { ...(c.upi || { payeeName: '', amount: '100' }), payeeAddress: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
              <input
                type="text"
                placeholder="Payee Name"
                value={content.upi?.payeeName || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    upi: { ...(c.upi || { payeeAddress: '', amount: '100' }), payeeName: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
              <input
                type="number"
                placeholder="Amount (INR)"
                value={content.upi?.amount || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    upi: { ...(c.upi || { payeeAddress: '', payeeName: '' }), amount: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}

          {content.kind === 'email' && (
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Recipient Email"
                value={content.email?.email || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    email: { ...(c.email || { subject: '', body: '' }), email: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
              <input
                type="text"
                placeholder="Subject"
                value={content.email?.subject || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    email: { ...(c.email || { email: '', body: '' }), subject: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}

          {content.kind === 'phone' && (
            <input
              type="tel"
              placeholder="+1 555-0199"
              value={content.phone?.phone || ''}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  phone: { phone: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
            />
          )}

          {content.kind === 'sms' && (
            <div className="space-y-2">
              <input
                type="tel"
                placeholder="Phone Number"
                value={content.sms?.phone || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    sms: { ...(c.sms || { message: '' }), phone: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
              <input
                type="text"
                placeholder="Message"
                value={content.sms?.message || ''}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    sms: { ...(c.sms || { phone: '' }), message: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090B10] border border-[#1B2330] text-xs text-white focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
          )}
        </div>

        {/* QUICK TEMPLATES PRESETS */}
        <div className="p-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 block">
            Starter Templates
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STARTER_TEMPLATES.filter((t) => t.mode === mode).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.radialStyle) setRadialStyle({ ...t.radialStyle });
                  if (t.standardStyle) setStandardStyle({ ...t.standardStyle });
                }}
                className="p-2.5 rounded-xl bg-[#090B10] border border-[#1B2330] hover:border-[#00C8FF]/50 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-[#00C8FF] truncate">
                  {t.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{t.familyLabel}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* CENTER PANEL: LIVE VIEWPORT, ZOOM, PAN & VERIFICATION         */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col bg-[#090B10] relative overflow-hidden">
        {/* Top Viewport Toolbar */}
        <div className="h-12 border-b border-[#1B2330] bg-[#121722]/80 backdrop-blur-md px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">
              {mode === 'radial' ? 'Radial RQR1 Viewport' : 'Standard ISO QR Viewport'}
            </span>
            <span className="text-slate-600">·</span>

            {/* LIVE VERIFICATION BADGE */}
            {isValidating ? (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Verifying decodability...</span>
              </span>
            ) : validationReport?.isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified 100% Decodable</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Decoding Warning: Check Density</span>
              </span>
            )}
          </div>

          {/* Viewport Control Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuides((g) => !g)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showGuides
                  ? 'bg-[#00C8FF]/20 text-[#00C8FF] border-[#00C8FF]/40'
                  : 'bg-[#1B2330] text-slate-400 border-transparent hover:text-white'
              }`}
              title="Toggle Polar Alignment Guides"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-[#1B2330] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-[#1B2330] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-[#1B2330] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-[#1B2330] mx-1" />

            {/* Canvas backdrop selector */}
            <select
              value={canvasBgStyle}
              onChange={(e) => setCanvasBgStyle(e.target.value as any)}
              className="px-2 py-1 bg-[#1B2330] border border-[#1B2330] rounded text-slate-300 text-[11px] focus:outline-none"
            >
              <option value="dark">Dark Canvas</option>
              <option value="grid">Grid Pattern</option>
              <option value="slate">Slate Field</option>
            </select>
          </div>
        </div>

        {/* Viewport Interactive Surface */}
        <div
          className={`flex-1 relative overflow-hidden flex items-center justify-center p-6 select-none cursor-grab active:cursor-grabbing ${
            canvasBgStyle === 'grid'
              ? 'bg-[radial-gradient(#1B2330_1px,transparent_1px)] [background-size:16px_16px]'
              : canvasBgStyle === 'slate'
              ? 'bg-[#121722]'
              : 'bg-[#090B10]'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="transition-transform duration-75 origin-center shadow-2xl rounded-2xl overflow-hidden border border-[#1B2330]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={700}
              height={700}
              className="w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] lg:w-[520px] lg:h-[520px] block"
            />
          </div>

          {/* Quick Payload Floating Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none">
            <div className="p-2 rounded-xl bg-[#121722]/90 backdrop-blur-md border border-[#1B2330] text-[11px] text-slate-400 pointer-events-auto max-w-md truncate">
              <span className="text-slate-400 mr-2 font-mono">Payload:</span>
              <span className="text-white font-mono">{formattedPayload}</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {saveSuccessMessage && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  {saveSuccessMessage}
                </span>
              )}
              <button
                onClick={handleSaveDesign}
                className="p-2.5 rounded-xl bg-[#121722] hover:bg-[#1B2330] border border-[#1B2330] text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-[#00C8FF]" />
                <span>Save Design</span>
              </button>
              <button
                onClick={() => setExportModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,200,255,0.25)] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Code</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* RIGHT PANEL: GEOMETRY, MODULES, GRADIENTS & EXPORT (Scrollable) */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-[#1B2330] bg-[#121722] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-[#1B2330]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#00C8FF]" />
            <span>2. Geometric Styling</span>
          </h2>

          {mode === 'radial' ? (
            /* RADIAL MODE CONTROLS */
            <div className="space-y-5">
              {/* Design Family */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Design Family</label>
                <select
                  value={radialStyle.family}
                  onChange={(e) => setRadialStyle((s) => ({ ...s, family: e.target.value as DesignFamily }))}
                  className="w-full px-3 py-2 bg-[#090B10] border border-[#1B2330] rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="radial-angular">1. Radial Angular (Reference)</option>
                  <option value="spiral-flow">2. Spiral Flow</option>
                  <option value="circular-labyrinth">3. Circular Labyrinth</option>
                  <option value="circuit-matrix">4. Circuit Matrix</option>
                  <option value="concentric-rings">5. Concentric Rings</option>
                  <option value="abstract-hybrid">6. Abstract Hybrid</option>
                </select>
              </div>

              {/* Module Shape */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Module Shape</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['wedge', 'rounded', 'pill', 'circuit', 'faceted'] as ModuleShape[]).map((shp) => (
                    <button
                      key={shp}
                      onClick={() => setRadialStyle((s) => ({ ...s, moduleShape: shp }))}
                      className={`py-1.5 px-2 rounded-lg text-xs capitalize transition-colors cursor-pointer ${
                        radialStyle.moduleShape === shp
                          ? 'bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/40 font-bold'
                          : 'bg-[#090B10] text-slate-400 border border-[#1B2330] hover:text-white'
                      }`}
                    >
                      {shp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ring Count Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Concentric Rings</span>
                  <span className="font-mono text-white">{ringCount}</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={24}
                  value={ringCount}
                  onChange={(e) => setRingCount(Number(e.target.value))}
                  className="w-full accent-[#00C8FF]"
                />
              </div>

              {/* Sector Count Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Angular Sectors</span>
                  <span className="font-mono text-white">{sectorCount}</span>
                </div>
                <input
                  type="range"
                  min={36}
                  max={72}
                  step={4}
                  value={sectorCount}
                  onChange={(e) => setSectorCount(Number(e.target.value))}
                  className="w-full accent-[#00C8FF]"
                />
              </div>

              {/* Rotation Angle Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Rotation Angle</span>
                  <span className="font-mono text-white">{radialStyle.rotation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={radialStyle.rotation}
                  onChange={(e) => setRadialStyle((s) => ({ ...s, rotation: Number(e.target.value) }))}
                  className="w-full accent-[#00C8FF]"
                />
              </div>

              {/* Density / Gap Spacing */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Module Density</span>
                  <span className="font-mono text-white">{Math.round(radialStyle.density * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={0.98}
                  step={0.02}
                  value={radialStyle.density}
                  onChange={(e) => setRadialStyle((s) => ({ ...s, density: Number(e.target.value) }))}
                  className="w-full accent-[#00C8FF]"
                />
              </div>

              {/* Center Anchor Style */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Center Anchor</label>
                <select
                  value={radialStyle.centerAnchorStyle}
                  onChange={(e) => setRadialStyle((s) => ({ ...s, centerAnchorStyle: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-[#090B10] border border-[#1B2330] rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="bullseye">Bullseye Calibrator</option>
                  <option value="target">Target Crosshair</option>
                  <option value="solid">Solid Disk</option>
                  <option value="ring-core">Ring Core</option>
                </select>
              </div>

              {/* Decorative Border */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Border Geometry</label>
                <select
                  value={radialStyle.borderStyle}
                  onChange={(e) => setRadialStyle((s) => ({ ...s, borderStyle: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-[#090B10] border border-[#1B2330] rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="ticks">Scale Ticks (Radar)</option>
                  <option value="compass">Compass Quadrants</option>
                  <option value="rings">Concentric Framing Rings</option>
                  <option value="dots">Circular Perimeter Dots</option>
                </select>
              </div>
            </div>
          ) : (
            /* STANDARD QR CONTROLS */
            <div className="space-y-5">
              {/* Error Correction Level */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Error Correction Level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['L', 'M', 'Q', 'H'] as QrEccLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setStandardStyle((s) => ({ ...s, eccLevel: lvl }))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        standardStyle.eccLevel === lvl
                          ? 'bg-white text-black font-extrabold'
                          : 'bg-[#090B10] text-slate-400 border border-[#1B2330] hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Shape */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Module Shape</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['rounded', 'dots', 'diamonds', 'square', 'fluid', 'circuit'] as QrModuleShape[]).map((shp) => (
                    <button
                      key={shp}
                      onClick={() => setStandardStyle((s) => ({ ...s, moduleShape: shp }))}
                      className={`py-1.5 px-2 rounded-lg text-xs capitalize transition-colors cursor-pointer ${
                        standardStyle.moduleShape === shp
                          ? 'bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/40 font-bold'
                          : 'bg-[#090B10] text-slate-400 border border-[#1B2330] hover:text-white'
                      }`}
                    >
                      {shp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Finder Pattern Style */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Finder Pattern Style</label>
                <select
                  value={standardStyle.finderStyle}
                  onChange={(e) => setStandardStyle((s) => ({ ...s, finderStyle: e.target.value as QrFinderStyle }))}
                  className="w-full px-3 py-2 bg-[#090B10] border border-[#1B2330] rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="rounded">Rounded Box</option>
                  <option value="circle">Double Circle</option>
                  <option value="square">Classic Square</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* COLOR & GRADIENT CONTROLS */}
        <div className="p-5 border-b border-[#1B2330]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Color & Gradients
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Foreground Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={mode === 'radial' ? radialStyle.fgColor : standardStyle.fgColor}
                  onChange={(e) => {
                    const col = e.target.value;
                    if (mode === 'radial') setRadialStyle((s) => ({ ...s, fgColor: col }));
                    else setStandardStyle((s) => ({ ...s, fgColor: col }));
                  }}
                  className="w-7 h-7 rounded border border-[#1B2330] bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">
                  {mode === 'radial' ? radialStyle.fgColor : standardStyle.fgColor}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Gradient Accent</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(mode === 'radial' ? radialStyle.fgColorEnd : standardStyle.fgColorEnd) || '#176BFF'}
                  onChange={(e) => {
                    const col = e.target.value;
                    if (mode === 'radial') setRadialStyle((s) => ({ ...s, fgColorEnd: col }));
                    else setStandardStyle((s) => ({ ...s, fgColorEnd: col }));
                  }}
                  className="w-7 h-7 rounded border border-[#1B2330] bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">
                  {(mode === 'radial' ? radialStyle.fgColorEnd : standardStyle.fgColorEnd) || '#176BFF'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Background</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={mode === 'radial' ? radialStyle.bgColor : standardStyle.bgColor}
                  onChange={(e) => {
                    const col = e.target.value;
                    if (mode === 'radial') setRadialStyle((s) => ({ ...s, bgColor: col }));
                    else setStandardStyle((s) => ({ ...s, bgColor: col }));
                  }}
                  className="w-7 h-7 rounded border border-[#1B2330] bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">
                  {mode === 'radial' ? radialStyle.bgColor : standardStyle.bgColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM EXPORT LAUNCHER BUTTON */}
        <div className="p-5 mt-auto">
          <button
            onClick={() => setExportModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00C8FF] to-[#176BFF] hover:opacity-95 text-black font-bold text-xs transition-all shadow-[0_0_25px_rgba(0,200,255,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Verify & Export Vector/PNG</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* EXPORT CONFIRMATION & VERIFICATION MODAL                        */}
      {/* ============================================================== */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121722] border border-[#1B2330] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-[#00C8FF]" />
              <span>Export Artwork</span>
            </h3>

            <p className="text-xs text-slate-400 mb-5">
              Before downloading, the rendering engine checks image decodability against independent scanners.
            </p>

            {/* Verification Status Card */}
            <div
              className={`p-3.5 rounded-xl border mb-5 flex items-start gap-3 ${
                validationReport?.isVerified
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {validationReport?.isVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <div className="font-bold">
                  {validationReport?.isVerified
                    ? '100% Decodable & Verified'
                    : 'Potential Decoding Obstruction'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {validationReport?.isVerified
                    ? `Payload verified: "${formattedPayload.slice(0, 40)}${formattedPayload.length > 40 ? '...' : ''}"`
                    : validationReport?.error || 'Dense styling may require scanner diagnostic mode'}
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="text-[11px] text-slate-400 mb-1.5 block">File Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'svg', 'pdf'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`py-2 px-3 rounded-xl text-xs uppercase font-bold transition-colors cursor-pointer ${
                      exportFormat === fmt
                        ? 'bg-[#00C8FF] text-black shadow-md'
                        : 'bg-[#090B10] text-slate-300 border border-[#1B2330] hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Selection for PNG/SVG */}
            {exportFormat !== 'pdf' && (
              <div className="mb-6">
                <label className="text-[11px] text-slate-400 mb-1.5 block">Output Resolution</label>
                <div className="grid grid-cols-4 gap-2">
                  {([512, 1024, 2048, 4096] as ExportResolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => setExportResolution(res)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        exportResolution === res
                          ? 'bg-white text-black font-bold'
                          : 'bg-[#090B10] text-slate-400 border border-[#1B2330] hover:text-white'
                      }`}
                    >
                      {res}px
                    </button>
                  ))}
                </div>
              </div>
            )}

            {exportStatusMessage && (
              <div className="text-xs text-center text-[#00C8FF] font-semibold mb-4">
                {exportStatusMessage}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteExport}
                className="px-5 py-2.5 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,200,255,0.3)] cursor-pointer"
              >
                Download Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
