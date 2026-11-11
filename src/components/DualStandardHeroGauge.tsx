// src/components/DualStandardHeroGauge.tsx
// Precision SVG Radial Arc Gauge displaying Dual-Standard AQI with Geometric Severity Badges
// 240-degree open-bottom horseshoe arc (from 150° bottom-left to 30° bottom-right)

import React from 'react';
import { Award, ChevronRight, Layers, ShieldCheck } from 'lucide-react';
import type { DualStandardAQIResult } from '../types/telemetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface DualStandardHeroGaugeProps {
  indices: DualStandardAQIResult;
  activeStandard: 'CPCB' | 'US_EPA';
  onToggleStandard: () => void;
  colorblindMode: boolean;
  isHybridMode: boolean;
  onToggleHybridMode: () => void;
}

export const DualStandardHeroGauge: React.FC<DualStandardHeroGaugeProps> = ({
  indices,
  activeStandard,
  onToggleStandard,
  colorblindMode,
  isHybridMode,
  onToggleHybridMode,
}) => {
  const activeData = activeStandard === 'CPCB' ? indices.cpcb : indices.usEpa;
  const secondaryData = activeStandard === 'CPCB' ? indices.usEpa : indices.cpcb;
  const secondaryLabel = activeStandard === 'CPCB' ? 'US-EPA (2024)' : 'Indian CPCB';

  const severity = getSeverityInfo(activeData.aqi, activeStandard, colorblindMode);

  // SVG Gauge Geometry: 240-degree open-bottom horseshoe arc
  // Starts at 150° (bottom-left) and sweeps clockwise across the top to 390° (30° bottom-right)
  // Leaves the bottom 120° completely OPEN so it never collides with labels!
  const radius = 84;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360); // 240-degree sweep (~351.85px)
  const clampedAqi = Math.max(0, Math.min(500, activeData.aqi));
  const progressRatio = clampedAqi / 500;
  const strokeDashoffset = arcLength - progressRatio * arcLength;

  const pollutantLabels: Record<string, string> = {
    pm2_5: 'PM2.5 (Fine Particulates)',
    pm10: 'PM10 (Coarse Dust)',
    no2: 'NO2 (Nitrogen Dioxide)',
    so2: 'SO2 (Sulfur Dioxide)',
    co: 'CO (Carbon Monoxide)',
    o3: 'Ozone (O3)',
  };

  return (
    <div className="relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glow */}
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: severity.colorHex }}
      />

      {/* Top Header: Title & Hybrid/Station Mode Toggle */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Air Quality Index (AQI)
          </h3>
          <span className="text-xs text-slate-300 font-medium">
            {activeStandard === 'CPCB' ? 'National AQI (CPCB Standard)' : 'US-EPA NAAQS (May 2024)'}
          </span>
        </div>

        {/* Hybrid vs Station Mode Toggle */}
        <button
          type="button"
          onClick={onToggleHybridMode}
          title="Toggle between Strict Ground Station vs Hybrid CAMS Model Enrichment"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
            isHybridMode
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isHybridMode ? 'Hybrid Enriched' : 'Station-Only'}</span>
        </button>
      </div>

      {/* Radial Horseshoe Arc SVG Gauge */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg className="w-60 h-52" viewBox="0 0 220 210">
          {/* Background Horseshoe Track (Open at Bottom) */}
          <circle
            cx="110"
            cy="105"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(150 110 105)"
          />

          {/* Active Colored Progress Arc */}
          <circle
            cx="110"
            cy="105"
            r={radius}
            fill="none"
            stroke={severity.colorHex}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(150 110 105)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Numbers, Category Badge & Primary Driver */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2 pointer-events-none">
          {/* Number + Geometric Icon */}
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: severity.colorHex }}
            >
              {severity.icon}
            </span>
            <span className="text-5xl font-extrabold tracking-tight font-mono text-white">
              {activeData.aqi}
            </span>
          </div>

          {/* Severity Category Pill */}
          <div
            className="mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide shadow-sm"
            style={{
              backgroundColor: `${severity.colorHex}25`,
              color: severity.colorHex,
              border: `1px solid ${severity.colorHex}60`,
            }}
          >
            {severity.category}
          </div>

          {/* Prominent Pollutant Sub-Indicator - Positioned in the open bottom gap */}
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <span>Primary Driver:</span>
            <span className="font-semibold text-slate-200">
              {pollutantLabels[activeData.prominentPollutant] || activeData.prominentPollutant}
            </span>
          </div>
        </div>
      </div>

      {/* CPCB Minimum Data Rule Validation */}
      {activeStandard === 'CPCB' && (
        <div className="mb-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            CPCB Data Rule:{' '}
            <strong className="text-slate-200">
              {indices.cpcb.meetsMinimumDataRule
                ? 'Valid (>=3 pollutants with particulate)'
                : 'Screening (partial sensor array)'}
            </strong>
          </span>
        </div>
      )}

      {/* Dual-Standard Comparison Card (1-Click Switcher) */}
      <div
        onClick={onToggleStandard}
        className="cursor-pointer p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[11px] text-slate-400">Alternative Standard Comparison</div>
            <div className="text-xs font-semibold text-slate-200">
              {secondaryLabel}: <span className="font-mono text-cyan-300">{secondaryData.aqi}</span> ({secondaryData.category})
            </div>
          </div>
        </div>
        <div className="flex items-center text-xs text-cyan-400 font-medium gap-0.5">
          <span>Switch</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
