// src/components/LiveAQIDashboard.tsx
// Mandatory Feature A: Live AQI Dashboard with Dual-Standard Gauge, 6-Pollutant Grid & Meteorology

import React, { useState } from 'react';
import {
  Compass,
  Flame,
  HeartPulse,
} from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { DualStandardHeroGauge } from './DualStandardHeroGauge.tsx';
import { SixPollutantTelemetryGrid } from './SixPollutantTelemetryGrid.tsx';
import { AIExecutiveInsightBanner } from './AIExecutiveInsightBanner.tsx';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';
import { calculateBerkeleyEarthCigarettes } from '../utils/healthDosimetry.ts';

interface LiveAQIDashboardProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  onToggleStandard: () => void;
  colorblindMode: boolean;
}

export const LiveAQIDashboard: React.FC<LiveAQIDashboardProps> = ({
  currentData,
  forecastPoints,
  activeStandard,
  onToggleStandard,
  colorblindMode,
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
  const cigs = calculateBerkeleyEarthCigarettes(pm25, 2, false, 'adult');

  const subIndices = activeStandard === 'CPCB'
    ? indices.cpcb.subIndices
    : indices.usEpa.subIndices;

  return (
    <div className="space-y-6">
      {/* AI Executive Insight Banner (Bonus #10 / #13) */}
      <AIExecutiveInsightBanner
        currentData={currentData}
        forecastPoints={forecastPoints}
      />

      {/* Grid: Left Column Hero Gauge + Dosimetry, Right Column 6 Pollutants + Meteorology */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hero Gauge & Dosimetry Quick Card (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <DualStandardHeroGauge
            indices={indices}
            activeStandard={activeStandard}
            onToggleStandard={onToggleStandard}
            colorblindMode={colorblindMode}
            isHybridMode={isHybridMode}
            onToggleHybridMode={() => setIsHybridMode(!isHybridMode)}
          />

          {/* Quick Health Dosimetry & Cigarette Equivalence Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                Biological Impact & Dosimetry
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80">
                Berkeley Earth Model
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] text-slate-400 block">Cigarette Equivalence:</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-amber-400">
                    {cigs.cigarettesPerDay}
                  </span>
                  <span className="text-xs text-slate-400">cigs / day</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Based on 2h unmitigated outdoor exposure
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <span className="text-[11px] text-slate-400 block">Life-Minutes Lost:</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-rose-400">
                    -{cigs.lifeMinutesLostPerDay}
                  </span>
                  <span className="text-xs text-slate-400">min / day</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Epidemiological life-expectancy burden
                </span>
              </div>
            </div>
          </div>

          {/* Source Apportionment Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Primary Source Regime
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {fingerprint.confidencePct}% match
              </span>
            </div>
            <div className="text-xs text-slate-200 font-medium">
              {fingerprint.dominantSource === 'PYROTECHNIC_FIRECRACKERS'
                ? '🎆 Diwali Pyrotechnic Combustion (KNO3 + SO2)'
                : fingerprint.dominantSource === 'BIOMASS_CROP_BURNING'
                ? '🌾 Agricultural Stubble Burning (High CO + PM2.5)'
                : fingerprint.dominantSource === 'VEHICULAR_TRAFFIC'
                ? '🚗 Vehicular Traffic Corridor (Elevated NO2 + CO)'
                : '🏗️ Crustal Road & Construction Dust (Coarse PM10)'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {fingerprint.scientificNarrative}
            </p>
          </div>
        </div>

        {/* Right Column: 6 Pollutants Grid + Meteorological Dynamics (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <SixPollutantTelemetryGrid
            pollutants={pollutants}
            subIndices={subIndices}
            activeStandard={activeStandard}
            colorblindMode={colorblindMode}
            isHybridMode={isHybridMode}
          />

          {/* Atmospheric Meteorology & Boundary Layer Drivers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Physical Dispersion Drivers (Open-Meteo IFS Physics)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Boundary Layer Height */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Boundary Layer (PBLH):</span>
                <span className="text-lg font-bold font-mono text-cyan-300 mt-1 block">
                  {meteorology.boundaryLayerHeightM ? `${Math.round(meteorology.boundaryLayerHeightM)} m` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">Atmospheric ceiling</span>
              </div>

              {/* Wind Speed & Direction */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Wind (10m):</span>
                <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
                  {meteorology.windSpeedMs !== null ? `${meteorology.windSpeedMs.toFixed(1)} m/s` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {meteorology.windDirectionDeg !== null ? `${meteorology.windDirectionDeg}° bearing` : 'Calm'}
                </span>
              </div>

              {/* Ventilation Coefficient */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Ventilation Coeff:</span>
                <span className={`text-lg font-bold font-mono mt-1 block ${
                  (meteorology.ventilationCoefficientM2s || 0) < 500 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {meteorology.ventilationCoefficientM2s ? `${Math.round(meteorology.ventilationCoefficientM2s)} m²/s` : '--'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {(meteorology.ventilationCoefficientM2s || 0) < 500 ? 'Severe trapping' : 'Good dispersion'}
                </span>
              </div>

              {/* Temperature & Humidity */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Temp & Humidity:</span>
                <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
                  {meteorology.temperatureC !== null ? `${meteorology.temperatureC.toFixed(0)}°C` : '--'} / {meteorology.relativeHumidityPct || '--'}%
                </span>
                <span className="text-[10px] text-slate-400">Ambient thermodynamic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
