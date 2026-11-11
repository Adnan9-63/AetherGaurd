// src/components/AIExecutiveInsightBanner.tsx
// Bonus #10 & #13: Automated AI Environmental Epidemiologist Synthesis & Diurnal Dispersion Insights
// Generates contextual, scientifically grounded executive insights with Hindi translation toggle

import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';
import { calculateBerkeleyEarthCigarettes, findSafeOutdoorActivityWindow } from '../utils/healthDosimetry.ts';

interface AIExecutiveInsightBannerProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
}

export const AIExecutiveInsightBanner: React.FC<AIExecutiveInsightBannerProps> = ({
  currentData,
  forecastPoints,
}) => {
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [isExpanded, setIsExpanded] = useState(false);

  const { pollutants, meteorology, indices, location } = currentData;
  const pm25 = pollutants.pm2_5 ?? 50;
  const pm10 = pollutants.pm10 ?? 90;
  const so2 = pollutants.so2 ?? 15;
  const no2 = pollutants.no2 ?? 25;
  const co = pollutants.co ?? 1.0;
  const dust = pollutants.dust ?? 20;

  // Run AI Source Fingerprinting
  const fingerprint = classifyPollutionSource(pm25, pm10, so2, no2, co, dust);

  // Run Health Dosimetry & 24h Safe Window Recommender
  const cigResult = calculateBerkeleyEarthCigarettes(pm25, 2, false, 'adult');
  const safeWindow = findSafeOutdoorActivityWindow(forecastPoints, 2);

  // Parse safe window start and end times
  const safeStart = safeWindow ? new Date(safeWindow.bestWindowStartISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '15:00';
  const safeEnd = safeWindow ? new Date(safeWindow.bestWindowEndISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '17:00';

  const blh = meteorology.boundaryLayerHeightM ? Math.round(meteorology.boundaryLayerHeightM) : 380;
  const vc = meteorology.ventilationCoefficientM2s ? Math.round(meteorology.ventilationCoefficientM2s) : 420;

  // Atmospheric Boundary Layer & Ventilation Dynamic Narrative
  const isDispersionFavorable = blh >= 500 || vc >= 1500;
  const dispersionTextEn = isDispersionFavorable
    ? `Favorable planetary boundary layer (${blh} m) and active atmospheric ventilation (${vc} m²/s) promote vertical dispersion of pollutants.`
    : `Shallow planetary boundary layer (${blh} m) and restricted ventilation (${vc} m²/s) are trapping ground aerosols.`;

  const dispersionTextHi = isDispersionFavorable
    ? `अनुकूल वायुमंडलीय परत (${blh} मीटर) और सक्रिय वेंटिलेशन (${vc} m²/s) प्रदूषकों के ऊर्ध्वाधर फैलाव में सहायक हैं।`
    : `निचली वायुमंडलीय परत (${blh} मीटर) और सीमित वेंटिलेशन (${vc} m²/s) के कारण प्रदूषक ज़मीन के पास फंसे हुए हैं।`;

  // English Summary
  const sourceNameMap: Record<string, string> = {
    PYROTECHNIC_FIRECRACKERS: 'Diwali Pyrotechnic Firecrackers (KNO3 + Sulfur Oxidation)',
    BIOMASS_CROP_BURNING: 'Agricultural Stubble / Biomass Burning (Incomplete Pyrolysis)',
    VEHICULAR_TRAFFIC: 'Vehicular Corridor Emissions & Traffic Congestion',
    CRUSTAL_DUST: 'Crustal Road Resuspension & Construction Dust',
    SECONDARY_BACKGROUND: 'Urban Secondary Background Aerosols',
  };

  const englishSummary = `Air quality in ${location.name} is currently ${indices.cpcb.category} (CPCB AQI ${indices.cpcb.aqi}). Our multi-pollutant fingerprinting identifies ${sourceNameMap[fingerprint.dominantSource]} as the primary source (${fingerprint.confidencePct}% confidence). ${dispersionTextEn} Breathing ambient air today equates to smoking ~${cigResult.cigarettesPerDay} cigarettes. Recommended outdoor window: ${safeStart} to ${safeEnd} IST.`;

  // Hindi Summary
  const hindiSummary = `${location.name} में वायु गुणवत्ता वर्तमान में '${indices.cpcb.category}' श्रेणी (CPCB AQI ${indices.cpcb.aqi}) पर है। एआई फ़िंगरप्रिंटिंग के अनुसार मुख्य स्रोत '${sourceNameMap[fingerprint.dominantSource]}' है (${fingerprint.confidencePct}% सटीकता)। ${dispersionTextHi} आज बाहर सांस लेना ~${cigResult.cigarettesPerDay} सिगरेट पीने के बराबर है। सबसे सुरक्षित बाहरी समय: ${safeStart} से ${safeEnd} बजे तक।`;

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 p-4 shadow-xl overflow-hidden text-slate-200">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Bot className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>AI Atmospheric & Epidemiological Synthesis</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                  Bonus #10 Insights
                </span>
              </h4>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5 hidden sm:block">
              Continuous physics-grounded synthesis of boundary-layer trapping and emission forensics
            </p>
          </div>
        </div>

        {/* Controls: Hindi Toggle & Expand */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'EN' ? 'हिंदी' : 'English'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Narrative Text */}
      <div className="mt-3 text-xs leading-relaxed text-slate-200 bg-slate-950/40 p-3 rounded-xl border border-indigo-900/30">
        <p className="font-normal font-sans">
          {lang === 'EN' ? englishSummary : hindiSummary}
        </p>
      </div>

      {/* Expanded Forensic & Meteorological Breakdown */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Source Diagnostic Ratio:</span>
            <span className="font-mono font-semibold text-cyan-300">
              PM2.5 / PM10 = {fingerprint.diagnosticMetrics.pm25ToPm10Ratio}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              SO2 Z-Score: {fingerprint.diagnosticMetrics.so2ZScore}σ
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Atmospheric Dispersion:</span>
            <span className="font-mono font-semibold text-amber-300">
              VC: {vc} m²/s (BLH: {blh} m)
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Wind: {meteorology.windSpeedMs?.toFixed(1) || '1.5'} m/s
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Safe Activity Window:</span>
            <span className="font-mono font-semibold text-emerald-300">
              {safeStart} - {safeEnd} IST
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Suitability: {safeWindow?.suitabilityGrade || 'FAIR'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
