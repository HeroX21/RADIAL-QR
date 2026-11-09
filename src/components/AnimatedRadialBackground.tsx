/**
 * Interactive Animated Radial Geometric Canvas Background.
 * Renders rotating concentric geometric arc segments, ticks and pulse rings.
 */

import React, { useEffect, useRef } from 'react';

export const AnimatedRadialBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseR = Math.min(width, height) * 0.38;

      ctx.clearRect(0, 0, width, height);

      // Deep radial background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 1.6);
      bgGrad.addColorStop(0, 'rgba(0, 200, 255, 0.07)');
      bgGrad.addColorStop(0.5, 'rgba(23, 107, 255, 0.03)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      angle += 0.003;

      // Draw 6 concentric rotating geometric rings
      const ringSpecs = [
        { r: baseR * 0.35, count: 18, span: 0.12, speed: 1.0, color: 'rgba(0, 200, 255, 0.25)', width: 8 },
        { r: baseR * 0.52, count: 24, span: 0.08, speed: -0.7, color: 'rgba(23, 107, 255, 0.3)', width: 12 },
        { r: baseR * 0.70, count: 36, span: 0.05, speed: 0.5, color: 'rgba(0, 200, 255, 0.2)', width: 10 },
        { r: baseR * 0.88, count: 48, span: 0.035, speed: -0.4, color: 'rgba(56, 189, 248, 0.25)', width: 14 },
        { r: baseR * 1.05, count: 64, span: 0.025, speed: 0.3, color: 'rgba(0, 200, 255, 0.15)', width: 6 },
        { r: baseR * 1.25, count: 12, span: 0.2, speed: -0.2, color: 'rgba(23, 107, 255, 0.12)', width: 16 },
      ];

      for (const spec of ringSpecs) {
        const ringAngle = angle * spec.speed;
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = spec.width;

        const step = (Math.PI * 2) / spec.count;
        for (let i = 0; i < spec.count; i++) {
          if (i % 2 === 0) continue; // broken alternating segments
          const aStart = i * step + ringAngle;
          const aEnd = aStart + step * (1 - spec.span);

          ctx.beginPath();
          ctx.arc(cx, cy, spec.r, aStart, aEnd);
          ctx.stroke();
        }
      }

      // Outer compass ticks
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      const tickRadius = baseR * 1.4;
      for (let i = 0; i < 72; i++) {
        const a = (i * Math.PI * 2) / 72 + angle * 0.1;
        const len = i % 9 === 0 ? 12 : 5;
        const x1 = cx + tickRadius * Math.cos(a);
        const y1 = cy + tickRadius * Math.sin(a);
        const x2 = cx + (tickRadius + len) * Math.cos(a);
        const y2 = cy + (tickRadius + len) * Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Center glowing core
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.12)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#00C8FF';
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
      aria-hidden="true"
    />
  );
};
