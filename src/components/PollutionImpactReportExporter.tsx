// src/components/PollutionImpactReportExporter.tsx
// Bonus #8: Automated Pollution Impact & Health Dosimetry Report Exporter (Print/PDF, CSV, JSON)

import React, { useState } from 'react';
import {
  Activity,
  Award,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Printer,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import type { UnifiedAirQualityEnvelope, HourlyTelemetryPoint } from '../types/telemetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';
import {
  calculateBerkeleyEarthCigarettes,
  calculateInhaledDosePreset,
  calculateMppdDeposition,
} from '../utils/healthDosimetry.ts';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';

interface PollutionImpactReportExporterProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: UnifiedAirQualityEnvelope;
  historicalPoints: HourlyTelemetryPoint[];
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
}

export const PollutionImpactReportExporter: React.FC<PollutionImpactReportExporterProps> = ({
  isOpen,
  onClose,
  currentData,
  historicalPoints,
  forecastPoints,
  activeStandard,
  colorblindMode,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const cpcbAqi = currentData.indices.cpcb.aqi;
  const usEpaAqi = currentData.indices.usEpa.aqi;
  const activeAqi = activeStandard === 'CPCB' ? cpcbAqi : usEpaAqi;
  const sev = getSeverityInfo(activeAqi, activeStandard, colorblindMode);

  const pm25 = currentData.pollutants.pm2_5 ?? 0;
  const pm10 = currentData.pollutants.pm10 ?? 0;
  const no2 = currentData.pollutants.no2 ?? 0;
  const so2 = currentData.pollutants.so2 ?? 0;
  const co = currentData.pollutants.co ?? 0;
  const o3 = currentData.pollutants.o3 ?? 0;

  const cigarettes = calculateBerkeleyEarthCigarettes(pm25, 24, false, 'adult');
  const doseResting = calculateInhaledDosePreset(pm25, pm10, no2, so2, 'resting', 60, false);
  const doseRunning = calculateInhaledDosePreset(pm25, pm10, no2, so2, 'running', 60, false);
  const mppd = calculateMppdDeposition(doseRunning.pm25DoseUg, doseRunning.pm10DoseUg);

  const fingerprint = classifyPollutionSource(
    pm25,
    pm10,
    so2,
    no2,
    co,
    currentData.pollutants.dust ?? 10,
    15,
    5,
    new Date(currentData.timestamp.measurementTimeISO).getHours()
  );

  // Export 1: Print / Save to PDF
  const handlePrint = () => {
    window.print();
  };

  // Export 2: Download CSV
  const handleDownloadCsv = () => {
    const headers = [
      'Timestamp',
      'Location',
      'Latitude',
      'Longitude',
      'Data_Provenance',
      'CPCB_NAQI',
      'CPCB_Category',
      'US_EPA_AQI',
      'US_EPA_Category',
      'PM25_ug_m3',
      'PM10_ug_m3',
      'NO2_ug_m3',
      'SO2_ug_m3',
      'CO_mg_m3',
      'O3_ug_m3',
      'Temperature_C',
      'Relative_Humidity_pct',
      'Wind_Speed_m_s',
      'Ventilation_Coefficient_m2_s',
      'Fireworks_Prob_pct',
      'Biomass_Prob_pct',
      'Traffic_Prob_pct',
      'Dust_Prob_pct',
      'Dominant_Source',
    ];

    const rows: string[] = [];

    // Current reading row
    rows.push([
      `"${currentData.timestamp.measurementTimeISO}"`,
      `"${currentData.location.name}"`,
      currentData.location.latitude,
      currentData.location.longitude,
      `"${currentData.provenance.dataCategory}"`,
      currentData.indices.cpcb.aqi,
      `"${currentData.indices.cpcb.category}"`,
      currentData.indices.usEpa.aqi,
      `"${currentData.indices.usEpa.category}"`,
      pm25.toFixed(1),
      pm10.toFixed(1),
      no2.toFixed(1),
      so2.toFixed(1),
      co.toFixed(2),
      o3.toFixed(1),
      (currentData.meteorology.temperatureC ?? 0).toFixed(1),
      (currentData.meteorology.relativeHumidityPct ?? 0).toFixed(0),
      (currentData.meteorology.windSpeedMs ?? 0).toFixed(1),
      (currentData.meteorology.ventilationCoefficientM2s ?? 0).toFixed(0),
      fingerprint.probabilities.pyrotechnicFirecrackers.toFixed(1),
      fingerprint.probabilities.biomassCropBurning.toFixed(1),
      fingerprint.probabilities.vehicularTraffic.toFixed(1),
      fingerprint.probabilities.crustalDust.toFixed(1),
      `"${fingerprint.dominantSource}"`,
    ].join(','));

    // Append historical points
    historicalPoints.forEach((p) => {
      rows.push([
        `"${p.timeISO}"`,
        `"${currentData.location.name}"`,
        currentData.location.latitude,
        currentData.location.longitude,
        '"HISTORICAL_ARCHIVE"',
        p.cpcbAqi,
        '""',
        p.usEpaAqi,
        '""',
        (p.pollutants.pm2_5 ?? 0).toFixed(1),
        (p.pollutants.pm10 ?? 0).toFixed(1),
        (p.pollutants.no2 ?? 0).toFixed(1),
        (p.pollutants.so2 ?? 0).toFixed(1),
        (p.pollutants.co ?? 0).toFixed(2),
        (p.pollutants.o3 ?? 0).toFixed(1),
        '0.0',
        '0',
        '0.0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '""',
      ].join(','));
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AetherGuard-Audit-${currentData.location.name}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('CSV Export Completed Successfully');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  // Export 3: Download Complete JSON Envelope
  const handleDownloadJson = () => {
    const payload = {
      exportMetadata: {
        system: 'AetherGuard (Breathe Better) Atmospheric Intelligence Platform',
        challenge: 'LETS CODE DIWALI CHALLENGE 2026',
        theme: 'Technology for Cleaner Air',
        exportedAt: new Date().toISOString(),
      },
      currentTelemetry: currentData,
      sourceFingerprint: fingerprint,
      historicalSeries: historicalPoints,
      forecastSeries: forecastPoints,
      healthAudit: {
        cigaretteEquivalence: cigarettes,
        restingDoseUgPerHour: doseResting.doseRateUgPerHour,
        runningDoseUgPerHour: doseRunning.doseRateUgPerHour,
        mppdDeposition: mppd,
      },
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AetherGuard-TelemetryEnvelope-${currentData.location.name}-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('JSON Envelope Export Completed Successfully');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Executive Air Quality & Health Audit Report</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                  Bonus #8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated multi-pollutant impact audit ready for executive printing, CSV ingestion, or JSON data science pipelines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-xs flex items-center gap-2 print:hidden">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Printable Audit Document Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-slate-200 bg-slate-950/50 print:bg-white print:text-black print:p-0">
          {/* Document Letterhead */}
          <div className="flex flex-wrap items-start justify-between border-b border-slate-800 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                <span>AetherGuard Atmospheric Intelligence Platform</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Official Submission • LETS CODE DIWALI CHALLENGE 2026 (Theme: Technology for Cleaner Air)
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono space-y-1">
              <p>Audit Ref: <span className="text-slate-200">AGY-2026-DIWALI-{currentData.location.name.toUpperCase().replace(/\s+/g, '')}</span></p>
              <p>Report Date: <span className="text-slate-200">{new Date().toLocaleString()}</span></p>
              <div className="inline-block px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                {currentData.provenance.dataCategory}
              </div>
            </div>
          </div>

          {/* Section 1: Executive Atmospheric Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Location & Geo</span>
              <div className="flex items-center gap-1.5 text-slate-100 font-bold text-base">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{currentData.location.name}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentData.location.latitude.toFixed(4)}°N, {currentData.location.longitude.toFixed(4)}°E
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Indian CPCB NAQI</span>
              <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                <span>{cpcbAqi}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${sev.colorHex}25`, color: sev.colorHex }}>
                  {currentData.indices.cpcb.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Primary: <strong className="text-cyan-300 uppercase">{currentData.indices.cpcb.prominentPollutant}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">US-EPA AQI (2024)</span>
              <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                <span>{usEpaAqi}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {currentData.indices.usEpa.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Primary: <strong className="text-slate-300 uppercase">{currentData.indices.usEpa.prominentPollutant}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Berkeley Equivalence</span>
              <div className="text-2xl font-bold text-indigo-400 font-mono">
                ≈ {cigarettes.cigarettesPerDay} cigs/day
              </div>
              <p className="text-[11px] text-slate-400">
                {cigarettes.lifeMinutesLostPerDay} life-mins lost / 24h
              </p>
            </div>
          </div>

          {/* Section 2: Six Mandatory Pollutants & WHO Guideline Multipliers */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Multi-Pollutant Concentration Telemetry (WHO 2021 Benchmarks)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-2">Pollutant</th>
                    <th className="pb-2">Concentration</th>
                    <th className="pb-2">CPCB Sub-Index</th>
                    <th className="pb-2">US-EPA Sub-Index</th>
                    <th className="pb-2">WHO 2021 Guideline</th>
                    <th className="pb-2">Guideline Multiple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">PM2.5 (Fine Particles)</td>
                    <td className="py-2.5 font-bold text-white">{pm25.toFixed(1)} µg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.pm2_5}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.pm2_5}</td>
                    <td className="py-2.5 text-slate-400">15.0 µg/m³</td>
                    <td className="py-2.5 font-bold text-amber-400">{(pm25 / 15.0).toFixed(1)}x WHO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">PM10 (Coarse Particles)</td>
                    <td className="py-2.5 font-bold text-white">{pm10.toFixed(1)} µg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.pm10}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.pm10}</td>
                    <td className="py-2.5 text-slate-400">45.0 µg/m³</td>
                    <td className="py-2.5 font-bold text-amber-400">{(pm10 / 45.0).toFixed(1)}x WHO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">NO2 (Nitrogen Dioxide)</td>
                    <td className="py-2.5 font-bold text-white">{no2.toFixed(1)} µg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.no2}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.no2}</td>
                    <td className="py-2.5 text-slate-400">25.0 µg/m³</td>
                    <td className="py-2.5 font-bold text-amber-400">{(no2 / 25.0).toFixed(1)}x WHO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">SO2 (Sulfur Dioxide)</td>
                    <td className="py-2.5 font-bold text-white">{so2.toFixed(1)} µg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.so2}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.so2}</td>
                    <td className="py-2.5 text-slate-400">40.0 µg/m³</td>
                    <td className="py-2.5 font-bold text-amber-400">{(so2 / 40.0).toFixed(1)}x WHO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">CO (Carbon Monoxide)</td>
                    <td className="py-2.5 font-bold text-white">{co.toFixed(2)} mg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.co}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.co}</td>
                    <td className="py-2.5 text-slate-400">4.0 mg/m³</td>
                    <td className="py-2.5 font-bold text-emerald-400">{(co / 4.0).toFixed(1)}x WHO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-semibold text-slate-200">O3 (Ground Ozone)</td>
                    <td className="py-2.5 font-bold text-white">{o3.toFixed(1)} µg/m³</td>
                    <td className="py-2.5 text-cyan-300">{currentData.indices.cpcb.subIndices.o3}</td>
                    <td className="py-2.5 text-slate-300">{currentData.indices.usEpa.subIndices.o3}</td>
                    <td className="py-2.5 text-slate-400">100.0 µg/m³</td>
                    <td className="py-2.5 font-bold text-emerald-400">{(o3 / 100.0).toFixed(1)}x WHO</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Environmental Forensics & Health Inhaled Dosimetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Fingerprinting Box */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
                <span>AI Environmental Forensics Breakdown</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dominant Source: <strong className="text-orange-300 font-bold">{fingerprint.dominantSource}</strong>
              </p>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Diwali Firecrackers / Pyrotechnics:</span>
                  <span className="text-orange-400 font-bold">{fingerprint.probabilities.pyrotechnicFirecrackers.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Biomass Stubble Burning:</span>
                  <span className="text-amber-400 font-bold">{fingerprint.probabilities.biomassCropBurning.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicular Exhaust & Urban Traffic:</span>
                  <span className="text-blue-400 font-bold">{fingerprint.probabilities.vehicularTraffic.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Crustal Windblown Dust:</span>
                  <span className="text-yellow-400 font-bold">{fingerprint.probabilities.crustalDust.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Health Dosimetry Box */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span>Physiological Inhaled Dosimetry (V̇_E)</span>
              </h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Resting Adult Inhaled Dose (6 L/min):</span>
                  <span className="text-slate-100 font-bold">{doseResting.doseRateUgPerHour.toFixed(1)} µg PM2.5/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Running Adult Inhaled Dose (60 L/min):</span>
                  <span className="text-rose-400 font-bold">{doseRunning.doseRateUgPerHour.toFixed(1)} µg PM2.5/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MPPD Deep Alveolar Penetration:</span>
                  <span className="text-rose-300 font-bold">{mppd.pm25.alveolarPulmonaryUg.toFixed(1)} µg ({((mppd.pm25.alveolarPulmonaryUg / (doseRunning.pm25DoseUg || 1)) * 100).toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">N95 Protective Attenuation:</span>
                  <span className="text-emerald-400 font-bold">90.0% dose reduction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Data Provenance & Official Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
            <p className="font-bold text-slate-300">DATA PROVENANCE & IMMUTABLE CITATION:</p>
            <p>
              Primary Ground Station / Satellite Model: {currentData.provenance.primarySource.organizationName} ({currentData.provenance.primarySource.sourceUrl}).
            </p>
            <p>
              Station Distance: {currentData.provenance.primarySource.distanceKm ? `${currentData.provenance.primarySource.distanceKm} km` : 'Spatial Interpolation Model'}. Last Sensor Telemetry Update: {currentData.timestamp.measurementTimeISO}.
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Ready for CPCB compliance inspection, PDF printing & open research sharing</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold transition"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-900/30"
            >
              <FileText className="w-4 h-4" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
