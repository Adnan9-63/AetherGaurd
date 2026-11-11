// src/components/CitizenActionMatrix.tsx
// Sprint 2: Sticky "3-Second Citizen Action Matrix"
// Answers a citizen's immediate daily questions in 3 seconds: Exercise, Home Ventilation, Mask

import React from 'react';
import {
  Activity,
  DoorClosed,
  DoorOpen,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { findSafeOutdoorActivityWindow } from '../utils/healthDosimetry.ts';

interface CitizenActionMatrixProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  viewMode?: 'UNIFIED' | 'CITIZEN' | 'LAB';
  onNavigateToSafeWindow?: () => void;
}

export const CitizenActionMatrix: React.FC<CitizenActionMatrixProps> = ({
  currentData,
  forecastPoints,
  activeStandard,
  viewMode = 'UNIFIED',
  onNavigateToSafeWindow,
}) => {
  const aqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
  const pm25 = currentData.pollutants.pm2_5 ?? 45;
  const pblh = Math.round(currentData.meteorology.boundaryLayerHeightM || 450);

  // 1. Calculate Safe Window Today
  const safeWindow = findSafeOutdoorActivityWindow(forecastPoints, 2);
  const safeStart = safeWindow
    ? new Date(safeWindow.bestWindowStartISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '14:30';
  const safeEnd = safeWindow
    ? new Date(safeWindow.bestWindowEndISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '16:30';

  // Find max PBLH slot today (typically 13:00 - 16:00)
  const maxPblhPoint = forecastPoints.slice(0, 24).reduce((max, pt) => {
    const val = pt.meteorology?.boundaryLayerHeightM || 0;
    return val > (max.meteorology?.boundaryLayerHeightM || 0) ? pt : max;
  }, forecastPoints[0] || { meteorology: { boundaryLayerHeightM: 850 } });

  const maxPblhVal = Math.round(maxPblhPoint?.meteorology?.boundaryLayerHeightM || 850);

  // Inhaled particulate dose rate at running (Ve = 60 L/min) in ug/hr
  const runningDoseUgHr = Math.round(pm25 * 0.06 * 60);

  // Card 1: Outdoor Exercise Status
  const isExerciseSafe = aqi <= 60;
  const isExerciseModerate = aqi > 60 && aqi <= 150;

  // Card 2: Window & Ventilation Status
  const isWindowSafeToOpen = aqi <= 90 && pblh >= 650;

  // Card 3: Mask Status
  const isMaskMandatory = aqi > 150;
  const isMaskRecommended = aqi > 75 && aqi <= 150;

  const isCitizenExpanded = viewMode === 'CITIZEN';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            3-Second Action Matrix (Citizen Safety Protocol)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Continuous Epidemiological Assessment
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Outdoor Exercise & Commute */}
        <div
          onClick={onNavigateToSafeWindow}
          className={`mineral-card p-4 rounded-2xl transition-all cursor-pointer hover:border-white/20 group relative overflow-hidden ${
            isCitizenExpanded ? 'ring-1 ring-emerald-500/30' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${
                isExerciseSafe
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : isExerciseModerate
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200">OUTDOOR EXERCISE</span>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isExerciseSafe
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : isExerciseModerate
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                : 'bg-rose-950/80 text-rose-300 border-rose-700/80'
            }`}>
              {isExerciseSafe ? 'Safe for All' : isExerciseModerate ? 'Reduce Exertion' : 'High Risk: Stay In'}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <div className="text-xs text-slate-300 leading-snug">
              {isExerciseSafe
                ? 'Atmospheric conditions favor outdoor workouts and brisk cardio.'
                : isExerciseModerate
                ? 'Sensitive groups should avoid strenuous runs. Shift to moderate walking.'
                : `Avoid outdoor workouts. Running deposits ~${runningDoseUgHr} µg/hr of fine soot directly into deep alveoli.`}
            </div>

            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Best Window Today:</span>
              <span className="font-bold text-emerald-300 font-mono group-hover:underline flex items-center gap-1">
                <span>{safeStart} – {safeEnd} IST</span>
                <span className="text-[10px]">➔</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Window & Ventilation Butler */}
        <div className={`mineral-card p-4 rounded-2xl transition-all ${
          isCitizenExpanded ? 'ring-1 ring-amber-500/30' : ''
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${
                isWindowSafeToOpen
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                {isWindowSafeToOpen ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
              </div>
              <span className="text-xs font-bold text-slate-200">HOME VENTILATION</span>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isWindowSafeToOpen
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : 'bg-rose-950/80 text-rose-300 border-rose-700/80'
            }`}>
              {isWindowSafeToOpen ? '🟢 Open Windows' : '🔒 Keep Windows Sealed'}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <div className="text-xs text-slate-300 leading-snug">
              {isWindowSafeToOpen
                ? 'Boundary layer has lifted. Open windows for 45 min to flush indoor stale CO2.'
                : `Thermal inversion lid is low (${pblh}m). Keep balcony & doors sealed with indoor HEPA filtration active.`}
            </div>

            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Next Natural Slot:</span>
              <span className="font-semibold text-slate-200 font-mono">
                {safeStart} (Lid: {maxPblhVal}m)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Respirator & Child Protection */}
        <div className={`mineral-card p-4 rounded-2xl transition-all ${
          isCitizenExpanded ? 'ring-1 ring-rose-500/30' : ''
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${
                !isMaskRecommended && !isMaskMandatory
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : isMaskRecommended
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                {isMaskMandatory ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <span className="text-xs font-bold text-slate-200">RESPIRATOR & CHILDREN</span>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              !isMaskRecommended && !isMaskMandatory
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : isMaskRecommended
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                : 'bg-rose-950/80 text-rose-300 border-rose-700/80'
            }`}>
              {isMaskMandatory ? '⚠️ N95 Mandatory' : isMaskRecommended ? 'N95 for Sensitive' : 'No Mask Needed'}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <div className="text-xs text-slate-300 leading-snug">
              {isMaskMandatory
                ? 'Certified N95/FFP2 respirator reduces capillary PM2.5 blood entry by 90%.'
                : isMaskRecommended
                ? 'Asthmatics and elderly should wear an N95 mask near major road corridors.'
                : 'Particulate density is within safe baseline limits for all age groups.'}
            </div>

            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Child Risk Factor:</span>
              <span className="font-semibold text-amber-300 font-mono">
                2.5x adult intake/kg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
