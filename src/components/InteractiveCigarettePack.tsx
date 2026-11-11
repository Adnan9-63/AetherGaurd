// src/components/InteractiveCigarettePack.tsx
// Sprint 3: Interactive "Berkeley Earth Cigarette Pack & N95 Shield" Visualizer
// Replaces static text with a tactile, visual cigarette row and interactive mitigation toggles

import React, { useState } from 'react';
import { Baby, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import { calculateBerkeleyEarthCigarettes } from '../utils/healthDosimetry.ts';

interface InteractiveCigarettePackProps {
  pm25: number;
}

export const InteractiveCigarettePack: React.FC<InteractiveCigarettePackProps> = ({ pm25 }) => {
  const [simulateN95, setSimulateN95] = useState(false);
  const [isChildMode, setIsChildMode] = useState(false);

  // Compute baseline vs mitigated
  const baseResult = calculateBerkeleyEarthCigarettes(pm25, 24, false, isChildMode ? 'child' : 'adult');
  const baseCigs = baseResult.cigarettesPerDay;

  // With N95: 90% reduction in inhaled dose
  const effectiveCigs = simulateN95 ? Number((baseCigs * 0.1).toFixed(1)) : baseCigs;
  const cigsSaved = simulateN95 ? Number((baseCigs * 0.9).toFixed(1)) : 0;
  const lifeMinutesLost = Math.round(effectiveCigs * 11);

  // Number of visual cigarette slots to display (max 10)
  const fullCigarettes = Math.floor(effectiveCigs);
  const partialFraction = effectiveCigs - fullCigarettes;
  const maxDisplay = Math.min(10, Math.max(1, Math.ceil(effectiveCigs)));

  return (
    <div className="mineral-card p-5 rounded-3xl space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <HeartPulse className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Berkeley Earth Cigarette Equivalence & N95 Shield
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                1 Cig = 22 µg/m³ PM2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Epidemiological translation of 24h unmitigated outdoor particulate mass inhalation into smoked cigarettes
            </p>
          </div>
        </div>

        {/* Interactive Toggles */}
        <div className="flex items-center gap-2">
          {/* N95 Simulator Pill */}
          <button
            type="button"
            onClick={() => setSimulateN95(!simulateN95)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              simulateN95
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{simulateN95 ? 'N95 Shield Active (-90%)' : 'Simulate N95 Mask'}</span>
          </button>

          {/* Child Vulnerability Toggle */}
          <button
            type="button"
            onClick={() => setIsChildMode(!isChildMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isChildMode
                ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Baby className="w-3.5 h-3.5 text-amber-400" />
            <span>{isChildMode ? 'Child (2.5x/kg)' : 'Adult (1.0x)'}</span>
          </button>
        </div>
      </div>

      {/* Visual Cigarette Row */}
      <div className="mineral-well p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-white tabular-nums">
              ≈ {effectiveCigs}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Cigarettes Inhaled Today
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Biological Life Tax:</span>
            <span className="text-sm font-bold font-mono text-rose-400">
              -{lifeMinutesLost} Life-Minutes / Day
            </span>
          </div>
        </div>

        {/* Tactile SVG Cigarette Sticks Visualizer */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {Array.from({ length: maxDisplay }).map((_, i) => {
            const isFull = i < fullCigarettes;
            const isPartial = i === fullCigarettes && partialFraction > 0;
            const fillWidth = isFull ? '100%' : isPartial ? `${Math.round(partialFraction * 100)}%` : '0%';

            return (
              <div
                key={i}
                className="relative w-9 h-20 rounded-md bg-slate-900 border border-slate-700/80 flex flex-col justify-between overflow-hidden shadow-sm"
              >
                {/* Glowing ember tip */}
                <div
                  className="w-full h-2 transition-all"
                  style={{
                    backgroundColor: isFull || isPartial ? '#EF4444' : '#334155',
                    boxShadow: isFull || isPartial ? '0 0 8px #F97316' : 'none',
                  }}
                />

                {/* Cigarette paper body with fill */}
                <div className="flex-1 w-full bg-slate-800/50 relative">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-slate-200/90 transition-all duration-500"
                    style={{ height: fillWidth }}
                  />
                </div>

                {/* Orange filter cork */}
                <div className="w-full h-5 bg-amber-700/80 border-t border-amber-600/40" />
              </div>
            );
          })}

          {simulateN95 && (
            <div className="ml-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/70 text-xs text-emerald-300 space-y-0.5 animate-fadeIn">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                N95 Filtration Benefit:
              </span>
              <p className="text-[11px] text-emerald-200/90">
                Extinguished <strong>{cigsSaved}</strong> cigarettes! Preserved ~<strong>{Math.round(cigsSaved * 11)}</strong> minutes of physiological lifespan today.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
