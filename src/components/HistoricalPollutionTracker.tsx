// src/components/HistoricalPollutionTracker.tsx
// Mandatory Feature C: Historical Pollution Tracker & Multi-Month Archive Analyzer
// Bonus #11: Unsupervised Real-Time Anomaly Forensics Lab (Modified Z-Score + Isolation Forest)

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

    // 1. Group points by date YYYY-MM-DD
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
      const validAqi = pts.map((p) => p.cpcbAqi).filter((v): v is number => v !== null && !isNaN(v));

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

    // 2. Prepare hourly chart data with Anomaly Flags (Modified Z-Score + Isolation Forest)
    const pm25Series = activeHistory.map((p) => p.pollutants.pm2_5 ?? 30);
    const windowVectors = activeHistory.map((p) => [
      p.pollutants.pm2_5 ?? 30,
      p.pollutants.pm10 ?? 60,
      p.pollutants.no2 ?? 25,
      p.pollutants.so2 ?? 15,
      (p.pollutants.co ?? 1.0) * 1000,
      p.pollutants.o3 ?? 30,
    ]);

    const spikes: any[] = [];
    const chartData = activeHistory.map((pt, i) => {
      const curPm25 = pt.pollutants.pm2_5 ?? 30;
      const curVector = [
        curPm25,
        pt.pollutants.pm10 ?? 60,
        pt.pollutants.no2 ?? 25,
        pt.pollutants.so2 ?? 15,
        (pt.pollutants.co ?? 1.0) * 1000,
        pt.pollutants.o3 ?? 30,
      ];

      // Rolling 24-hour slice for ModZ
      const sliceStart = Math.max(0, i - 24);
      const rollingSeries = pm25Series.slice(sliceStart, i + 1);
      const { modZ, isAnomaly: isZAnomaly } = computeModifiedZScore(rollingSeries, curPm25);

      // Isolation Forest score
      const iforestScore = scoreIsolationForest(windowVectors.slice(Math.max(0, i - 72), i + 1), curVector, 30);
      const isForestAnomaly = iforestScore >= 0.65;

      const isAnomaly = isZAnomaly || isForestAnomaly;

      // Fingerprint classification for this hour
      const fp = classifyPollutionSource(
        curPm25,
        pt.pollutants.pm10 ?? 60,
        pt.pollutants.so2 ?? 15,
        pt.pollutants.no2 ?? 25,
        pt.pollutants.co ?? 1.0,
        pt.pollutants.dust ?? 20
      );

      const dObj = new Date(pt.timeISO);
      const timeLabel = `${dObj.getDate()}/${dObj.getMonth() + 1} ${dObj.getHours()}:00`;

      if (isAnomaly && (curPm25 > 45 || Math.abs(modZ) > 3.5 || iforestScore >= 0.68)) {
        spikes.push({
          timeISO: pt.timeISO,
          timeLabel,
          pm25: curPm25,
          pm10: pt.pollutants.pm10,
          so2: pt.pollutants.so2,
          modZ,
          iforestScore,
          dominantSource: fp.dominantSource,
          confidencePct: fp.confidencePct,
          narrative: fp.scientificNarrative,
        });
      }

      return {
        timeISO: pt.timeISO,
        timeLabel,
        aqi: activeStandard === 'CPCB' ? pt.cpcbAqi : pt.usEpaAqi,
        pm2_5: curPm25,
        pm10: pt.pollutants.pm10 ?? 50,
        so2: pt.pollutants.so2 ?? 12,
        no2: pt.pollutants.no2 ?? 20,
        ratio: pt.pm25ToPm10Ratio ?? (curPm25 / Math.max(pt.pollutants.pm10 || 1, 1)),
        isAnomaly,
        modZ,
        iforestScore,
        anomalyAqi: isAnomaly ? (activeStandard === 'CPCB' ? pt.cpcbAqi : pt.usEpaAqi) : null,
      };
    });

    // Overall Period-over-Period and Day-over-Day Deltas
    let aqiDelta = 0;
    let pm25Delta = 0;
    let pm10Delta = 0;

    if (activeHistory.length >= 48) {
      const recent24 = activeHistory.slice(-24);
      const prior24 = activeHistory.slice(-48, -24);

      const recentPm25Vals = recent24.map(p => p.pollutants.pm2_5).filter((v): v is number => v !== null && !isNaN(v));
      const priorPm25Vals = prior24.map(p => p.pollutants.pm2_5).filter((v): v is number => v !== null && !isNaN(v));
      const recentMeanPm25 = recentPm25Vals.length > 0 ? recentPm25Vals.reduce((a, b) => a + b, 0) / recentPm25Vals.length : 0;
      const priorMeanPm25 = priorPm25Vals.length > 0 ? priorPm25Vals.reduce((a, b) => a + b, 0) / priorPm25Vals.length : 0;
      pm25Delta = priorMeanPm25 > 0 ? Number((((recentMeanPm25 - priorMeanPm25) / priorMeanPm25) * 100).toFixed(1)) : 0;

      const recentPm10Vals = recent24.map(p => p.pollutants.pm10).filter((v): v is number => v !== null && !isNaN(v));
      const priorPm10Vals = prior24.map(p => p.pollutants.pm10).filter((v): v is number => v !== null && !isNaN(v));
      const recentMeanPm10 = recentPm10Vals.length > 0 ? recentPm10Vals.reduce((a, b) => a + b, 0) / recentPm10Vals.length : 0;
      const priorMeanPm10 = priorPm10Vals.length > 0 ? priorPm10Vals.reduce((a, b) => a + b, 0) / priorPm10Vals.length : 0;
      pm10Delta = priorMeanPm10 > 0 ? Number((((recentMeanPm10 - priorMeanPm10) / priorMeanPm10) * 100).toFixed(1)) : 0;

      const recentAqiVals = recent24.map(p => (activeStandard === 'CPCB' ? p.cpcbAqi : p.usEpaAqi)).filter((v): v is number => v !== null && !isNaN(v));
      const priorAqiVals = prior24.map(p => (activeStandard === 'CPCB' ? p.cpcbAqi : p.usEpaAqi)).filter((v): v is number => v !== null && !isNaN(v));
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
      {/* Header Bar: Provenance & Time Window Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Historical Pollution Tracker & Anomaly Lab
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300">
                Bonus #11 Anomaly Lab
              </span>
            </div>
            {/* Prominent Historical Provenance Badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/70">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                HISTORICAL ARCHIVE — VERIFIED REANALYSIS & STATION ROLLUP
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Open-Meteo CAMS Archive + CPCB Ground Station Sync
              </span>
            </div>
          </div>
        </div>

        {/* Date Window Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Delta Cards: Day-over-Day & Period-over-Period Changes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* AQI Delta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Overall Period AQI Trend:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.aqiDelta > 0 ? `+${overallDeltas.aqiDelta}%` : `${overallDeltas.aqiDelta}%`}
            </span>
            <span className="text-[10px] text-slate-400">{activeHistory.length >= 48 ? '24h Day-over-Day Delta' : `Across ${timeWindowDays} days`}</span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.aqiDelta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.aqiDelta > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>

        {/* PM2.5 Delta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">PM2.5 Concentration Delta:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.pm25Delta > 0 ? `+${overallDeltas.pm25Delta}%` : `${overallDeltas.pm25Delta}%`}
            </span>
            <span className="text-[10px] text-slate-400">{activeHistory.length >= 48 ? '24h Day-over-Day Delta' : 'Fine combustion particles'}</span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.pm25Delta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.pm25Delta > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </div>

        {/* PM10 Delta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">PM10 Coarse Dust Delta:</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
              {overallDeltas.pm10Delta > 0 ? `+${overallDeltas.pm10Delta}%` : `${overallDeltas.pm10Delta}%`}
            </span>
            <span className="text-[10px] text-slate-400">{activeHistory.length >= 48 ? '24h Day-over-Day Delta' : 'Road & mineral dust resuspension'}</span>
          </div>
          <div className={`p-3 rounded-xl ${overallDeltas.pm10Delta > 0 ? 'bg-rose-950/80 text-rose-400' : 'bg-emerald-950/80 text-emerald-400'}`}>
            {overallDeltas.pm10Delta > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Synchronized Panel 1: Historical AQI Trend with Severity Bands & Anomaly Pins */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Panel 1: Historical AQI Progression & Anomaly Flagging
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Red markers indicate |ModZ| &gt; 3.5 or Isolation Forest &ge; 0.65
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregatedChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" domain={[0, 500]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {/* Regulatory Severity Reference Lines */}
              <ReferenceLine y={100} stroke="#92d050" strokeDasharray="3 3" label={{ value: 'Satisfactory (100)', fill: '#92d050', fontSize: 10 }} />
              <ReferenceLine y={200} stroke="#ffff00" strokeDasharray="3 3" label={{ value: 'Moderate (200)', fill: '#eab308', fontSize: 10 }} />
              <ReferenceLine y={300} stroke="#ff9900" strokeDasharray="3 3" label={{ value: 'Poor (300)', fill: '#f97316', fontSize: 10 }} />
              <ReferenceLine y={400} stroke="#ff0000" strokeDasharray="3 3" label={{ value: 'Severe (400)', fill: '#ef4444', fontSize: 10 }} />

              <Area type="monotone" dataKey="aqi" name="Historical AQI" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Line type="monotone" dataKey="anomalyAqi" name="Statistical Anomaly Spike" stroke="#ef4444" strokeWidth={0} dot={{ r: 5, fill: '#ef4444', stroke: '#fee2e2', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Synchronized Panel 2: Dual-Line PM2.5 vs PM10 Concentrations */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Panel 2: PM2.5 vs PM10 Physical Mass Concentrations (µg/m³)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Fine Combustion vs Coarse Dust Kinetics
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aggregatedChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              <Line type="monotone" dataKey="pm2_5" name="PM2.5 (Fine)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pm10" name="PM10 (Coarse)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Synchronized Panel 3: PM2.5 / PM10 Ratio & SO2 Pyrotechnic Oxidation Signature */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Panel 3: Fine-to-Coarse Ratio & SO2 Pyrotechnic Spikes
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Ratio &gt; 0.65 + SO2 spike = Diwali Firecrackers
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregatedChartData} margin={{ top: 15, right: 35, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" stroke="#64748b" domain={[0, 1.0]} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              <Line yAxisId="left" type="monotone" dataKey="ratio" name="PM2.5 / PM10 Ratio" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Bar yAxisId="right" dataKey="so2" name="SO2 (µg/m³)" fill="#f59e0b" opacity={0.65} barSize={6} />
              <ReferenceLine yAxisId="left" y={0.65} stroke="#a855f7" strokeDasharray="4 4" label={{ value: 'Pyrotechnic Ratio (0.65)', fill: '#a855f7', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bonus #11: Anomaly Spike Forensics Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">
              Unsupervised Anomaly Forensics Registry (Bonus #11)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {anomalySpikes.length} statistical anomaly events detected
          </span>
        </div>

        {anomalySpikes.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">
            No statistical anomaly spikes (|ModZ| &gt; 3.5) detected in this window. Baseline is stable.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {anomalySpikes.map((spike, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{spike.timeLabel}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-400">{spike.pm25} µg/m³</td>
                    <td className="py-2.5 px-3 text-amber-300">{spike.so2?.toFixed(1) || '--'}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-300">
                      {spike.modZ}σ
                    </td>
                    <td className="py-2.5 px-3 text-purple-300">
                      {spike.iforestScore}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        spike.dominantSource === 'PYROTECHNIC_FIRECRACKERS'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : spike.dominantSource === 'BIOMASS_CROP_BURNING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {spike.dominantSource === 'PYROTECHNIC_FIRECRACKERS' ? '🎆 Firecracker' : spike.dominantSource === 'BIOMASS_CROP_BURNING' ? '🌾 Biomass' : '🚗 Traffic'}
                        <span className="text-[10px] opacity-75">({spike.confidencePct}%)</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedSpike(spike)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
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
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700 space-y-2 mt-3 text-xs">
            <div className="flex items-center justify-between text-slate-200 font-bold">
              <span>Spike Forensic Deep Dive: {selectedSpike.timeLabel}</span>
              <button onClick={() => setSelectedSpike(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 font-sans leading-relaxed">
              {selectedSpike.narrative}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
