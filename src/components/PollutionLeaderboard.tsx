// src/components/PollutionLeaderboard.tsx
// Bonus #9: Live Ranked Pollution Leaderboard (Hotspots vs Clean Air Refuges)
// Covers 20+ Benchmark Indian & Global Cities with Inline 24h SVG Sparklines

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-react';
import type { BatchCityTelemetry } from '../services/apiOrchestrator.ts';
import { fetchBatchCitiesTelemetry } from '../services/apiOrchestrator.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface LeaderboardCityConfig {
  name: string;
  admin1?: string;
  countryCode: string;
  lat: number;
  lon: number;
  region: 'India' | 'Bihar & East India' | 'Global';
}

const BENCHMARK_CITIES: LeaderboardCityConfig[] = [
  // India Core & North
  { name: 'New Delhi', admin1: 'Delhi', countryCode: 'IN', lat: 28.6139, lon: 77.2090, region: 'India' },
  { name: 'Noida', admin1: 'Uttar Pradesh', countryCode: 'IN', lat: 28.5355, lon: 77.3910, region: 'India' },
  { name: 'Gurugram', admin1: 'Haryana', countryCode: 'IN', lat: 28.4595, lon: 77.0266, region: 'India' },
  { name: 'Lucknow', admin1: 'Uttar Pradesh', countryCode: 'IN', lat: 26.8467, lon: 80.9462, region: 'India' },
  { name: 'Kanpur', admin1: 'Uttar Pradesh', countryCode: 'IN', lat: 26.4499, lon: 80.3319, region: 'India' },

  // Bihar & East India
  { name: 'Patna', admin1: 'Bihar', countryCode: 'IN', lat: 25.5941, lon: 85.1376, region: 'Bihar & East India' },
  { name: 'Muzaffarpur', admin1: 'Bihar', countryCode: 'IN', lat: 26.1209, lon: 85.3647, region: 'Bihar & East India' },
  { name: 'Gaya', admin1: 'Bihar', countryCode: 'IN', lat: 24.7914, lon: 85.0002, region: 'Bihar & East India' },
  { name: 'Kolkata', admin1: 'West Bengal', countryCode: 'IN', lat: 22.5726, lon: 88.3639, region: 'Bihar & East India' },
  { name: 'Bhubaneswar', admin1: 'Odisha', countryCode: 'IN', lat: 20.2961, lon: 85.8245, region: 'Bihar & East India' },

  // South & West India
  { name: 'Mumbai', admin1: 'Maharashtra', countryCode: 'IN', lat: 19.0760, lon: 72.8777, region: 'India' },
  { name: 'Bengaluru', admin1: 'Karnataka', countryCode: 'IN', lat: 12.9716, lon: 77.5946, region: 'India' },
  { name: 'Chennai', admin1: 'Tamil Nadu', countryCode: 'IN', lat: 13.0827, lon: 80.2707, region: 'India' },
  { name: 'Hyderabad', admin1: 'Telangana', countryCode: 'IN', lat: 17.3850, lon: 78.4867, region: 'India' },
  { name: 'Visakhapatnam', admin1: 'Andhra Pradesh', countryCode: 'IN', lat: 17.6868, lon: 83.2185, region: 'India' },

  // Global Benchmarks
  { name: 'Beijing', admin1: 'Beijing', countryCode: 'CN', lat: 39.9042, lon: 116.4074, region: 'Global' },
  { name: 'Lahore', admin1: 'Punjab', countryCode: 'PK', lat: 31.5204, lon: 74.3587, region: 'Global' },
  { name: 'Dhaka', admin1: 'Dhaka', countryCode: 'BD', lat: 23.8103, lon: 90.4125, region: 'Global' },
  { name: 'London', admin1: 'England', countryCode: 'GB', lat: 51.5074, lon: -0.1278, region: 'Global' },
  { name: 'Zurich', admin1: 'Zurich', countryCode: 'CH', lat: 47.3769, lon: 8.5417, region: 'Global' },
];

interface PollutionLeaderboardProps {
  onSelectCity: (lat: number, lon: number, name: string, admin1?: string, countryCode?: string) => void;
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
}

export const PollutionLeaderboard: React.FC<PollutionLeaderboardProps> = ({
  onSelectCity,
  activeStandard,
  colorblindMode,
}) => {
  const [regionFilter, setRegionFilter] = useState<'All' | 'India' | 'Bihar & East India' | 'Global'>('All');
  const [sortOrder, setSortOrder] = useState<'HOTSPOTS_FIRST' | 'CLEANEST_FIRST'>('HOTSPOTS_FIRST');
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<BatchCityTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch benchmark cities in batches
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      const data = await fetchBatchCitiesTelemetry(BENCHMARK_CITIES);
      if (isMounted) {
        setLeaderboardData(data);
        setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Filter & Sort
  const filteredRankings = useMemo(() => {
    let result = [...leaderboardData];

    // Filter by Region
    if (regionFilter !== 'All') {
      const matchCityNames = new Set(
        BENCHMARK_CITIES.filter((c) => {
          if (regionFilter === 'India') return c.region === 'India' || c.region === 'Bihar & East India';
          return c.region === regionFilter;
        }).map((c) => c.name)
      );
      result = result.filter((c) => matchCityNames.has(c.name));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.admin1?.toLowerCase().includes(q));
    }

    // Sort Order
    result.sort((a, b) => {
      if (sortOrder === 'HOTSPOTS_FIRST') {
        return b.cpcbAqi - a.cpcbAqi;
      }
      return a.cpcbAqi - b.cpcbAqi;
    });

    return result;
  }, [leaderboardData, regionFilter, sortOrder, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Global & Indian Air Quality Leaderboard (Bonus #9)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300">
                  Live Ranked
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Single-batch telemetry ranking across 20+ benchmark cities with 24h inline sparklines
              </p>
            </div>
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSortOrder('HOTSPOTS_FIRST')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                sortOrder === 'HOTSPOTS_FIRST'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔥 Most Polluted (Hotspots)
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('CLEANEST_FIRST')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                sortOrder === 'CLEANEST_FIRST'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌿 Cleanest Air (Refuges)
            </button>
          </div>
        </div>

        {/* Filter Controls: Region Tabs + Search Input */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          {/* Region Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 mr-1 text-[11px] font-semibold uppercase">Filter:</span>
            {(['All', 'India', 'Bihar & East India', 'Global'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  regionFilter === r
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">
              Batching Live Telemetry for 20 Benchmark Metros...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">City & Region</th>
                  <th className={`py-3 px-3 ${activeStandard === 'CPCB' ? 'text-cyan-400 font-bold' : ''}`}>CPCB AQI</th>
                  <th className={`py-3 px-3 ${activeStandard === 'US_EPA' ? 'text-cyan-400 font-bold' : ''}`}>US-EPA (2024)</th>
                  <th className="py-3 px-3">PM2.5 <span className="normal-case font-normal">(µg/m³)</span></th>
                  <th className="py-3 px-3">24h Variation Sparkline</th>
                  <th className="py-3 px-3">Dominant Source</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRankings.map((city, idx) => {
                  const cpcbSev = getSeverityInfo(city.cpcbAqi, 'CPCB', colorblindMode);
                  const isTop3 = idx < 3;

                  // Compute local min and max for relative sparkline visualization
                  const sparkVals = city.historical24hSparkline && city.historical24hSparkline.length > 0 ? city.historical24hSparkline : [city.cpcbAqi];
                  const minVal = Math.min(...sparkVals);
                  const maxVal = Math.max(...sparkVals);
                  const rangeMin = Math.max(0, minVal * 0.85);
                  const rangeMax = Math.max(rangeMin + 20, maxVal * 1.05);
                  const range = Math.max(rangeMax - rangeMin, 1);

                  return (
                    <tr key={city.name} className="hover:bg-slate-800/50 transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-bold ${
                          sortOrder === 'HOTSPOTS_FIRST'
                            ? (isTop3 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-400')
                            : (isTop3 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400')
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100">{city.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {city.admin1 ? `${city.admin1}, ` : ''}{city.countryCode}
                        </div>
                      </td>

                      {/* CPCB AQI */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-sm" style={{ color: cpcbSev.colorHex }}>
                            {city.cpcbAqi}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${cpcbSev.colorHex}20`,
                              color: cpcbSev.colorHex,
                              border: `1px solid ${cpcbSev.colorHex}50`,
                            }}
                          >
                            {cpcbSev.category}
                          </span>
                        </div>
                      </td>

                      {/* US-EPA */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {city.usEpaAqi}
                      </td>

                      {/* PM2.5 */}
                      <td className="py-3 px-3 font-mono font-semibold text-rose-400">
                        {city.pollutants.pm2_5 ?? '--'}
                      </td>

                      {/* 24h Inline SVG Sparkline */}
                      <td className="py-3 px-3">
                        <div className="h-6 w-24 flex items-end gap-0.5">
                          {sparkVals.map((val, i) => {
                            const normalized = ((val - rangeMin) / range) * 100;
                            const hPct = Math.min(100, Math.max(22, Math.round(normalized)));
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-t-xs"
                                style={{
                                  height: `${hPct}%`,
                                  backgroundColor: val > 200 ? '#ef4444' : val > 100 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            );
                          })}
                        </div>
                      </td>

                      {/* Dominant Source */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {city.dominantSource}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCity(city.latitude, city.longitude, city.name, city.admin1, city.countryCode)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
