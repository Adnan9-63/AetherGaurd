// src/components/StationTelemetryDrawer.tsx
// Slide-Over Drawer inspecting individual CPCB / Open-Meteo station telemetry

import React from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import type { StationPin } from '../types/telemetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface StationTelemetryDrawerProps {
  station: StationPin | null;
  onClose: () => void;
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
  onNavigateToStation?: (lat: number, lon: number, name: string) => void;
}

export const StationTelemetryDrawer: React.FC<StationTelemetryDrawerProps> = ({
  station,
  onClose,
  activeStandard,
  colorblindMode,
  onNavigateToStation,
}) => {
  if (!station) return null;

  const severity = getSeverityInfo(station.aqi, activeStandard, colorblindMode);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-stone-900/95 backdrop-blur-2xl border-l border-stone-800 shadow-2xl flex flex-col justify-between text-stone-100 transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-stone-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold font-mono"
              style={{ color: severity.colorHex }}
            >
              {severity.icon}
            </span>
            <h3 className="font-bold text-base text-white tracking-tight line-clamp-1">
              {station.name}
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°E
            </span>
            {station.distanceKm !== undefined && (
              <span className="text-amber-300 font-medium">({station.distanceKm} km from center)</span>
            )}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Telemetry */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto">
        {/* Hero AQI Card */}
        <div className="p-4 rounded-xl bg-stone-800/60 border border-stone-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 uppercase tracking-wider block">
              Reported Station AQI
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold font-mono text-white">
                {station.aqi}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${severity.colorHex}25`,
                  color: severity.colorHex,
                  border: `1px solid ${severity.colorHex}60`,
                }}
              >
                {severity.category}
              </span>
            </div>
          </div>

          {station.isHotspot && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                Hotspot Alert
              </span>
            </div>
          )}
        </div>

        {/* Source Attribution */}
        <div className="space-y-2 text-xs">
          <span className="font-semibold text-stone-400 uppercase tracking-wider">
            Station Attribution & Source
          </span>
          <div className="p-3 rounded-xl bg-stone-800/40 border border-stone-700/50 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-400">Network Provider:</span>
              <span className="font-medium text-stone-200">
                {station.source === 'WAQI_GROUND_STATION'
                  ? 'CPCB / State Pollution Control Board'
                  : 'Open-Meteo High-Resolution CAMS Grid'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Monitor Type:</span>
              <span className="font-medium text-stone-200">
                {station.source === 'WAQI_GROUND_STATION' ? 'Regulatory Reference Ground Station' : '11-km Atmospheric Grid Node'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Station UID:</span>
              <span className="font-mono text-amber-300">{station.uid}</span>
            </div>
          </div>
        </div>

        {/* Simulated Station Sparkline */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>24-Hour Telemetry Sparkline</span>
            <span className="text-[10px] text-stone-400">Hourly Variation</span>
          </span>
          <div className="h-16 w-full p-2 rounded-xl bg-stone-950/60 border border-stone-800 flex items-end gap-1.5">
            {Array.from({ length: 24 }).map((_, i) => {
              const swing = Math.sin((i / 24) * Math.PI * 2) * (station.aqi * 0.18);
              const val = Math.max(20, Math.round(station.aqi + swing));
              const heightPct = Math.min(100, Math.max(15, (val / 500) * 100));
              const sColor = getSeverityInfo(val, activeStandard, colorblindMode).colorHex;

              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all hover:opacity-80 group relative"
                  style={{ height: `${heightPct}%`, backgroundColor: sColor }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-stone-850 text-[10px] px-1.5 py-0.5 rounded shadow z-10 font-mono text-white whitespace-nowrap">
                    {val} AQI
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-stone-800 bg-stone-900/90 flex items-center gap-3">
        {onNavigateToStation && (
          <button
            type="button"
            onClick={() => onNavigateToStation(station.latitude, station.longitude, station.name)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md"
          >
            <Navigation className="w-4 h-4" />
            <span>Lock Dashboard to This Station</span>
          </button>
        )}
      </div>
    </div>
  );
};
