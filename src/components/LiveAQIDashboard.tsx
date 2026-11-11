// src/components/LiveAQIDashboard.tsx
// Mandatory Feature A: Live AQI Dashboard with Progressive 3-Deck Hierarchy
// Deck 1: Human Outcomes (Action Matrix & Synthesizer)
// Deck 2: Human-Translated Telemetry (Breathing Ring Gauge & 6 Pollutant Grid)
// Deck 3: Interactive Forensic Visualizers (Ventilation Ribbon, Cigarette Pack, Smog X-Ray)

import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { DualStandardHeroGauge } from './DualStandardHeroGauge.tsx';
import { SixPollutantTelemetryGrid } from './SixPollutantTelemetryGrid.tsx';
import { AIExecutiveInsightBanner } from './AIExecutiveInsightBanner.tsx';
import { AtmosphericParticleCanvas } from './AtmosphericParticleCanvas.tsx';
import { CitizenActionMatrix } from './CitizenActionMatrix.tsx';
import { VentilationButlerRibbon } from './VentilationButlerRibbon.tsx';
import { InteractiveCigarettePack } from './InteractiveCigarettePack.tsx';
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
    <div className="space-y-6 relative">
      {/* DECK 1: HUMAN OUTCOMES (Sit at very top for 3-second comprehension) */}
      <div className="space-y-4">
        {/* AI Atmospheric Synthesis Banner */}
        <AIExecutiveInsightBanner
          currentData={currentData}
          forecastPoints={forecastPoints}
        />

        {/* Sticky 3-Second Citizen Action Matrix */}
        <CitizenActionMatrix
          currentData={currentData}
          forecastPoints={forecastPoints}
          activeStandard={activeStandard}
          viewMode={viewMode}
        />
      </div>

      {/* DECK 2: HUMAN-TRANSLATED TELEMETRY (Hero Gauge + 6 Criteria Pollutants + Meteorology) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero Breathing Ring Gauge (5 cols on lg) */}
        <div className="lg:col-span-5 relative">
          {/* Hardware-Safe Living Atmosphere Particle Canvas (ambient breeze/smog drift) */}
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

        {/* Right Column: Mandatory 6 Pollutants Grid + Meteorological Dynamics (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-5">
          <SixPollutantTelemetryGrid
            pollutants={pollutants}
            subIndices={subIndices}
            activeStandard={activeStandard}
            colorblindMode={colorblindMode}
            isHybridMode={isHybridMode}
          />

          {/* Atmospheric Meteorology & Planetary Boundary Layer Dynamics */}
          <div className="mineral-card p-4 rounded-3xl space-y-3 shadow-xl">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Physical Dispersion Drivers (Open-Meteo IFS Physics)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Boundary Layer Height */}
              <div className="mineral-well p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-mono block">Boundary Layer (PBLH):</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-0.5 block tabular-nums">
                  {meteorology.boundaryLayerHeightM ? `${Math.round(meteorology.boundaryLayerHeightM)} m` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">Atmospheric lid</span>
              </div>

              {/* Wind Speed & Direction */}
              <div className="mineral-well p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-mono block">Wind (10m):</span>
                <span className="text-base font-bold font-mono text-slate-100 mt-0.5 block tabular-nums">
                  {meteorology.windSpeedMs !== null ? `${meteorology.windSpeedMs.toFixed(1)} m/s` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {meteorology.windDirectionDeg !== null ? `${meteorology.windDirectionDeg}° bearing` : 'Calm'}
                </span>
              </div>

              {/* Ventilation Coefficient */}
              <div className="mineral-well p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-mono block">Ventilation Coeff:</span>
                <span className={`text-base font-bold font-mono mt-0.5 block tabular-nums ${
                  (meteorology.ventilationCoefficientM2s || 0) < 500 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {meteorology.ventilationCoefficientM2s ? `${Math.round(meteorology.ventilationCoefficientM2s)} m²/s` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {(meteorology.ventilationCoefficientM2s || 0) < 500 ? 'Severe trapping' : 'Good dispersion'}
                </span>
              </div>

              {/* Temperature & Humidity */}
              <div className="mineral-well p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-mono block">Temp & Humidity:</span>
                <span className="text-base font-bold font-mono text-slate-100 mt-0.5 block tabular-nums">
                  {meteorology.temperatureC !== null ? `${meteorology.temperatureC.toFixed(0)}°C` : '--'} / {meteorology.relativeHumidityPct || '--'}%
                </span>
                <span className="text-[10px] text-slate-400">Thermodynamics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DECK 3: INTERACTIVE FORENSIC VISUALIZERS (Progressive Interactive Depth) */}
      <div className="space-y-6 pt-2">
        {/* 1. Window & Ventilation Butler 24-Hour Horizon Ribbon */}
        <VentilationButlerRibbon
          forecastPoints={forecastPoints}
          currentAqi={activeAqi}
        />

        {/* 2. Interactive Berkeley Earth Cigarette Pack & N95 Shield Visualizer */}
        <InteractiveCigarettePack pm25={pm25} />

        {/* 3. Interactive Smog Source X-Ray Chemical Dissector */}
        <SmogSourceXRay fingerprint={fingerprint} />
      </div>
    </div>
  );
};
