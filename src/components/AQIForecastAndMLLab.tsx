// src/components/AQIForecastAndMLLab.tsx
// Mandatory Feature F: 5-Day Hourly AQI Forecast Timeline & Upcoming Spike Alerter
// Bonus #3: Explainable ML-Based Prediction Engine & Feature Attribution Waterfall

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Bot,
  Cpu,
  LineChart as LineChartIcon,
  ShieldAlert,
} from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { generateExplainableForecast } from '../ml/explainableForecastEngine.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface AQIForecastAndMLLabProps {
  currentData: UnifiedAirQualityEnvelope;
  historicalPoints: HourlyTelemetryPoint[];
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
}

export const AQIForecastAndMLLab: React.FC<AQIForecastAndMLLabProps> = ({
  currentData,
  historicalPoints,
  forecastPoints,
  activeStandard,
  colorblindMode,
}) => {
  // Generate Explainable ML Forecast
  const mlResult = useMemo(() => {
    return generateExplainableForecast(currentData, historicalPoints, forecastPoints, 72);
  }, [currentData, historicalPoints, forecastPoints]);

  // Combine past 24h (solid) + future 120h (dashed) across NOW divider
  const { timelineData, upcomingSpikes } = useMemo(() => {
    const past24 = historicalPoints.slice(-24);
    const future120 = forecastPoints.slice(0, 120);

    // Detect Upcoming Spikes (> +50 within 6h or crossing severe bracket)
    const detectedSpikes: {
      timeISO: string;
      timeLabel: string;
      predictedAqi: number;
      surgeDelta: number;
      severityCategory: string;
    }[] = [];

    let prevAqi = currentData.indices.cpcb.aqi;
    future120.forEach((f, i) => {
      const aqi = f.cpcbAqi;
      const surge = aqi - prevAqi;
      if ((surge >= 40 && i <= 24) || (aqi >= 300 && prevAqi < 300)) {
        const d = new Date(f.timeISO);
        detectedSpikes.push({
          timeISO: f.timeISO,
          timeLabel: `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`,
          predictedAqi: aqi,
          surgeDelta: surge,
          severityCategory: getSeverityInfo(aqi, activeStandard, colorblindMode).category,
        });
      }
      prevAqi = aqi;
    });

    const combined: any[] = [];

    // Past 24 hours: actualMeasuredAqi populated, projectedAqi null
    past24.forEach((pt) => {
      const d = new Date(pt.timeISO);
      combined.push({
        timeISO: pt.timeISO,
        timeLabel: `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`,
        actualMeasuredAqi: activeStandard === 'CPCB' ? pt.cpcbAqi : pt.usEpaAqi,
        projectedAqi: null,
        blh: pt.meteorology.boundaryLayerHeightM,
        vc: pt.meteorology.ventilationCoefficientM2s,
        isForecast: false,
      });
    });

    // Anchor NOW point
    const curAqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
    combined.push({
      timeISO: currentData.timestamp.measurementTimeISO,
      timeLabel: 'NOW',
      actualMeasuredAqi: curAqi,
      projectedAqi: curAqi,
      blh: currentData.meteorology.boundaryLayerHeightM,
      vc: currentData.meteorology.ventilationCoefficientM2s,
      isForecast: false,
    });

    // Future 120 hours: actualMeasuredAqi null, projectedAqi populated (safe forward-fill if <= 0)
    let lastValidForecastAqi = curAqi;
    future120.forEach((pt) => {
      const rawAqi = activeStandard === 'CPCB' ? pt.cpcbAqi : pt.usEpaAqi;
      const safeAqi = (rawAqi !== null && rawAqi !== undefined && rawAqi > 0) ? rawAqi : lastValidForecastAqi;
      lastValidForecastAqi = safeAqi;

      const d = new Date(pt.timeISO);
      combined.push({
        timeISO: pt.timeISO,
        timeLabel: `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`,
        actualMeasuredAqi: null,
        projectedAqi: safeAqi,
        blh: pt.meteorology?.boundaryLayerHeightM ?? 0,
        vc: pt.meteorology?.ventilationCoefficientM2s ?? 0,
        isForecast: true,
      });
    });

    return {
      timelineData: combined,
      upcomingSpikes: detectedSpikes.slice(0, 3),
    };
  }, [historicalPoints, forecastPoints, currentData, activeStandard, colorblindMode]);

  return (
    <div className="space-y-6">
      {/* Header Bar with Mandatory Warning Badge */}
      <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-amber-900/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                5-Day Atmospheric Forecast & Explainable ML Lab
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300">
                Bonus #3 Explainable ML
              </span>
            </div>
            {/* Prominent Amber Warning Badge Enforcing Visual & Schema Separation */}
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-700/80 shadow-inner">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                FORECAST / ATMOSPHERIC MODEL & ML ESTIMATE — NOT A LIVE SENSOR READING
              </span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-slate-400">
          <span>Horizon: 120 Hours (5 Days)</span>
          <span className="block text-[11px] font-mono text-cyan-300">
            ECMWF IFS & CAMS Global Atmospheric Composition
          </span>
        </div>
      </div>

      {/* Upcoming Spike Alert Banner */}
      {upcomingSpikes.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border border-rose-800/80 shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Upcoming Severe Pollution Surge Warning</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {upcomingSpikes.map((spk, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px] block">{spk.timeLabel} IST</span>
                <span className="text-rose-400 font-bold font-mono text-base">
                  {spk.predictedAqi} AQI ({spk.severityCategory})
                </span>
                <span className="text-[10px] text-amber-300 block mt-0.5">
                  Surge: +{spk.surgeDelta} AQI in prior window
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synchronized 120-Hour Timeline Chart: Solid Live vs Dashed Forecast */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Multi-Day Continuous Progression: 24h Live History vs 120h Future Forecast
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500 inline-block" />
              <span>Solid: Live Measurements</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400 inline-block" />
              <span>Dashed: Forecast / ML Zone</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" domain={[0, 500]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(val: any, name: any) => {
                  if (name === 'Projected AQI (Forecast)') return [`Projected (CAMS / ML): ${val} AQI`, name];
                  return [`Measured: ${val} AQI`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {/* Vertical NOW Reference Line */}
              <ReferenceLine x="NOW" stroke="#06b6d4" strokeWidth={2} label={{ value: 'CURRENT TIME (NOW)', fill: '#06b6d4', fontSize: 10, position: 'top' }} />

              {/* Severity Thresholds */}
              <ReferenceLine y={200} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={300} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={400} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />

              {/* Past Solid Line */}
              <Line
                type="monotone"
                dataKey="actualMeasuredAqi"
                name="Actual Live Measurements"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />

              {/* Future Dashed Line */}
              <Line
                type="monotone"
                dataKey="projectedAqi"
                name="Projected AQI (Forecast)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bonus #3: Explainable ML Feature Attribution Waterfall Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Explainable ML Attribution Waterfall (Bonus #3)
              </h3>
              <p className="text-xs text-slate-400">
                Additive SHAP-style breakdown: why tomorrow's AQI will rise or fall
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-300">
            Baseline: {mlResult.baseline72hMeanAqi} AQI
          </span>
        </div>

        {/* Narrative Banner */}
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-200 leading-relaxed font-sans">
          <strong>Physics Driver Synthesis: </strong> {mlResult.executiveNarrative}
        </div>

        {/* Waterfall Attribute Bars */}
        <div className="space-y-3 pt-2">
          {mlResult.overallTopAttributions.map((attr) => (
            <div key={attr.featureKey} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${attr.isAdverse ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                  <span className="font-semibold text-slate-200">{attr.featureName}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-400 font-mono">Raw: {attr.rawValue} {attr.unit}</span>
                  <span className={`font-mono font-bold text-sm ${attr.isAdverse ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {attr.attributionAqiDelta >= 0 ? `+${attr.attributionAqiDelta}` : attr.attributionAqiDelta} AQI
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {attr.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
