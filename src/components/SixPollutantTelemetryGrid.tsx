// src/components/SixPollutantTelemetryGrid.tsx
// Individual Telemetry Cards for PM2.5, PM10, NO2, SO2, CO, O3, Dust & AOD
// Highlights Physical Concentrations, Sub-Indices, and WHO 2021 Multipliers

import React from 'react';
import { Wind } from 'lucide-react';
import type { NormalizedPollutants } from '../types/telemetry.ts';
import { calculateWhoMultipliers, WHO_2021_GUIDELINES } from '../utils/aqiCalculator.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface SixPollutantTelemetryGridProps {
  pollutants: NormalizedPollutants;
  subIndices: Record<string, number>;
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
  isHybridMode?: boolean;
}

interface PollutantMeta {
  key: keyof NormalizedPollutants;
  name: string;
  chemicalFormula: string;
  unit: string;
  whoGuideline: number;
  description: string;
  maxScale: number;
}

const POLLUTANT_CONFIGS: PollutantMeta[] = [
  {
    key: 'pm2_5',
    name: 'Fine Particulate Matter',
    chemicalFormula: 'PM2.5',
    unit: 'µg/m³',
    whoGuideline: WHO_2021_GUIDELINES.pm2_5,
    description: 'Deep alveolar penetration into bloodstream; firecracker & combustion byproduct.',
    maxScale: 300,
  },
  {
    key: 'pm10',
    name: 'Coarse Particulate Matter',
    chemicalFormula: 'PM10',
    unit: 'µg/m³',
    whoGuideline: WHO_2021_GUIDELINES.pm10,
    description: 'Upper airway irritation & asthma trigger; road dust, construction & ash.',
    maxScale: 500,
  },
  {
    key: 'no2',
    name: 'Nitrogen Dioxide',
    chemicalFormula: 'NO2',
    unit: 'µg/m³',
    whoGuideline: WHO_2021_GUIDELINES.no2,
    description: 'Combustion tracer from urban vehicle exhaust and diesel transport.',
    maxScale: 200,
  },
  {
    key: 'so2',
    name: 'Sulphur Dioxide',
    chemicalFormula: 'SO2',
    unit: 'µg/m³',
    whoGuideline: WHO_2021_GUIDELINES.so2,
    description: 'Acute pyrotechnic sulfur oxidation tracer from fireworks & coal burning.',
    maxScale: 150,
  },
  {
    key: 'co',
    name: 'Carbon Monoxide',
    chemicalFormula: 'CO',
    unit: 'mg/m³',
    whoGuideline: WHO_2021_GUIDELINES.co,
    description: 'Incomplete combustion tracer from crop residue & smoldering biomass.',
    maxScale: 20,
  },
  {
    key: 'o3',
    name: 'Ground-Level Ozone',
    chemicalFormula: 'O3',
    unit: 'µg/m³',
    whoGuideline: WHO_2021_GUIDELINES.o3,
    description: 'Photochemical smog oxidant formed by sunlight reacting with NOx & VOCs.',
    maxScale: 200,
  },
];

export const SixPollutantTelemetryGrid: React.FC<SixPollutantTelemetryGridProps> = ({
  pollutants,
  subIndices,
  activeStandard,
  colorblindMode,
}) => {
  const whoMultipliers = calculateWhoMultipliers(pollutants);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
          <Wind className="w-4 h-4 text-cyan-400" />
          Criteria Pollutant Telemetry & WHO Ratios
        </h3>
        <span className="text-[11px] text-slate-400">
          WHO 2021 Daily Limits Reference
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {POLLUTANT_CONFIGS.map((cfg) => {
          const rawVal = pollutants[cfg.key];
          const subIndex = subIndices[cfg.key] ?? null;
          const whoData = whoMultipliers[cfg.key];
          const isAvailable = rawVal !== null && rawVal !== undefined;

          const severity = subIndex !== null
            ? getSeverityInfo(subIndex, activeStandard, colorblindMode)
            : null;

          const progressPct = isAvailable
            ? Math.min(100, Math.round((Number(rawVal) / cfg.maxScale) * 100))
            : 0;

          const isExceeded = whoData && whoData.ratio > 1.0;

          return (
            <div
              key={cfg.key}
              className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md"
            >
              {/* Header: Name, Formula, SubIndex */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white font-mono">{cfg.chemicalFormula}</span>
                    <span className="text-[11px] text-slate-400">({cfg.name})</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {cfg.description}
                  </p>
                </div>

                {subIndex !== null && severity && (
                  <div
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-tight shrink-0"
                    style={{
                      backgroundColor: `${severity.colorHex}20`,
                      color: severity.colorHex,
                      border: `1px solid ${severity.colorHex}50`,
                    }}
                    title={`${activeStandard} Sub-Index: ${subIndex}`}
                  >
                    {severity.icon} {subIndex}
                  </div>
                )}
              </div>

              {/* Physical Concentration & Unit */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
                    {isAvailable ? rawVal : '--'}
                  </span>
                  <span className="text-xs text-slate-400 ml-1.5">{cfg.unit}</span>
                </div>

                {/* WHO Multiplier Badge */}
                {whoData && (
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isExceeded
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                    }`}
                  >
                    <span>
                      {isExceeded ? `${whoData.ratio}x WHO Limit` : 'Within WHO Limit'}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar towards Max Reference Scale */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: severity ? severity.colorHex : '#06b6d4',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>WHO Standard: {cfg.whoGuideline} {cfg.unit}</span>
                  <span>Scale Max: {cfg.maxScale} {cfg.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auxiliary Aerosol Cards: Dust & Aerosol Optical Depth (AOD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Mineral & Soil Dust:</span>
            <span className="font-mono font-bold text-slate-100 text-sm ml-2">
              {pollutants.dust !== null ? `${pollutants.dust} µg/m³` : 'N/A'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Mechanical Resuspension</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Aerosol Optical Depth (550nm):</span>
            <span className="font-mono font-bold text-slate-100 text-sm ml-2">
              {pollutants.aod !== null ? pollutants.aod : 'N/A'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Column Atmospheric Haziness</span>
        </div>
      </div>
    </div>
  );
};
