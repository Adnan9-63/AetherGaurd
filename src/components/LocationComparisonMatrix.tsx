// src/components/LocationComparisonMatrix.tsx
// Mandatory Feature D: Single-Request Multi-City Batch Telemetry Comparison Matrix
// Computes AQI deltas, overlaid trend curves, and cleaner-air recommendations with cigarette savings

import React, { useState, useEffect } from 'react';
import {
  Award,
  BarChart2,
  Compass,
  HeartPulse,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BatchCityTelemetry } from '../services/apiOrchestrator.ts';
import { fetchBatchCitiesTelemetry } from '../services/apiOrchestrator.ts';
import { calculateBerkeleyEarthCigarettes } from '../utils/healthDosimetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface CityOption {
  name: string;
  lat: number;
  lon: number;
  admin1?: string;
  countryCode?: string;
}

const AVAILABLE_CITIES: CityOption[] = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, admin1: 'Delhi', countryCode: 'IN' },
  { name: 'Patna', lat: 25.5941, lon: 85.1376, admin1: 'Bihar', countryCode: 'IN' },
  { name: 'Muzaffarpur', lat: 26.1209, lon: 85.3647, admin1: 'Bihar', countryCode: 'IN' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, admin1: 'Maharashtra', countryCode: 'IN' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, admin1: 'Karnataka', countryCode: 'IN' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, admin1: 'West Bengal', countryCode: 'IN' },
  { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, admin1: 'Andhra Pradesh', countryCode: 'IN' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, admin1: 'Tamil Nadu', countryCode: 'IN' },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, admin1: 'Beijing', countryCode: 'CN' },
  { name: 'Zurich', lat: 47.3769, lon: 8.5417, admin1: 'Zurich', countryCode: 'CH' },
];

export const LocationComparisonMatrix: React.FC = () => {
  const [selectedCities, setSelectedCities] = useState<CityOption[]>([
    AVAILABLE_CITIES[0], // New Delhi
    AVAILABLE_CITIES[1], // Patna
    AVAILABLE_CITIES[4], // Bengaluru
  ]);

  const [batchData, setBatchData] = useState<BatchCityTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all selected cities in a single batch request
  const loadBatch = async () => {
    setIsLoading(true);
    const data = await fetchBatchCitiesTelemetry(selectedCities);
    setBatchData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadBatch();
  }, [selectedCities]);

  const handleAddCity = (city: CityOption) => {
    if (selectedCities.length < 5 && !selectedCities.some((c) => c.name === city.name)) {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const handleRemoveCity = (cityName: string) => {
    if (selectedCities.length > 2) {
      setSelectedCities(selectedCities.filter((c) => c.name !== cityName));
    }
  };

  // Find Recommended Cleaner-Air Location (lowest composite score)
  const bestCity = batchData.length > 0
    ? [...batchData].sort((a, b) => a.compositeScore - b.compositeScore)[0]
    : null;

  const baselineCity = batchData[0] || null;

  // Cigarette savings between baseline and recommended best
  const baselineCigs = baselineCity ? calculateBerkeleyEarthCigarettes(baselineCity.pollutants.pm2_5 || 60).cigarettesPerDay : 0;
  const bestCigs = bestCity ? calculateBerkeleyEarthCigarettes(bestCity.pollutants.pm2_5 || 25).cigarettesPerDay : 0;
  const cigsSaved = Number(Math.max(0, baselineCigs - bestCigs).toFixed(1));

  // Prepare overlaid trend curve data
  const overlaidTrendData = Array.from({ length: 24 }).map((_, hourIdx) => {
    const point: any = { hourLabel: `${hourIdx}:00` };
    batchData.forEach((city) => {
      point[city.name] = city.historical24hSparkline[hourIdx] ?? city.cpcbAqi;
    });
    return point;
  });

  const cityColors = ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header & City Selector */}
      <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Single-Request Multi-City Comparison Matrix (Mandatory Feature D)
              </h2>
              <p className="text-xs text-slate-400">
                Single-batch Open-Meteo coordinate query: zero rate-limit waste, instant side-by-side deltas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadBatch}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Re-fetch Batch</span>
          </button>
        </div>

        {/* Selected Cities Tag Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase">Comparing:</span>
          {selectedCities.map((city, idx) => (
            <span
              key={city.name}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-medium"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cityColors[idx] }} />
              <span>{city.name}</span>
              {idx === 0 && <span className="text-[10px] text-cyan-300 font-mono">(Anchor A)</span>}
              {selectedCities.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCity(city.name)}
                  className="hover:text-rose-400 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}

          {/* Add City Dropdown */}
          {selectedCities.length < 5 && (
            <div className="relative">
              <select
                onChange={(e) => {
                  const found = AVAILABLE_CITIES.find((c) => c.name === e.target.value);
                  if (found) handleAddCity(found);
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-2.5 py-1 text-xs bg-slate-950/70 border border-slate-700 rounded-xl text-slate-300 hover:border-cyan-500 focus:outline-none"
              >
                <option value="" disabled>+ Add City (up to 5)</option>
                {AVAILABLE_CITIES.filter((c) => !selectedCities.some((sc) => sc.name === c.name)).map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Cleaner-Air Location Banner */}
      {bestCity && baselineCity && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/70 border border-emerald-800/80 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Recommended Cleaner-Air Refuge
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  0.7·Current + 0.3·Forecast Score
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {bestCity.name} ({bestCity.cpcbAqi} AQI — {bestCity.category})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Composite Score: <strong className="font-mono text-emerald-300">{bestCity.compositeScore}</strong> vs Anchor {baselineCity.name} (<span className="font-mono text-rose-300">{baselineCity.compositeScore}</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Biological Health Gain:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                Save {cigsSaved} cigs/day
              </span>
            </div>
            <HeartPulse className="w-6 h-6 text-rose-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Side-by-Side Telemetry & Delta Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {batchData.map((city, idx) => {
          const isAnchor = idx === 0;
          const aqiDelta = isAnchor ? 0 : city.cpcbAqi - (baselineCity?.cpcbAqi || 0);
          const pm25Delta = isAnchor ? 0 : (city.pollutants.pm2_5 || 0) - (baselineCity?.pollutants.pm2_5 || 0);
          const sev = getSeverityInfo(city.cpcbAqi, 'CPCB', false);

          return (
            <div
              key={city.name}
              className={`p-5 rounded-2xl bg-slate-900/80 border transition-all space-y-4 shadow-xl ${
                city.name === bestCity?.name
                  ? 'border-emerald-500/80 shadow-emerald-500/10'
                  : 'border-slate-800'
              }`}
            >
              {/* Cleanest Air Refuge Badge for Winner */}
              {city.name === bestCity?.name && (
                <div className="px-3 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>✓ RECOMMENDED CLEANEST AIR REFUGE</span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cityColors[idx] }} />
                    <h4 className="font-bold text-base text-white">{city.name}</h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    {city.admin1 ? `${city.admin1}, ` : ''}{city.countryCode}
                  </span>
                </div>

                {isAnchor ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                    Anchor Baseline
                  </span>
                ) : (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    aqiDelta < 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {aqiDelta > 0 ? `+${aqiDelta}` : aqiDelta} ΔAQI
                  </span>
                )}
              </div>

              {/* AQI & Category */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-4xl font-extrabold font-mono text-white">
                    {city.cpcbAqi}
                  </span>
                  <span className="text-xs text-slate-400 ml-1.5 font-sans">CPCB AQI</span>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `${sev.colorHex}25`,
                    color: sev.colorHex,
                    border: `1px solid ${sev.colorHex}60`,
                  }}
                >
                  {sev.category}
                </span>
              </div>

              {/* All 6 Regulated Pollutants Snapshot + Ventilation Coefficient */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">PM2.5 (Fine):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.pm2_5 !== null && city.pollutants.pm2_5 !== undefined ? `${city.pollutants.pm2_5.toFixed(1)} µg/m³` : '--'}
                    {!isAnchor && (
                      <span className={`ml-1 text-[11px] ${pm25Delta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ({pm25Delta > 0 ? `+${pm25Delta.toFixed(0)}` : pm25Delta.toFixed(0)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PM10 (Coarse):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.pm10 !== null && city.pollutants.pm10 !== undefined ? `${city.pollutants.pm10.toFixed(1)} µg/m³` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NO2 (Traffic):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.no2 !== null && city.pollutants.no2 !== undefined ? `${city.pollutants.no2.toFixed(1)} µg/m³` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SO2 (Industrial/Pyro):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.so2 !== null && city.pollutants.so2 !== undefined ? `${city.pollutants.so2.toFixed(1)} µg/m³` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CO (Combustion):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.co !== null && city.pollutants.co !== undefined ? `${city.pollutants.co.toFixed(2)} mg/m³` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">O3 (Ozone 8h):</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {city.pollutants.o3 !== null && city.pollutants.o3 !== undefined ? `${city.pollutants.o3.toFixed(1)} µg/m³` : '--'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 font-medium">Ventilation (VC):</span>
                  <span className="font-mono font-semibold text-cyan-300">
                    {city.ventilationCoefficientM2s ? `${city.ventilationCoefficientM2s} m²/s` : '--'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlaid Multi-City Trend Curves */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Overlaid 24-Hour Diurnal Trend Curves
            </h3>
          </div>
          <span className="text-xs text-slate-400">Comparative Air Basin Dispersion</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overlaidTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hourLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {batchData.map((city, idx) => (
                <Line
                  key={city.name}
                  type="monotone"
                  dataKey={city.name}
                  name={city.name}
                  stroke={cityColors[idx]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
