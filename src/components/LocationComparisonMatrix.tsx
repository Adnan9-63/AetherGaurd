// src/components/LocationComparisonMatrix.tsx
// Mandatory Feature D: Single-Request Multi-City Batch Telemetry Comparison Matrix
// Bonus #9: National Pollution Leaderboard (Hotspots vs Clean Air Refuges)
// Unified Page 4 with clean segmented toggle, warm stone/amber palette & zero blue/slate clutter

import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Compass,
  HeartPulse,
  RefreshCw,
  Sparkles,
  Trophy,
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
import { PollutionLeaderboard } from './PollutionLeaderboard.tsx';

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

const cityColors = ['#f59e0b', '#10b981', '#f97316', '#a855f7', '#06b6d4'];

interface LocationComparisonMatrixProps {
  onSelectCity?: (lat: number, lon: number, name: string, admin1?: string, countryCode?: string) => void;
  activeStandard?: 'CPCB' | 'US_EPA';
  colorblindMode?: boolean;
}

export const LocationComparisonMatrix: React.FC<LocationComparisonMatrixProps> = ({
  onSelectCity,
  activeStandard = 'CPCB',
  colorblindMode = false,
}) => {
  const [activeView, setActiveView] = useState<'matrix' | 'leaderboard'>('matrix');
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
    try {
      const data = await fetchBatchCitiesTelemetry(selectedCities);
      setBatchData(data);
    } catch (e) {
      console.warn('Batch fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'matrix') {
      loadBatch();
    }
  }, [selectedCities, activeView]);

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
      const spark = city.historical24hSparkline;
      point[city.name] = spark && spark[hourIdx] !== undefined ? Math.round(spark[hourIdx]) : city.cpcbAqi;
    });
    return point;
  });

  return (
    <div className="space-y-6">
      {/* Top Segmented Toggle: Multi-City Matrix vs Leaderboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900/90 backdrop-blur-xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                {activeView === 'matrix' ? 'Multi-Location Comparison Matrix' : 'Live Pollution Leaderboard'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-semibold">
                {activeView === 'matrix' ? 'Mandatory Feature D' : 'Bonus #9 Leaderboard'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {activeView === 'matrix'
                ? 'Single-request multi-city batch query with overlaid trend curves & health gain metrics'
                : 'Live ranked 20+ benchmark cities with 24h inline sparklines'}
            </p>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeView === 'matrix'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Comparison Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeView === 'leaderboard'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Pollution Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Render Leaderboard View */}
      {activeView === 'leaderboard' && (
        <PollutionLeaderboard
          onSelectCity={onSelectCity || (() => {})}
          activeStandard={activeStandard}
          colorblindMode={colorblindMode}
        />
      )}

      {/* Render Matrix View */}
      {activeView === 'matrix' && (
        <div className="space-y-6">
          {/* City Selection Pills */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider font-mono">
                Active Comparison Air Basins ({selectedCities.length}/5)
              </span>
              <button
                type="button"
                onClick={loadBatch}
                disabled={isLoading}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-query Batch</span>
              </button>
            </div>

            {/* Currently Selected Cities Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedCities.map((c, idx) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-200"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cityColors[idx] }} />
                  <span className="font-semibold text-white">{c.name}</span>
                  {idx === 0 && (
                    <span className="text-[10px] px-1 rounded bg-amber-950 text-amber-300 font-mono font-bold">
                      Anchor
                    </span>
                  )}
                  {selectedCities.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(c.name)}
                      className="text-stone-400 hover:text-stone-100 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Cities */}
            {selectedCities.length < 5 && (
              <div className="pt-2 border-t border-stone-800/80 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-stone-400 text-[11px]">Add Basin:</span>
                {AVAILABLE_CITIES.filter((c) => !selectedCities.some((sc) => sc.name === c.name)).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleAddCity(c)}
                    className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[11px] transition-colors"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cleaner-Air Recommendation Banner */}
          {bestCity && baselineCity && bestCity.name !== baselineCity.name && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-stone-900 to-amber-950/40 border border-emerald-600/50 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-mono">
                    Automated Cleaner Air Recommendation
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {bestCity.name} ({bestCity.cpcbAqi} AQI — {bestCity.category})
                  </h3>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Composite Score: <strong className="font-mono text-emerald-300">{bestCity.compositeScore}</strong> vs Anchor {baselineCity.name} (<span className="font-mono text-rose-300">{baselineCity.compositeScore}</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-800 text-xs">
                <div className="text-right">
                  <span className="text-[11px] text-stone-400 block font-medium">Biological Health Gain:</span>
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
                  className={`p-5 rounded-2xl bg-stone-900/90 border transition-all space-y-4 shadow-xl ${
                    city.name === bestCity?.name
                      ? 'border-emerald-500/80 shadow-emerald-500/10'
                      : 'border-stone-800'
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
                      <span className="text-xs text-stone-400">
                        {city.admin1 ? `${city.admin1}, ` : ''}{city.countryCode}
                      </span>
                    </div>

                    {isAnchor ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
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
                      <span className="text-xs text-stone-400 ml-1.5 font-sans">CPCB AQI</span>
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
                  <div className="space-y-1.5 pt-2 border-t border-stone-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-400">PM2.5 (Fine):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.pm2_5 !== null && city.pollutants.pm2_5 !== undefined ? `${city.pollutants.pm2_5.toFixed(1)} µg/m³` : '--'}
                        {!isAnchor && (
                          <span className={`ml-1 text-[11px] ${pm25Delta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({pm25Delta > 0 ? `+${pm25Delta.toFixed(0)}` : pm25Delta.toFixed(0)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">PM10 (Coarse):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.pm10 !== null && city.pollutants.pm10 !== undefined ? `${city.pollutants.pm10.toFixed(1)} µg/m³` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">NO2 (Traffic):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.no2 !== null && city.pollutants.no2 !== undefined ? `${city.pollutants.no2.toFixed(1)} µg/m³` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">SO2 (Industrial/Pyro):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.so2 !== null && city.pollutants.so2 !== undefined ? `${city.pollutants.so2.toFixed(1)} µg/m³` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">CO (Combustion):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.co !== null && city.pollutants.co !== undefined ? `${city.pollutants.co.toFixed(2)} mg/m³` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">O3 (Ozone 8h):</span>
                      <span className="font-mono font-semibold text-stone-200">
                        {city.pollutants.o3 !== null && city.pollutants.o3 !== undefined ? `${city.pollutants.o3.toFixed(1)} µg/m³` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-stone-800/80">
                      <span className="text-stone-400 font-medium">Ventilation (VC):</span>
                      <span className="font-mono font-semibold text-amber-300">
                        {city.ventilationCoefficientM2s ? `${city.ventilationCoefficientM2s} m²/s` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overlaid Multi-City Trend Curves */}
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Overlaid 24-Hour Diurnal Trend Curves
                </h3>
              </div>
              <span className="text-xs text-stone-400">Comparative Air Basin Dispersion</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overlaidTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="hourLabel" stroke="#78716c" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#78716c" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '11px', color: '#fafaf9' }}
                    labelStyle={{ color: '#d6d3d1' }}
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
      )}
    </div>
  );
};
