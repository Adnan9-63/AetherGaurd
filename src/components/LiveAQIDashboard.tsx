// src/components/LiveAQIDashboard.tsx
// Mandatory Feature A: Live AQI Dashboard with Strict 3-Section Decluttered Architecture
// Section 1: Hero Gauge & 3-Second Action Matrix
// Section 2: Six Criteria Pollutants Grid (PM2.5, PM10, NO2, SO2, CO, O3)
// Section 3: 2-Tab Strip (Smog Source Fingerprint vs Meteorological Dispersion)

import React, { useState } from 'react';
import { Compass, Flame, Wind } from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { DualStandardHeroGauge } from './DualStandardHeroGauge.tsx';
import { SixPollutantTelemetryGrid } from './SixPollutantTelemetryGrid.tsx';
import { AIExecutiveInsightBanner } from './AIExecutiveInsightBanner.tsx';
import { AtmosphericParticleCanvas } from './AtmosphericParticleCanvas.tsx';
import { CitizenActionMatrix } from './CitizenActionMatrix.tsx';
import { SmogSourceXRay } from './SmogSourceXRay.tsx';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';

interface LiveAQIDashboardProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  onToggleStandard: () => void;
  colorblindMode: boolean;
  viewMode?: 'UNIFIED' | 'CITIZEN' | 'LAB';
}

export const LiveAQIDashboard: React.FC<LiveAQIDashboardProps> = ({
  currentData,
  forecastPoints,
  activeStandard,
  onToggleStandard,
  colorblindMode,
  viewMode = 'UNIFIED',
}) => {
  const [isHybridMode, setIsHybridMode] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'fingerprint' | 'meteorology'>('fingerprint');

  const { pollutants, meteorology, indices } = currentData;
  const pm25 = pollutants.pm2_5 ?? 45;
  const pm10 = pollutants.pm10 ?? 75;
  const so2 = pollutants.so2 ?? 15;
  const no2 = pollutants.no2 ?? 30;
  const co = pollutants.co ?? 1.2;
  const dust = pollutants.dust ?? 25;

  const fingerprint = classifyPollutionSource(pm25, pm10, so2, no2, co, dust);
  const activeAqi = activeStandard === 'CPCB' ? indices.cpcb.aqi : indices.usEpa.aqi;

  const subIndices = activeStandard === 'CPCB'
    ? indices.cpcb.subIndices
    : indices.usEpa.subIndices;

  return (
    <div className="space-y-6">
      {/* ====================================================================
          SECTION 1: HERO GAUGE & HUMAN ACTION OUTCOMES (Top Deck)
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Atmospheric Vitality Radial Instrument (5 cols on lg) */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden">
            <AtmosphericParticleCanvas
              aqi={activeAqi}
              windSpeedMps={meteorology.windSpeedMs ?? 3.2}
              windDirectionDeg={meteorology.windDirectionDeg ?? 240}
              isPyroDetected={fingerprint.dominantSource === 'PYROTECHNIC_FIRECRACKERS'}
            />
            <DualStandardHeroGauge
              indices={indices}
              activeStandard={activeStandard}
              onToggleStandard={onToggleStandard}
              colorblindMode={colorblindMode}
              isHybridMode={isHybridMode}
              onToggleHybridMode={() => setIsHybridMode(!isHybridMode)}
            />
          </div>
        </div>

        {/* Right: AI Insight & 3-Second Action Matrix (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <AIExecutiveInsightBanner
            currentData={currentData}
            forecastPoints={forecastPoints}
          />
          <CitizenActionMatrix
            currentData={currentData}
            forecastPoints={forecastPoints}
            activeStandard={activeStandard}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* ====================================================================
          SECTION 2: MANDATORY 6 CRITERIA POLLUTANTS GRID (Middle Deck)
          ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white font-mono uppercase">
              Six Criteria Pollutants Telemetry
            </h2>
            <p className="text-xs text-stone-400">
              Concentrations and sub-indices computed per {activeStandard === 'CPCB' ? 'CPCB NAQI' : 'US-EPA'} breakpoints
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono font-semibold">
            Mandatory Feature A
          </span>
        </div>

        <SixPollutantTelemetryGrid
          pollutants={pollutants}
          subIndices={subIndices}
          activeStandard={activeStandard}
          colorblindMode={colorblindMode}
          isHybridMode={isHybridMode}
        />
      </div>

      {/* ====================================================================
          SECTION 3: 2-TAB FORENSIC STRIP (Bottom Deck)
          Tab A: Smog Source X-Ray Chemical Fingerprinting
          Tab B: Planetary Boundary Layer & Meteorology Dispersion
          ==================================================================== */}
      <div className="space-y-4">
        {/* Segmented Switcher Strip */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveBottomTab('fingerprint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeBottomTab === 'fingerprint'
                  ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Smog Source Fingerprint</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('meteorology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeBottomTab === 'meteorology'
                  ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
              }`}
            >
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atmospheric Dispersion & Physics</span>
            </button>
          </div>

          <span className="text-[11px] text-stone-500 font-mono hidden sm:inline">
            Interactive Diagnostics Deck
          </span>
        </div>

        {/* Tab A: Smog Source X-Ray */}
        {activeBottomTab === 'fingerprint' && (
          <SmogSourceXRay fingerprint={fingerprint} />
        )}

        {/* Tab B: Meteorology Dispersion */}
        {activeBottomTab === 'meteorology' && (
          <div className="mineral-card p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-stone-400 uppercase font-mono flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                Physical Dispersion Drivers (Open-Meteo IFS Reanalysis)
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">PBLH & Ventilation Matrix</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Boundary Layer Height */}
              <div className="mineral-well p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-mono block">Boundary Layer (PBLH):</span>
                <span className="text-lg font-bold font-mono text-amber-300 mt-0.5 block tabular-nums">
                  {meteorology.boundaryLayerHeightM ? `${Math.round(meteorology.boundaryLayerHeightM)} m` : '--'}
                </span>
                <span className="text-[10px] text-stone-400">Atmospheric lid / mixing volume</span>
              </div>

              {/* Wind Speed & Direction */}
              <div className="mineral-well p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-mono block">Wind (10m):</span>
                <span className="text-lg font-bold font-mono text-stone-100 mt-0.5 block tabular-nums">
                  {meteorology.windSpeedMs !== null ? `${meteorology.windSpeedMs.toFixed(1)} m/s` : '--'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {meteorology.windDirectionDeg !== null ? `${meteorology.windDirectionDeg}° bearing` : 'Calm'}
                </span>
              </div>

              {/* Ventilation Coefficient */}
              <div className="mineral-well p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-mono block">Ventilation Coeff (VC):</span>
                <span className={`text-lg font-bold font-mono mt-0.5 block tabular-nums ${
                  (meteorology.ventilationCoefficientM2s || 0) < 500 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {meteorology.ventilationCoefficientM2s ? `${Math.round(meteorology.ventilationCoefficientM2s)} m²/s` : '--'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {(meteorology.ventilationCoefficientM2s || 0) < 500 ? 'Severe pollutant trapping' : 'Adequate dispersion'}
                </span>
              </div>

              {/* Temperature & Humidity */}
              <div className="mineral-well p-3.5 rounded-2xl">
                <span className="text-[10px] text-stone-400 font-mono block">Temp & Humidity:</span>
                <span className="text-lg font-bold font-mono text-stone-100 mt-0.5 block tabular-nums">
                  {meteorology.temperatureC !== null ? `${meteorology.temperatureC.toFixed(0)}°C` : '--'} / {meteorology.relativeHumidityPct || '--'}%
                </span>
                <span className="text-[10px] text-stone-400">Thermodynamics & fog potential</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
