// src/components/VentilationButlerRibbon.tsx
// Sprint 3: The "Window & Ventilation Butler" 24-Hour Horizon Ribbon
// Visual diurnal atmospheric mixing ribbon showing Planetary Boundary Layer Height (PBLH) & Ventilation Windows

import React, { useState } from 'react';
import { Clock, DoorOpen } from 'lucide-react';
import type { HourlyTelemetryPoint } from '../types/telemetry.ts';

interface VentilationButlerRibbonProps {
  forecastPoints: HourlyTelemetryPoint[];
  currentAqi?: number;
}

export const VentilationButlerRibbon: React.FC<VentilationButlerRibbonProps> = ({
  forecastPoints,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take the 24 hours of today / upcoming diurnal cycle
  const day24 = forecastPoints.slice(0, 24);

  return (
    <div className="mineral-card p-5 rounded-3xl space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <DoorOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Window & Ventilation Butler — 24h Atmospheric Ribbon
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                PBLH Convective Model
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies natural diurnal windows when the thermal inversion lid lifts, allowing safe home aeration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300 text-[11px]">Safe Aeration Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300 text-[11px]">Thermal Inversion Trap</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Horizon Visual Strip */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-2">
          {day24.map((pt, i) => {
            const d = new Date(pt.timeISO);
            const hour = d.getHours();
            const pblh = Math.round(pt.meteorology?.boundaryLayerHeightM || 400);
            const aqi = pt.cpcbAqi;

            // Favorable mixing window: afternoon hours with high PBLH and moderate/good AQI
            const isFavorable = pblh >= 750 && aqi <= 160;
            const isSevereInversion = pblh < 500 && (hour >= 18 || hour <= 8);

            return (
              <div
                key={pt.timeISO}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`relative flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isFavorable
                    ? 'bg-emerald-950/60 border-emerald-500/50 hover:bg-emerald-900/80 shadow-sm shadow-emerald-500/20'
                    : isSevereInversion
                    ? 'bg-rose-950/60 border-rose-800/60 hover:bg-rose-900/80'
                    : 'bg-slate-900/60 border-white/[0.06] hover:bg-slate-800/80'
                }`}
              >
                {/* Visual Height Bar representing PBLH */}
                <div className="w-full h-12 flex items-end justify-center">
                  <div
                    className={`w-full rounded-md transition-all ${
                      isFavorable
                        ? 'bg-emerald-400'
                        : isSevereInversion
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                    style={{
                      height: `${Math.min(100, Math.max(20, (pblh / 1500) * 100))}%`,
                      opacity: hoveredIdx === i ? 1 : 0.8,
                    }}
                  />
                </div>

                {/* Hour Label */}
                <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                  {hour}:00
                </span>

                {/* Small indicator icon */}
                <div className="mt-0.5">
                  {isFavorable ? (
                    <span className="text-[9px] text-emerald-400">🪟</span>
                  ) : isSevereInversion ? (
                    <span className="text-[9px] text-rose-400">🔒</span>
                  ) : (
                    <span className="text-[9px] text-slate-500">•</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Detail Card on Hover */}
        {hoveredIdx !== null && day24[hoveredIdx] && (
          <div className="mineral-well p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-200">
                {new Date(day24[hoveredIdx].timeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">
                Planetary Boundary Layer: <strong className="font-mono text-white">{Math.round(day24[hoveredIdx].meteorology?.boundaryLayerHeightM || 0)}m</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">
                Forecast AQI: <strong className="font-mono text-amber-300">{day24[hoveredIdx].cpcbAqi}</strong>
              </span>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              (day24[hoveredIdx].meteorology?.boundaryLayerHeightM || 0) >= 750 && day24[hoveredIdx].cpcbAqi <= 160
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {(day24[hoveredIdx].meteorology?.boundaryLayerHeightM || 0) >= 750 && day24[hoveredIdx].cpcbAqi <= 160
                ? '🟢 Recommended Window: Open Balcony & Air Home'
                : '🔒 Inversion Trap: Seal Windows, Run Purifier'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
