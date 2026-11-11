// src/components/SocialSharingCardModal.tsx
// Bonus #7: Dynamic HTML5 Canvas Air Quality Sharing Cards (1200x630 Landscape & 1080x1920 Story)

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Check,
  Copy,
  Download,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import type { UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';
import { calculateBerkeleyEarthCigarettes } from '../utils/healthDosimetry.ts';

interface SocialSharingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: UnifiedAirQualityEnvelope;
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
}

type AspectRatioMode = 'landscape' | 'story';

export const SocialSharingCardModal: React.FC<SocialSharingCardModalProps> = ({
  isOpen,
  onClose,
  currentData,
  activeStandard,
  colorblindMode,
}) => {
  const [ratioMode, setRatioMode] = useState<AspectRatioMode>('landscape');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://aetherguard.app';
  const cpcbAqi = currentData.indices.cpcb.aqi;
  const usEpaAqi = currentData.indices.usEpa.aqi;
  const activeAqi = activeStandard === 'CPCB' ? cpcbAqi : usEpaAqi;
  const sev = getSeverityInfo(activeAqi, activeStandard, colorblindMode);

  const pm25Val = currentData.pollutants.pm2_5 ?? 0;
  const pm10Val = currentData.pollutants.pm10 ?? 0;
  const no2Val = currentData.pollutants.no2 ?? 0;
  const so2Val = currentData.pollutants.so2 ?? 0;
  const coVal = currentData.pollutants.co ?? 0;
  const o3Val = currentData.pollutants.o3 ?? 0;

  const cigarettes = calculateBerkeleyEarthCigarettes(pm25Val, 24, false, 'adult');

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLandscape = ratioMode === 'landscape';
    const width = isLandscape ? 1200 : 1080;
    const height = isLandscape ? 630 : 1920;

    canvas.width = width;
    canvas.height = height;

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(0.5, '#030712');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Radial Glow from AQI Severity Color
    const glowX = isLandscape ? width * 0.75 : width * 0.5;
    const glowY = isLandscape ? height * 0.4 : height * 0.35;
    const radial = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, isLandscape ? 500 : 700);
    radial.addColorStop(0, `${sev.colorHex}40`); // 25% opacity
    radial.addColorStop(0.5, `${sev.colorHex}15`); // ~8% opacity
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle Atmospheric Grid Lines
    ctx.strokeStyle = '#1e293b22';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 4. Subtle Outer Border
    ctx.strokeStyle = '#33415566';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Helper: Rounded Rectangle
    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fill: string,
      stroke?: string
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    if (isLandscape) {
      // -------------------------------------------------------------
      // LANDSCAPE LAYOUT (1200 x 630)
      // -------------------------------------------------------------

      // Top Bar Branding & Provenance
      roundRect(48, 44, 280, 36, 18, '#0f172a', '#38bdf844');
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('AETHERGUARD INTELLIGENCE', 64, 67);

      roundRect(340, 44, 400, 36, 18, '#0f172a', '#10b98144');
      ctx.fillStyle = '#10b981';
      ctx.font = '600 12px monospace';
      ctx.fillText('[VERIFIED LIVE CAMS / STATION TELEMETRY]', 356, 67);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('LETS CODE DIWALI CHALLENGE 2026', width - 48, 67);
      ctx.textAlign = 'left';

      // City Name & Coordinates
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentData.location.name, 48, 140);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px system-ui, sans-serif';
      const locSubtitle = `${currentData.location.admin1 || ''} • ${currentData.location.latitude.toFixed(4)}°N, ${currentData.location.longitude.toFixed(4)}°E • Updated: ${new Date(currentData.timestamp.measurementTimeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      ctx.fillText(locSubtitle, 48, 172);

      // Hero AQI Display Card (Left Bento Box)
      const aqiCardX = 48;
      const aqiCardY = 205;
      const aqiCardW = 440;
      const aqiCardH = 345;
      roundRect(aqiCardX, aqiCardY, aqiCardW, aqiCardH, 24, '#0f172a99', `${sev.colorHex}66`);

      // Category Pill
      roundRect(aqiCardX + 28, aqiCardY + 24, 220, 32, 16, `${sev.colorHex}22`, sev.colorHex);
      ctx.fillStyle = sev.colorHex;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`${sev.category.toUpperCase()} ${sev.icon}`, aqiCardX + 44, aqiCardY + 46);

      // Giant Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 96px system-ui, sans-serif';
      ctx.fillText(`${activeAqi}`, aqiCardX + 28, aqiCardY + 150);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(activeStandard === 'CPCB' ? 'INDIAN CPCB NAQI' : 'US-EPA AQI (2024)', aqiCardX + 28, aqiCardY + 185);

      // Dual standard comparison inside card - 3 distinct vertical lines to prevent collisions
      roundRect(aqiCardX + 28, aqiCardY + 210, aqiCardW - 56, 115, 16, '#020617bb', '#334155');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('Dual Standard Correlation:', aqiCardX + 42, aqiCardY + 234);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`CPCB NAQI: ${cpcbAqi} (${currentData.indices.cpcb.category})`, aqiCardX + 42, aqiCardY + 258);
      ctx.fillText(`US-EPA: ${usEpaAqi} (${currentData.indices.usEpa.category})`, aqiCardX + 42, aqiCardY + 282);

      // Right Side: Pollutant Multipliers & Berkeley Cigarettes
      const rightX = 520;
      const rightY = 205;

      // Berkeley Earth Cigarette equivalence card - 2 distinct vertical lines
      roundRect(rightX, rightY, 632, 105, 20, '#1e1b4b66', '#6366f155');
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('🚬 BERKELEY EARTH INHALED DOSIMETRY', rightX + 24, rightY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(`≈ ${cigarettes.cigarettesPerDay} Cigarettes / Day`, rightX + 24, rightY + 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px system-ui, sans-serif';
      ctx.fillText('Equivalent to 24h unmitigated outdoor exposure (1 cig = 22 µg/m³ PM2.5)', rightX + 24, rightY + 84);

      // Six Key Pollutants Chips Grid
      const polCards = [
        { label: 'PM2.5', val: `${pm25Val.toFixed(1)} µg/m³`, sub: `${(pm25Val / 15.0).toFixed(1)}x WHO Limit` },
        { label: 'PM10', val: `${pm10Val.toFixed(1)} µg/m³`, sub: `${(pm10Val / 45.0).toFixed(1)}x WHO Limit` },
        { label: 'NO2', val: `${no2Val.toFixed(1)} µg/m³`, sub: `${(no2Val / 25.0).toFixed(1)}x WHO Limit` },
        { label: 'SO2', val: `${so2Val.toFixed(1)} µg/m³`, sub: `${(so2Val / 40.0).toFixed(1)}x WHO Limit` },
        { label: 'CO', val: `${coVal.toFixed(2)} mg/m³`, sub: `${(coVal / 4.0).toFixed(1)}x WHO Limit` },
        { label: 'Ozone', val: `${o3Val.toFixed(1)} µg/m³`, sub: `${(o3Val / 100.0).toFixed(1)}x WHO Limit` },
      ];

      const chipW = 202;
      const chipH = 75;
      polCards.forEach((c, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = rightX + col * (chipW + 13);
        const cy = rightY + 120 + row * (chipH + 10);

        roundRect(cx, cy, chipW, chipH, 16, '#0f172a88', '#33415588');
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(c.label, cx + 16, cy + 26);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(c.val, cx + 16, cy + 48);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '500 11px system-ui, sans-serif';
        ctx.fillText(c.sub, cx + 16, cy + 65);
      });

      // Bottom Bar with QR Code & Health Action
      const botY = 560;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Scan to inspect live ML forensics & safe outdoor exercise windows ➔', rightX, botY + 28);

      // Draw QR Code
      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, width - 110, botY - 15, 62, 62);
      }
    } else {
      // -------------------------------------------------------------
      // STORY / PORTRAIT LAYOUT (1080 x 1920)
      // -------------------------------------------------------------

      // Top Branding Pill
      roundRect(80, 90, 400, 56, 28, '#0f172a', '#38bdf866');
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('AETHERGUARD INTELLIGENCE', 110, 126);

      roundRect(500, 90, 520, 56, 28, '#0f172a', '#10b98166');
      ctx.fillStyle = '#10b981';
      ctx.font = '600 18px monospace';
      ctx.fillText('[VERIFIED LIVE CAMS / STATION TELEMETRY]', 520, 126);

      // City Name Header
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentData.location.name, 80, 240);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(`${currentData.location.admin1 || ''} • ${currentData.location.latitude.toFixed(4)}°N, ${currentData.location.longitude.toFixed(4)}°E`, 80, 285);
      ctx.fillText(`Telemetry Timestamp: ${new Date(currentData.timestamp.measurementTimeISO).toLocaleString()}`, 80, 325);

      // Giant AQI Card
      const cardY = 380;
      const cardH = 530;
      roundRect(80, cardY, 920, cardH, 36, '#0f172aee', `${sev.colorHex}88`);

      // Severity Category Pill
      roundRect(140, cardY + 50, 420, 60, 30, `${sev.colorHex}25`, sev.colorHex);
      ctx.fillStyle = sev.colorHex;
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(`${sev.category.toUpperCase()} ${sev.icon}`, 175, cardY + 90);

      // Big AQI Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 200px system-ui, sans-serif';
      ctx.fillText(`${activeAqi}`, 140, cardY + 280);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(activeStandard === 'CPCB' ? 'INDIAN CPCB NAQI STANDARD' : 'US-EPA AQI (2024 REVISION)', 140, cardY + 340);

      // Dual standard comparison - 3 lines vertical
      roundRect(140, cardY + 375, 800, 125, 20, '#020617aa', '#334155');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('Dual Standard Correlation:', 170, cardY + 406);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`CPCB NAQI: ${cpcbAqi} (${currentData.indices.cpcb.category})`, 170, cardY + 440);
      ctx.fillText(`US-EPA (2024): ${usEpaAqi} (${currentData.indices.usEpa.category})`, 170, cardY + 472);

      // Berkeley Earth Card
      const berkY = 945;
      roundRect(80, berkY, 920, 185, 32, '#1e1b4bee', '#6366f188');
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('🚬 BERKELEY EARTH INHALED CIGARETTE EQUIVALENCE', 120, berkY + 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px system-ui, sans-serif';
      ctx.fillText(`≈ ${cigarettes.cigarettesPerDay} Cigarettes / Day`, 120, berkY + 102);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Equivalent to 24h unmitigated outdoor exposure (1 cig = 22 µg/m³ PM2.5)', 120, berkY + 144);

      // Six Pollutant Grid
      const gridY = 1165;
      const chipW = 440;
      const chipH = 120;
      const pCols = [
        { label: 'PM2.5 (Fine Particles)', val: `${pm25Val.toFixed(1)} µg/m³`, sub: `${(pm25Val / 15.0).toFixed(1)}x WHO Guideline` },
        { label: 'PM10 (Coarse Particles)', val: `${pm10Val.toFixed(1)} µg/m³`, sub: `${(pm10Val / 45.0).toFixed(1)}x WHO Guideline` },
        { label: 'NO2 (Nitrogen Dioxide)', val: `${no2Val.toFixed(1)} µg/m³`, sub: `${(no2Val / 25.0).toFixed(1)}x WHO Guideline` },
        { label: 'SO2 (Sulfur Dioxide)', val: `${so2Val.toFixed(1)} µg/m³`, sub: `${(so2Val / 40.0).toFixed(1)}x WHO Guideline` },
        { label: 'CO (Carbon Monoxide)', val: `${coVal.toFixed(2)} mg/m³`, sub: `${(coVal / 4.0).toFixed(1)}x WHO Guideline` },
        { label: 'O3 (Ground-level Ozone)', val: `${o3Val.toFixed(1)} µg/m³`, sub: `${(o3Val / 100.0).toFixed(1)}x WHO Guideline` },
      ];

      pCols.forEach((c, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = 80 + col * (chipW + 40);
        const cy = gridY + row * (chipH + 20);

        roundRect(cx, cy, chipW, chipH, 24, '#0f172aee', '#334155');
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(c.label, cx + 24, cy + 38);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(c.val, cx + 24, cy + 74);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText(c.sub, cx + 24, cy + 102);
      });

      // Bottom QR Code & Challenge Seal
      const footerY = 1600;
      roundRect(80, footerY, 920, 220, 32, '#0f172a', '#334155');

      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 120, footerY + 30, 160, 160);
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('Scan to view Live Forecast & Health Lab', 320, footerY + 75);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Built for the LETS CODE DIWALI CHALLENGE 2026', 320, footerY + 115);
      ctx.fillText('Open-Meteo CAMS • CPCB/WAQI Physical Ground Stations', 320, footerY + 145);
    }
  }, [
    ratioMode,
    currentData,
    activeStandard,
    activeAqi,
    cigarettes.cigarettesPerDay,
    cpcbAqi,
    sev.colorHex,
    sev.icon,
    sev.category,
    usEpaAqi,
    pm25Val,
    pm10Val,
    no2Val,
    so2Val,
    coVal,
    o3Val,
  ]);

  useEffect(() => {
    if (isOpen) {
      // Allow slight timeout for QR code canvas to render in hidden DOM
      const timer = setTimeout(() => {
        renderCanvas();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, ratioMode, renderCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AetherGuard-AQI-${currentData.location.name}-${ratioMode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsGenerating(false);
    }, 'image/png');
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write failed, fallback to download:', err);
      handleDownload();
    }
  };

  const handleWebShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `AetherGuard-${currentData.location.name}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `Air Quality in ${currentData.location.name}: AQI ${activeAqi}`,
              text: `Current air quality in ${currentData.location.name} is ${activeAqi} (${sev.category}). Equal to smoking ${cigarettes.cigarettesPerDay} cigarettes today. Check live analytics on AetherGuard.`,
              url: window.location.href,
              files: [file],
            });
          } catch (e) {
            console.warn('Web Share dismissed or failed:', e);
          }
        }
      });
    } else {
      handleCopyClipboard();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden QR Code source element for Canvas to grab */}
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas value={shareUrl} size={200} bgColor="#0f172a" fgColor="#38bdf8" />
      </div>

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Social AQI Sharing Card Generator</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">
                  Bonus #7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate high-resolution PNG cards with verified provenance, dual standards & cigarette equivalence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Switcher Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRatioMode('landscape')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                ratioMode === 'landscape'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1200 × 630 (Twitter / LinkedIn)
            </button>
            <button
              type="button"
              onClick={() => setRatioMode('story')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                ratioMode === 'story'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1080 × 1920 (Instagram Story / WhatsApp)
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Rendered in pure HTML5 2D Canvas
          </span>
        </div>

        {/* Live Canvas Preview */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/40">
          <div className="w-full flex justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-2xl shadow-2xl border border-slate-800/80 max-h-[55vh] object-contain transition-all ${
                ratioMode === 'landscape' ? 'w-full max-w-2xl' : 'w-auto'
              }`}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Includes real-time AQI, WHO guidance, and verified CAMS telemetry badge</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Image!' : 'Copy to Clipboard'}</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleWebShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/60 text-xs font-semibold transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-900/30"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Rendering...' : 'Download PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
