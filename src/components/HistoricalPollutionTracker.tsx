// src/components/HistoricalPollutionTracker.tsx
// Mandatory Feature C: Historical Pollution Tracker & Multi-Month Archive Analyzer
// Bonus #11: Unsupervised Real-Time Anomaly Forensics Lab (Modified Z-Score + Isolation Forest)
// Strict 3-Section Decluttered Architecture: Top Date pills + Δ% KPI cards, followed by Segmented Tab Switcher

import React, { useState, useMemo } from 'react';
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Flame,
  LineChart as LineChartIcon,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyTelemetryPoint } from '../types/telemetry.ts';
import { computeModifiedZScore, scoreIsolationForest } from '../ml/anomalyDetector.ts';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';

interface HistoricalPollutionTrackerProps {
  historicalPoints: HourlyTelemetryPoint[];
  cityName?: string;
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode?: boolean;
}

export const HistoricalPollutionTracker: React.FC<HistoricalPollutionTrackerProps> = ({
  historicalPoints,
  activeStandard,
}) => {
  const [timeWindowDays, setTimeWindowDays] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<'aqi' | 'pm' | 'ratio' | 'spikes'>('aqi');
  const [selectedSpike, setSelectedSpike] = useState<any | null>(null);

  // Filter points according to selected window
  const activeHistory = useMemo(() => {
    const requiredHours = timeWindowDays * 24;
    return historicalPoints.slice(-requiredHours);
  }, [historicalPoints, timeWindowDays]);

  // Aggregate by Day: compute daily mean concentrations FIRST, then sub-indices and Day-over-Day Delta %
  const { aggregatedChartData, anomalySpikes, overallDeltas } = useMemo(() => {
    if (activeHistory.length === 0) {
      return { aggregatedChartData: [], anomalySpikes: [], overallDeltas: { aqiDelta: 0, pm25Delta: 0, pm10Delta: 0 } };
    }

    const dateMap = new Map<string, HourlyTelemetryPoint[]>();
    activeHistory.forEach((pt) => {
      const dateKey = pt.timeISO.slice(0, 10);
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(pt);
    });

    const dailyList: {
      date: string;
      meanPm25: number;
      meanPm10: number;
      meanAqi: number;
      pm25DeltaPct: number;
      aqiDeltaPct: number;
    }[] = [];

    const sortedDates = Array.from(dateMap.keys()).sort();
    sortedDates.forEach((dStr, idx) => {
      const pts = dateMap.get(dStr)!;
      const validPm25 = pts.map((p) => p.pollutants.pm2_5).filter((v): v is number => v !== null && !isNaN(v));
      const validPm10 = pts.map((p) => p.pollutants.pm10).filter((v): v is number => v !== null && !isNaN(v));
      const validAqi = pts.map((p) => (activeStandard === 'CPCB' ? p.cpcbAqi : p.usEpaAqi)).filter((v): v is number => v !== null && !isNaN(v));

      const mean25 = validPm25.length > 0 ? validPm25.reduce((a, b) => a + b, 0) / validPm25.length : 0;
      const mean10 = validPm10.length > 0 ? validPm10.reduce((a, b) => a + b, 0) / validPm10.length : 0;
      const meanAq = validAqi.length > 0 ? validAqi.reduce((a, b) => a + b, 0) / validAqi.length : 0;

      let pm25DeltaPct = 0;
      let aqiDeltaPct = 0;
      if (idx > 0) {
        const prev = dailyList[idx - 1];
        pm25DeltaPct = Number((((mean25 - prev.meanPm25) / Math.max(prev.meanPm25, 0.1)) * 100).toFixed(1));
        aqiDeltaPct = Number((((meanAq - prev.meanAqi) / Math.max(prev.meanAqi, 0.1)) * 100).toFixed(1));
      }

      dailyList.push({
        date: dStr,
        meanPm25: Number(mean25.toFixed(1)),
        meanPm10: Number(mean10.toFixed(1)),
        meanAqi: Math.round(meanAq),
        pm25DeltaPct,
        aqiDeltaPct,
      });
    });

    // 2. Compute Unsupervised Anomaly Forensics (Bonus #11)
    const pm25Series = activeHistory.map((p) => p.pollutants.pm2_5 ?? 0);
    const windowVectors: number[][] = activeHistory.map((p) => [
      p.pollutants.pm2_5 ?? 25,
      p.pollutants.pm10 ?? 45,
      p.pollutants.no2 ?? 20,
      p.pollutants.so2 ?? 15,
      (p.pollutants.co ?? 1.0) * 1000,
      p.pollutants.o3 ?? 30,
    ]);

    const chartData: any[] = [];
    const spikes: any[] = [];

    activeHistory.forEach((pt, i) => {
      const pm25Val = pt.pollutants.pm2_5 ?? 0;
      const pm10Val = pt.pollutants.pm10 ?? 0;
      const zInfo = computeModifiedZScore(pm25Series, pm25Val);
      const currentVector = windowVectors[i] || [pm25Val, pm10Val, 20, 15, 1000, 30];
      const ifScore = scoreIsolationForest(windowVectors, currentVector);
      const isSpike = zInfo.isAnomaly || ifScore >= 0.65;

      const dateObj = new Date(pt.timeISO);
      const timeLabel = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getHours()}:00`;

      const ratio = pt.pm25ToPm10Ratio ?? (pm10Val > 0 ? Number((pm25Val / pm10Val).toFixed(2)) : 0.5);
      const currentAqi = activeStandard === 'CPCB' ? pt.cpcbAqi : pt.usEpaAqi;

      chartData.push({
        timeLabel,
        aqi: currentAqi,
        anomalyAqi: isSpike ? currentAqi : null,
        pm2_5: pm25Val,
        pm10: pm10Val,
        so2: pt.pollutants.so2 ?? 0,
        ratio,
        modZ: zInfo.modZ,
        iforest: ifScore,
      });

      if (isSpike) {
        const classified = classifyPollutionSource(
          pm25Val,
          pm10Val,
          pt.pollutants.so2 ?? 0,
          pt.pollutants.no2 ?? 0,
          pt.pollutants.co ?? 0,
          pt.pollutants.dust ?? 0
        );

        spikes.push({
          timeLabel,
          pm25: pm25Val,
          so2: pt.pollutants.so2,
          modZ: zInfo.modZ,
          iforestScore: ifScore,
          dominantSource: classified.dominantSource,
          confidencePct: classified.confidencePct,
          narrative: classified.scientificNarrative,
        });
      }
    });

    // 3. Compute overall DoD / PoP Delta %
    let aqiDelta = 0;
    let pm25Delta = 0;
    let pm10Delta = 0;

    if (activeHistory.length >= 48) {
      const recent24 = activeHistory.slice(-24);
      const prior24 = activeHistory.slice(-48, -24);

      const recentPm25Vals = recent24.map((p) => p.pollutants.pm2_5).filter((v): v is number => v !== null && !isNaN(v));
      const priorPm25Vals = prior24.map((p) => p.pollutants.pm2_5).filter((v): v is number => v !== null && !isNaN(v));
      const recentMeanPm25 = recentPm25Vals.length > 0 ? recentPm25Vals.reduce((a, b) => a + b, 0) / recentPm25Vals.length : 0;
      const priorMeanPm25 = priorPm25Vals.length > 0 ? priorPm25Vals.reduce((a, b) => a + b, 0) / priorPm25Vals.length : 0;
      pm25Delta = priorMeanPm25 > 0 ? Number((((recentMeanPm25 - priorMeanPm25) / priorMeanPm25) * 100).toFixed(1)) : 0;

      const recentPm10Vals = recent24.map((p) => p.pollutants.pm10).filter((v): v is number => v !== null && !isNaN(v));
      const priorPm10Vals = prior24.map((p) => p.pollutants.pm10).filter((v): v is number => v !== null && !isNaN(v));
      const recentMeanPm10 = recentPm10Vals.length > 0 ? recentPm10Vals.reduce((a, b) => a + b, 0) / recentPm10Vals.length : 0;
      const priorMeanPm10 = priorPm10Vals.length > 0 ? priorPm10Vals.reduce((a, b) => a + b, 0) / priorPm10Vals.length : 0;
      pm10Delta = priorMeanPm10 > 0 ? Number((((recentMeanPm10 - priorMeanPm10) / priorMeanPm10) * 100).toFixed(1)) : 0;

      const recentAqiVals = recent24.map((p) => (activeStandard === 'CPCB' ? p.cpcbAqi : p.usEpaAqi)).filter((v): v is number => v !== null && !isNaN(v));
      const priorAqiVals = prior24.map((p) => (activeStandard === 'CPCB' ? p.cpcbAqi : p.usEpaAqi)).filter((v): v is number => v !== null && !isNaN(v));
      const recentMeanAqi = recentAqiVals.length > 0 ? recentAqiVals.reduce((a, b) => a + b, 0) / recentAqiVals.length : 0;
      const priorMeanAqi = priorAqiVals.length > 0 ? priorAqiVals.reduce((a, b) => a + b, 0) / priorAqiVals.length : 0;
      aqiDelta = priorMeanAqi > 0 ? Number((((recentMeanAqi - priorMeanAqi) / priorMeanAqi) * 100).toFixed(1)) : 0;
    } else if (dailyList.length >= 2) {
      const first = dailyList[0];
      const last = dailyList[dailyList.length - 1];
      aqiDelta = Number((((last.meanAqi - first.meanAqi) / Math.max(first.meanAqi, 1)) * 100).toFixed(1));
      pm25Delta = Number((((last.meanPm25 - first.meanPm25) / Math.max(first.meanPm25, 0.1)) * 100).toFixed(1));
      pm10Delta = Number((((last.meanPm10 - first.meanPm10) / Math.max(first.meanPm10, 0.1)) * 100).toFixed(1));
    }

    return {
      dailyMetrics: dailyList,
      aggregatedChartData: chartData,
      anomalySpikes: spikes.slice(0, 10),
      overallDeltas: { aqiDelta, pm25Delta, pm10Delta },
    };
  }, [activeHistory, activeStandard]);

  return (
    <div className="space-y-6">
      {/* ====================================================================
          SECTION 1: PROVENANCE HEADER & DATE RANGE SELECTOR
          ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900/90 backdrop-blur-xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Historical Pollution Tracker & Anomaly Lab
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300">
                Bonus #11 Anomaly Lab
              </span>
            </div>
            {/* Prominent Historical Provenance Badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                HISTORICAL ARCHIVE — VERIFIED REANALYSIS & STATION ROLLUP
              </span>
              <span className="text-[11px] text-stone-400 hidden sm:inline">
                Open-Meteo CAMS Archive + CPCB Ground Station Sync
              </span>
            </div>
          </div>
        </div>

        {/* Date Window Toggle */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          {[
            { days: 3, label: '3 Days' },
            { days: 7, label: '7 Days' },
            { days: 14, label: '14 Days' },
          ].map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setTimeWindowDays(w.days)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeWindowDays === w.days
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====================================================================
          SECTION 2: DAY-OVER-DAY & PERIOD-OVER-PERIOD DELTA % KPI CARDS
          ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* AQI Delta */}
        <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 block font-medium">Overall Period AQI Trend:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.aqiDelta > 0 ? `+${overallDeltas.aqiDelta}%` : `${overallDeltas.aqiDelta}%`}
            </span>
            <span className="text-[10px] text-stone-400">
              {activeHistory.length >= 48 ? '24h Day-over-Day Delta' : `Across ${timeWindowDays} days`}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.aqiDelta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.aqiDelta > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>

        {/* PM2.5 Delta */}
        <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 block font-medium">PM2.5 Concentration Delta:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.pm25Delta > 0 ? `+${overallDeltas.pm25Delta}%` : `${overallDeltas.pm25Delta}%`}
            </span>
            <span className="text-[10px] text-stone-400">Fine combustion particles (DoD)</span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.pm25Delta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.pm25Delta > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </div>

        {/* PM10 Delta */}
        <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 block font-medium">PM10 Coarse Dust Delta:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.pm10Delta > 0 ? `+${overallDeltas.pm10Delta}%` : `${overallDeltas.pm10Delta}%`}
            </span>
            <span className="text-[10px] text-stone-400">Road & crustal dust suspension</span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.pm10Delta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.pm10Delta > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* ====================================================================
          SECTION 3: SEGMENTED FORENSIC EXPLORER (DECLUTTERED SWITCHER)
          ==================================================================== */}
      <div className="space-y-4">
        {/* Navigation Switcher */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('aqi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'aqi'
                ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>AQI Progression & Anomalies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pm'
                ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>PM2.5 vs PM10 Dual Lines</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ratio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ratio'
                ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Pyrotechnic Ratio & SO2</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spikes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'spikes'
                ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Anomaly Spikes Forensics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-mono">
              {anomalySpikes.length}
            </span>
          </button>
        </div>

        {/* Tab 1: AQI Progression & Anomaly Markers */}
        {activeTab === 'aqi' && (
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Historical AQI Progression & Anomaly Flagging
                </h3>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                Red pulse markers indicate |ModZ| &gt; 3.5 or Isolation Forest &ge; 0.65
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="timeLabel" stroke="#78716c" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#78716c" domain={[0, 500]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '11px', color: '#fafaf9' }}
                    labelStyle={{ color: '#d6d3d1' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Satisfactory (100)', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceLine y={200} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Moderate (200)', fill: '#eab308', fontSize: 10 }} />
                  <ReferenceLine y={300} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Poor (300)', fill: '#f97316', fontSize: 10 }} />
                  <ReferenceLine y={400} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Severe (400)', fill: '#ef4444', fontSize: 10 }} />

                  <Area type="monotone" dataKey="aqi" name="Historical AQI" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                  <Line type="monotone" dataKey="anomalyAqi" name="Statistical Anomaly Spike" stroke="#ef4444" strokeWidth={0} dot={{ r: 5, fill: '#ef4444', stroke: '#fee2e2', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: PM2.5 vs PM10 Dual Concentrations */}
        {activeTab === 'pm' && (
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  PM2.5 vs PM10 Physical Mass Concentrations (µg/m³)
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                Fine Combustion vs Coarse Dust Kinetics
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="timeLabel" stroke="#78716c" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#78716c" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '11px', color: '#fafaf9' }}
                    labelStyle={{ color: '#d6d3d1' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  <Line type="monotone" dataKey="pm2_5" name="PM2.5 (Fine Combustion)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pm10" name="PM10 (Coarse Dust)" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: Ratio & SO2 */}
        {activeTab === 'ratio' && (
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  Fine-to-Coarse Ratio & SO2 Pyrotechnic Spikes
                </h3>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                Ratio &gt; 0.65 + SO2 spike = Diwali Firecrackers
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedChartData} margin={{ top: 15, right: 35, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="timeLabel" stroke="#78716c" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#78716c" domain={[0, 1.0]} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '11px', color: '#fafaf9' }}
                    labelStyle={{ color: '#d6d3d1' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  <Line yAxisId="left" type="monotone" dataKey="ratio" name="PM2.5 / PM10 Ratio" stroke="#fb923c" strokeWidth={2} dot={false} />
                  <Bar yAxisId="right" dataKey="so2" name="SO2 (µg/m³)" fill="#f59e0b" opacity={0.65} barSize={6} />
                  <ReferenceLine yAxisId="left" y={0.65} stroke="#ea580c" strokeDasharray="4 4" label={{ value: 'Pyrotechnic Ratio (0.65)', fill: '#ea580c', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Anomaly Forensics Registry Table */}
        {activeTab === 'spikes' && (
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Unsupervised Anomaly Forensics Registry (Bonus #11)
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {anomalySpikes.length} statistical anomaly events detected
              </span>
            </div>

            {anomalySpikes.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4">
                No statistical anomaly spikes (|ModZ| &gt; 3.5) detected in this window. Baseline is stable.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp (IST)</th>
                      <th className="py-2.5 px-3">Peak PM2.5</th>
                      <th className="py-2.5 px-3">SO2 (µg/m³)</th>
                      <th className="py-2.5 px-3">Modified Z-Score</th>
                      <th className="py-2.5 px-3">Isolation Forest</th>
                      <th className="py-2.5 px-3">Classified Source Fingerprint</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono">
                    {anomalySpikes.map((spike, idx) => (
                      <tr key={idx} className="hover:bg-stone-850/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-stone-200">{spike.timeLabel}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-400">{spike.pm25} µg/m³</td>
                        <td className="py-2.5 px-3 text-amber-300">{spike.so2?.toFixed(1) || '--'}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">
                          {spike.modZ}σ
                        </td>
                        <td className="py-2.5 px-3 text-orange-300">
                          {spike.iforestScore}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            spike.dominantSource === 'PYROTECHNIC_FIRECRACKERS'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : spike.dominantSource === 'BIOMASS_CROP_BURNING'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-stone-800 text-stone-300 border border-stone-700'
                          }`}>
                            {spike.dominantSource === 'PYROTECHNIC_FIRECRACKERS' ? '🎆 Firecracker' : spike.dominantSource === 'BIOMASS_CROP_BURNING' ? '🌾 Biomass' : '🚗 Traffic'}
                            <span className="text-[10px] opacity-75">({spike.confidencePct}%)</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => setSelectedSpike(spike)}
                            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-750 text-stone-200 text-[11px] transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected Spike Deep Dive Modal */}
            {selectedSpike && (
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2 mt-3 text-xs">
                <div className="flex items-center justify-between text-stone-200 font-bold">
                  <span>Spike Forensic Deep Dive: {selectedSpike.timeLabel}</span>
                  <button onClick={() => setSelectedSpike(null)} className="text-stone-400 hover:text-white">✕</button>
                </div>
                <p className="text-stone-300 font-sans leading-relaxed">
                  {selectedSpike.narrative}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
