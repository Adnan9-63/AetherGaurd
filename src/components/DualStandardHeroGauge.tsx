// src/components/DualStandardHeroGauge.tsx
// Sprint 2: The "Breathing Vitality Ring" & Dual-Standard Radial Instrument
// 240-degree open-bottom horseshoe arc with dynamic breathing pulse & zero text collisions

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
  const secondaryLabel = activeStandard === 'CPCB' ? 'US-EPA (2024)' : 'Indian CPCB NAQI';

  const severity = getSeverityInfo(activeData.aqi, activeStandard, colorblindMode);

  // SVG Gauge Geometry: 240-degree open-bottom horseshoe arc
  // Starts at 150° (bottom-left) and sweeps clockwise across top to 30° (bottom-right)
  // Leaves the bottom 120° completely OPEN so it never collides with labels!
  const radius = 82;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360); // ~343.48px
  const clampedAqi = Math.max(0, Math.min(500, activeData.aqi));
  const progressRatio = clampedAqi / 500;
  const strokeDashoffset = arcLength - progressRatio * arcLength;

  const pollutantLabels: Record<string, string> = {
    pm2_5: 'PM2.5 (Fine Particulates)',
    pm10: 'PM10 (Coarse Dust)',
    no2: 'NO2 (Nitrogen Dioxide)',
    so2: 'SO2 (Sulfur Dioxide)',
    co: 'CO (Carbon Monoxide)',
    o3: 'Ozone (O3 8h)',
  };

  return (
    <div className="relative p-6 rounded-3xl mineral-card shadow-2xl overflow-hidden flex flex-col justify-between space-y-4">
      {/* Dynamic Atmospheric State Wash from Top */}
      <div
        className="absolute top-0 left-0 right-0 h-40 blur-3xl pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: severity.washRgba }}
      />

      {/* Top Bar: Title & Model Mode Switcher */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase font-mono block">
            Atmospheric Vitality Instrument
          </span>
          <span className="text-xs text-stone-200 font-semibold">
            {activeStandard === 'CPCB' ? 'Indian CPCB NAQI Standard' : 'US-EPA NAAQS (May 2024)'}
          </span>
        </div>

        {/* Hybrid vs Station Mode Toggle */}
        <button
          type="button"
          onClick={onToggleHybridMode}
          title="Toggle between Strict Ground Station vs Hybrid CAMS Model Enrichment"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all ${
            isHybridMode
              ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 shadow-sm'
              : 'bg-stone-850/80 text-stone-300 border-stone-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isHybridMode ? 'Hybrid CAMS' : 'Ground-Only'}</span>
        </button>
      </div>

      {/* Hero Vitality Breathing Gauge */}
      <div className="relative flex flex-col items-center justify-center py-2 z-10">
        {/* Outer Concentric Breathing Glow Ring */}
        <div
          className="absolute w-52 h-52 rounded-full breathing-vitality-ring pointer-events-none"
          style={{
            border: `2px solid ${severity.colorHex}`,
            boxShadow: `0 0 35px ${severity.colorHex}40`,
            animationDuration: `${severity.breathingPeriodSeconds}s`,
          }}
        />

        <svg className="w-64 h-56 relative z-10" viewBox="0 0 220 210">
          {/* Background Horseshoe Track (Open at Bottom) */}
          <circle
            cx="110"
            cy="105"
            r={radius}
            fill="none"
            stroke="#1c2433"
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
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Display: Geometric Icon, Giant Bold AQI & Human Verdict */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-20 pt-1">
          {/* Geometric Tier Icon + Number */}
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: severity.colorHex }}
            >
              {severity.icon}
            </span>
            <span className="text-6xl font-extrabold tracking-tight font-mono text-white tabular-nums drop-shadow-md">
              {activeData.aqi}
            </span>
          </div>

          {/* Severity Category Pill */}
          <div
            className="mt-1 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide shadow-sm"
            style={{
              backgroundColor: `${severity.colorHex}25`,
              color: severity.colorHex,
              border: `1px solid ${severity.colorHex}60`,
            }}
          >
            {severity.category}
          </div>

          {/* Human Verdict Line */}
          <span className="text-[11px] font-bold text-slate-300 tracking-wider mt-1.5 uppercase font-mono">
            {severity.humanVerdict}
          </span>
        </div>
      </div>

      {/* Dedicated Clean Footer Box Below the SVG (NO TEXT OVERLAP POSSIBLE) */}
      <div className="space-y-2 z-10">
        {/* Primary Driver Pill */}
        <div className="mineral-well p-2.5 rounded-xl flex items-center justify-between text-xs">
          <span className="text-stone-400 text-[11px]">Primary Driver:</span>
          <span className="font-bold text-stone-100 font-mono">
            {pollutantLabels[activeData.prominentPollutant] || activeData.prominentPollutant}
          </span>
        </div>

        {/* CPCB Minimum Data Rule Validation */}
        {activeStandard === 'CPCB' && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              CPCB Data Rule:{' '}
              <strong className="text-stone-200">
                {indices.cpcb.meetsMinimumDataRule
                  ? 'Valid (>=3 pollutants with particulate)'
                  : 'Screening (partial sensor array)'}
              </strong>
            </span>
          </div>
        )}

        {/* 1-Click Alternative Standard Switcher */}
        <div
          onClick={onToggleStandard}
          className="cursor-pointer p-3 rounded-xl bg-stone-850/60 hover:bg-stone-800 border border-stone-800 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                Dual Standard Correlation
              </div>
              <div className="text-xs font-semibold text-stone-200">
                {secondaryLabel}: <span className="font-mono text-amber-300 font-bold">{secondaryData.aqi}</span> ({secondaryData.category})
              </div>
            </div>
          </div>
          <div className="flex items-center text-xs text-amber-400 font-medium gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Switch</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
