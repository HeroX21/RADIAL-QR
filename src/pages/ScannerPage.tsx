/**
 * Unified Multi-Stage Scanner Workspace.
 * Priority Cascade:
 * 1. Standard QR via jsQR
 * 2. Radial QR via Custom RQR1 Computer Vision Decoder
 *
 * Supports live camera stream, rear/front toggle, torch, file drag-and-drop,
 * clipboard paste, diagnostic overlays and formatted action triggers.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { decodeRadialImageData, RadialDecodeResult, RadialDecodeDiagnostics } from '../core/radialDecoder';
import { detectScannedContentType, ContentKind } from '../core/contentTypes';
import { addScanHistoryItem } from '../data/designStore';
import {
  Camera,
  ScanLine,
  Upload,
  Clipboard,
  SwitchCamera,
  Flashlight,
  ZoomIn,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Layers,
  Crosshair,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ScanResult {
  format: 'standard' | 'radial';
  payload: string;
  kindInfo: {
    kind: ContentKind;
    summary: string;
    actionLabel: string;
    actionUrl?: string;
  };
  diagnostics?: RadialDecodeDiagnostics;
  timestamp: string;
}

export const ScannerPage: React.FC = () => {
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);

  // Result state
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Play pleasant chime on successful scan
  const playSuccessChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext policy
    }
  }, [soundEnabled]);

  // Handle successful decoded payload
  const handleScanSuccess = useCallback(
    (format: 'standard' | 'radial', payload: string, diagnostics?: RadialDecodeDiagnostics) => {
      setIsScanning(false);
      playSuccessChime();

      const kindInfo = detectScannedContentType(payload);
      const result: ScanResult = {
        format,
        payload,
        kindInfo,
        diagnostics,
        timestamp: new Date().toLocaleTimeString(),
      };

      setScanResult(result);

      // Record to persistent scan history
      addScanHistoryItem({
        format,
        payload,
        kind: kindInfo.kind,
        confidence: diagnostics?.confidence || 1.0,
        errorsCorrected: diagnostics?.errorsCorrected || 0,
      });
    },
    [playSuccessChime]
  );

  // Core image decoding pipeline
  const processImagePixels = useCallback(
    (imageData: ImageData): boolean => {
      // 1. Try Standard QR Decoder first
      const stdCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (stdCode && stdCode.data) {
        handleScanSuccess('standard', stdCode.data);
        return true;
      }

      // 2. Try Custom Radial QR Decoder
      const radialRes = decodeRadialImageData(imageData);
      if (radialRes.success && radialRes.text) {
        handleScanSuccess('radial', radialRes.text, radialRes.diagnostics);
        return true;
      }

      return false;
    },
    [handleScanSuccess]
  );

  // Continuous Camera Scanning Loop
  const scanVideoFrame = useCallback(() => {
    if (!isScanning) return;

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const overlay = overlayCanvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Run multi-stage detection
        const found = processImagePixels(imgData);

        // Render diagnostics on overlay canvas
        if (overlay) {
          overlay.width = video.clientWidth;
          overlay.height = video.clientHeight;
          const oCtx = overlay.getContext('2d');
          if (oCtx) {
            oCtx.clearRect(0, 0, overlay.width, overlay.height);

            // Draw targeting reticle
            const cx = overlay.width / 2;
            const cy = overlay.height / 2;
            const reticleR = Math.min(cx, cy) * 0.65;

            oCtx.strokeStyle = found ? '#10B981' : '#00C8FF';
            oCtx.lineWidth = 2;
            oCtx.beginPath();
            oCtx.arc(cx, cy, reticleR, 0, Math.PI * 2);
            oCtx.stroke();

            // Corner brackets
            oCtx.lineWidth = 3;
            const bLen = 20;
            // Top-left
            oCtx.beginPath();
            oCtx.moveTo(cx - reticleR, cy - reticleR + bLen);
            oCtx.lineTo(cx - reticleR, cy - reticleR);
            oCtx.lineTo(cx - reticleR + bLen, cy - reticleR);
            // Top-right
            oCtx.moveTo(cx + reticleR - bLen, cy - reticleR);
            oCtx.lineTo(cx + reticleR, cy - reticleR);
            oCtx.lineTo(cx + reticleR, cy - reticleR + bLen);
            // Bottom-left
            oCtx.moveTo(cx - reticleR, cy + reticleR - bLen);
            oCtx.lineTo(cx - reticleR, cy + reticleR);
            oCtx.lineTo(cx - reticleR + bLen, cy + reticleR);
            // Bottom-right
            oCtx.moveTo(cx + reticleR - bLen, cy + reticleR);
            oCtx.lineTo(cx + reticleR, cy + reticleR);
            oCtx.lineTo(cx + reticleR, cy + reticleR - bLen);
            oCtx.stroke();
          }
        }

        if (found) return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [isScanning, processImagePixels]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (trackRef.current) {
        trackRef.current.stop();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Check torch capability
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities.torch));

      setStreamActive(true);
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Enable camera access in your browser or upload an image.'
          : 'Could not initialize camera stream. You can upload or paste an image below.'
      );
      setStreamActive(false);
    }
  }, [facingMode]);

  // Toggle Camera Facing
  const toggleFacingMode = () => {
    setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!trackRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await (trackRef.current as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error:', err);
    }
  };

  // Start stream on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (trackRef.current) {
        trackRef.current.stop();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [startCamera]);

  // Start scanning frame loop
  useEffect(() => {
    if (streamActive && isScanning) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [streamActive, isScanning, scanVideoFrame]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  // Handle Clipboard Paste
  const handlePasteClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processImageFile(new File([blob], 'clipboard.png', { type: imageType }));
          return;
        }
      }
      alert('No image found on clipboard');
    } catch {
      alert('Clipboard access permission not granted or unsupported');
    }
  };

  // Process uploaded or pasted image file
  const processImageFile = (file: File) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const found = processImagePixels(imgData);

        if (!found) {
          alert('Could not decode QR code. Ensure the code is clear and well-lit.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyPayload = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRescan = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#090B10] p-6 max-w-5xl mx-auto w-full select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ScanLine className="w-6 h-6 text-[#00C8FF]" />
            <span>Universal & Radial Code Scanner</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automatic multi-stage detection: ISO Standard QR + Proprietary Radial RQR1.
          </p>
        </div>

        {/* Viewport Control Badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiagnostics((d) => !d)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showDiagnostics
                ? 'bg-[#00C8FF]/15 text-[#00C8FF] border-[#00C8FF]/30'
                : 'bg-[#121722] text-slate-400 border-[#1B2330] hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>

          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-2 rounded-xl bg-[#121722] border border-[#1B2330] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Scan Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00C8FF]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAIN SCANNING WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* VIEWPORT / CAMERA CONTAINER (2 Cols) */}
        <div className="lg:col-span-2 relative rounded-2xl bg-[#121722] border border-[#1B2330] overflow-hidden flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px]">
          {/* Hidden Canvas for Frame Processing */}
          <canvas ref={captureCanvasRef} className="hidden" />

          {/* Camera Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
              streamActive && isScanning ? 'opacity-100' : 'opacity-20'
            }`}
          />

          {/* Overlay Diagnostics Canvas */}
          <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Camera Permission / Error Fallback Notice */}
          {cameraError && (
            <div className="relative z-10 p-6 rounded-2xl bg-[#090B10]/90 border border-[#1B2330] max-w-md text-center m-4">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-2">Camera Unavailable</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-[#1B2330] hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Retry Camera Connection
              </button>
            </div>
          )}

          {/* In-View Controls Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-[#090B10]/80 backdrop-blur-md border border-[#1B2330] text-[11px] font-mono text-slate-300 pointer-events-auto flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>{isScanning ? 'SCANNING ACTIVE' : 'CODE CAPTURED'}</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
                    torchOn
                      ? 'bg-amber-400 text-black border-amber-400'
                      : 'bg-[#090B10]/80 text-slate-300 border-[#1B2330] hover:text-white'
                  }`}
                  title="Toggle Flashlight"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-[#1B2330] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Rescan Button overlay when result is ready */}
          {!isScanning && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30">
              <button
                onClick={handleRescan}
                className="px-6 py-3 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-sm transition-all shadow-[0_0_25px_rgba(0,200,255,0.3)] flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Another Code</span>
              </button>
            </div>
          )}
        </div>

        {/* RESULT & ALTERNATE INPUTS (1 Col) */}
        <div className="flex flex-col gap-6">
          {/* DECODED RESULT CARD */}
          {scanResult ? (
            <div className="p-6 rounded-2xl bg-[#121722] border border-[#00C8FF]/40 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      scanResult.format === 'radial'
                        ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {scanResult.format === 'radial' ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {scanResult.format === 'radial' ? 'RADIAL QR (RQR1)' : 'STANDARD QR (ISO)'}
                    </span>
                  </span>

                  <span className="text-[11px] text-slate-400">{scanResult.timestamp}</span>
                </div>

                <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1">
                  {scanResult.kindInfo.kind}
                </div>
                <div className="text-sm font-semibold text-white mb-4 break-words">
                  {scanResult.kindInfo.summary}
                </div>

                {/* Diagnostics summary if Radial */}
                {scanResult.diagnostics && (
                  <div className="p-3 rounded-xl bg-[#090B10] border border-[#1B2330] text-[11px] font-mono text-slate-300 space-y-1 mb-5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-emerald-400 font-bold">
                        {Math.round(scanResult.diagnostics.confidence * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rings / Sectors:</span>
                      <span>{scanResult.diagnostics.ringsDetected}R · {scanResult.diagnostics.sectorsDetected}S</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Orientation:</span>
                      <span>{Math.round((scanResult.diagnostics.orientationAngle * 180) / Math.PI)}°</span>
                    </div>
                    {scanResult.diagnostics.errorsCorrected > 0 && (
                      <div className="flex justify-between text-[#00C8FF]">
                        <span>RS Corrected:</span>
                        <span>{scanResult.diagnostics.errorsCorrected} bytes</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {scanResult.kindInfo.actionUrl && (
                  <a
                    href={scanResult.kindInfo.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00C8FF] hover:bg-[#38BDF8] text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>{scanResult.kindInfo.actionLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={handleCopyPayload}
                  className="w-full py-2 px-4 rounded-xl bg-[#1B2330] hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Raw Payload'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#121722] border border-[#1B2330] text-center flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-12 h-12 rounded-2xl bg-[#1B2330] flex items-center justify-center text-[#00C8FF] mb-3">
                <Crosshair className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Awaiting Code</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Position any standard QR or Radial RQR1 code within the frame reticle.
              </p>
            </div>
          )}

          {/* ALTERNATIVE INPUT CHANNELS */}
          <div className="p-5 rounded-2xl bg-[#121722] border border-[#1B2330]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Alternative Inputs
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <label className="p-3 rounded-xl bg-[#090B10] border border-[#1B2330] hover:border-[#00C8FF]/50 text-slate-300 hover:text-white transition-colors flex flex-col items-center gap-1.5 cursor-pointer text-xs font-semibold">
                <Upload className="w-4 h-4 text-[#00C8FF]" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handlePasteClipboard}
                className="p-3 rounded-xl bg-[#090B10] border border-[#1B2330] hover:border-[#00C8FF]/50 text-slate-300 hover:text-white transition-colors flex flex-col items-center gap-1.5 cursor-pointer text-xs font-semibold"
              >
                <Clipboard className="w-4 h-4 text-[#00C8FF]" />
                <span>Paste Image</span>
              </button>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 text-center">
              Drag & drop images anywhere into this window
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
