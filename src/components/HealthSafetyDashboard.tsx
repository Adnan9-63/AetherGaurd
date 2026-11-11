// src/components/HealthSafetyDashboard.tsx
// Mandatory Feature E: Health & Safety Dosimetry Dashboard
// Features: Berkeley Earth Cigarette Calculator, Minute-Ventilation Inhaled Dose,
// MPPD Lung Deposition Visualizer, 24h Safe Outdoor Window, and Sensitive-Group Precaution Matrix

import React, { useState } from 'react';
import {
  Cigarette,
  Clock,
  Heart,
  HeartPulse,
  Info,
  ShieldCheck,
  Users,
  Wind,
} from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import {
  calculateBerkeleyEarthCigarettes,
  calculateBiometricVentilationRate,
  calculateInhaledDosePreset,
  calculateMppdDeposition,
  findSafeOutdoorActivityWindow,
  SENSITIVE_GROUP_PRECAUTIONS,
} from '../utils/healthDosimetry.ts';
import { getSeverityInfo } from '../utils/severityHelper.ts';

interface HealthSafetyDashboardProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
}

export const HealthSafetyDashboard: React.FC<HealthSafetyDashboardProps> = ({
  currentData,
  forecastPoints,
  activeStandard,
  colorblindMode,
}) => {
  // 1. Berkeley Earth State
  const [outdoorHours, setOutdoorHours] = useState<number>(2);
  const [hepaEnabled, setHepaEnabled] = useState<boolean>(false);
  const [ageGroup, setAgeGroup] = useState<'adult' | 'child' | 'senior'>('adult');

  // 2. Minute-Ventilation Dose State
  const [doseMode, setDoseMode] = useState<'PRESET' | 'BIOMETRIC'>('PRESET');
  const [activityPreset, setActivityPreset] = useState<'resting' | 'walking' | 'cycling' | 'running'>('running');
  const [hasN95Mask, setHasN95Mask] = useState<boolean>(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Biometric sliders
  const [heartRate, setHeartRate] = useState<number>(140);
  const [ageYears, setAgeYears] = useState<number>(28);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [fvcLiters, setFvcLiters] = useState<number>(4.5);
  const [breathsPerMin, setBreathsPerMin] = useState<number>(24);

  // 3. Precaution Matrix Persona
  const [selectedCohort, setSelectedCohort] = useState<
    'generalPublic' | 'childrenAndPregnant' | 'elderly' | 'asthmaCopd' | 'cardiovascularCad'
  >('generalPublic');

  const pm25 = currentData.pollutants.pm2_5 ?? 60;
  const pm10 = currentData.pollutants.pm10 ?? 110;
  const no2 = currentData.pollutants.no2 ?? 30;
  const so2 = currentData.pollutants.so2 ?? 15;

  // Berkeley Earth Calculation
  const cigs = calculateBerkeleyEarthCigarettes(pm25, outdoorHours, hepaEnabled, ageGroup);

  // Minute Ventilation Calculation
  let minuteVentilationLMin = 60.0;
  let minuteVentilationM3Min = 0.060;

  if (doseMode === 'PRESET') {
    const dosePreset = calculateInhaledDosePreset(pm25, pm10, no2, so2, activityPreset, durationMinutes, hasN95Mask);
    minuteVentilationLMin = dosePreset.minuteVentilationLMin;
    minuteVentilationM3Min = dosePreset.minuteVentilationM3Min;
  } else {
    const bio = calculateBiometricVentilationRate(heartRate, ageYears, sex, fvcLiters, breathsPerMin);
    minuteVentilationLMin = bio.veLMin;
    minuteVentilationM3Min = bio.veM3Min;
  }

  const maskFactor = hasN95Mask ? 0.10 : 1.0;
  const pm25InhaledDoseUg = pm25 * minuteVentilationM3Min * durationMinutes * maskFactor;
  const pm10InhaledDoseUg = pm10 * minuteVentilationM3Min * durationMinutes * maskFactor;

  // MPPD Regional Deposition
  const mppd = calculateMppdDeposition(pm25InhaledDoseUg, pm10InhaledDoseUg);

  // 24h Safe Outdoor Activity Window
  const safeWindow = findSafeOutdoorActivityWindow(forecastPoints, 2);
  const safeStart = safeWindow
    ? new Date(safeWindow.bestWindowStartISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '15:00';
  const safeEnd = safeWindow
    ? new Date(safeWindow.bestWindowEndISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '17:00';

  const sev = getSeverityInfo(currentData.indices.cpcb.aqi, activeStandard, colorblindMode);
  const activePrec = SENSITIVE_GROUP_PRECAUTIONS[sev.category] || SENSITIVE_GROUP_PRECAUTIONS['Poor'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Clinical Health Dosimetry & Sensitive-Group Advisory (Mandatory Feature E)
            </h2>
            <p className="text-xs text-slate-400">
              Epidemiological exposure modeling, MPPD regional lung deposition, and personalized precautions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono">
            Current: {currentData.location.name} ({currentData.indices.cpcb.aqi} AQI)
          </span>
        </div>
      </div>

      {/* Row 1: Berkeley Earth Cigarette Calculator & Safe Outdoor Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Berkeley Earth Cigarette Equivalence (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cigarette className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Berkeley Earth PM2.5-to-Cigarette Equivalence Model
                </h3>
                <p className="text-[11px] text-slate-400">
                  Epidemiological ratio: 22 µg/m³ PM2.5 sustained 24h = 1 cigarette/day mortality burden
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-mono">
              Muller & Muller 2015
            </span>
          </div>

          {/* Results Display */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Daily Equivalence</span>
              <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">
                {cigs.cigarettesPerDay}
              </div>
              <span className="text-[10px] text-slate-400">cigs / day</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Life-Minutes Lost</span>
              <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">
                -{cigs.lifeMinutesLostPerDay}
              </div>
              <span className="text-[10px] text-slate-400">min / day (11m/cig)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Annual Inhalation</span>
              <div className="text-3xl font-extrabold font-mono text-purple-400 mt-1">
                {cigs.cigarettesPerYear}
              </div>
              <span className="text-[10px] text-slate-400">cigs / year ({cigs.lifeDaysLostPerYear} days lost)</span>
            </div>
          </div>

          {/* Interactive Sliders & Toggles */}
          <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
            {/* Outdoor Exposure Hours Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300">Daily Outdoor Exposure Duration:</span>
                <span className="font-mono font-bold text-cyan-300">{outdoorHours} Hours / Day</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={outdoorHours}
                onChange={(e) => setOutdoorHours(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0h (All Indoors)</span>
                <span>8h (Outdoor Worker)</span>
                <span>24h (Unmitigated Ambient)</span>
              </div>
            </div>

            {/* Age Group & Indoor HEPA Filter Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Age Sensitivity */}
              <div className="space-y-1">
                <span className="text-slate-400 block">Vulnerability Group:</span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['adult', 'child', 'senior'] as const).map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setAgeGroup(grp)}
                      className={`flex-1 py-1 rounded-lg text-xs capitalize transition-colors font-medium ${
                        ageGroup === grp
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {grp === 'adult' ? 'Adult (1.0x)' : grp === 'child' ? 'Child (1.5x)' : '65+ (1.3x)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indoor HEPA Toggle */}
              <div className="space-y-1">
                <span className="text-slate-400 block">Indoor Filtration Factor:</span>
                <button
                  type="button"
                  onClick={() => setHepaEnabled(!hepaEnabled)}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition-all ${
                    hepaEnabled
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-xs">
                    {hepaEnabled ? 'Active HEPA Purifier (α=0.20)' : 'Unfiltered Infiltration (α=1.0)'}
                  </span>
                  <ShieldCheck className={`w-4 h-4 ${hepaEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            * {cigs.disclaimer}
          </p>
        </div>

        {/* 24-Hour Safe Outdoor Activity Window (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-900/60 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Diurnal Safe-Window Recommender
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                J(t) Minimizer
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Best Outdoor Window Today: {safeStart} – {safeEnd} IST
            </h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed font-sans">
              Atmospheric thermal inversions trap particulate matter during early mornings and nights. Solar convection in the afternoon opens an optimal window where composite exposure penalty J(t) is minimized.
            </p>
          </div>

          {safeWindow && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-900/40">
                <span className="text-slate-400 text-[11px] block">Expected Window AQI:</span>
                <span className="text-xl font-bold font-mono text-emerald-300 mt-0.5 block">
                  ~{safeWindow.averagePm25Aqi} AQI
                </span>
                <span className="text-[10px] text-slate-400">Lowest diurnal exposure</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-900/40">
                <span className="text-slate-400 text-[11px] block">Suitability Grade:</span>
                <span className="text-xl font-bold font-mono text-cyan-300 mt-0.5 block">
                  {safeWindow.suitabilityGrade}
                </span>
                <span className="text-[10px] text-slate-400">{safeWindow.averageTemperatureC}°C Ambient</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              {safeWindow?.advisoryText || 'Plan high-ventilation workouts during the designated 2-hour window.'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Minute-Ventilation Inhaled Dose Calculator & MPPD Lung Deposition Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Minute-Ventilation Dose Calculator (6 Cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Minute-Ventilation (V̇_E) Inhaled Dose Calculator
                </h3>
                <p className="text-[11px] text-slate-400">
                  ID = C · V̇_E · t · κ_mask (PMC6615621 Dosimetry Model)
                </p>
              </div>
            </div>

            {/* Mode Switcher: Preset vs Biometric */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setDoseMode('PRESET')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  doseMode === 'PRESET' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                }`}
              >
                Activity Preset
              </button>
              <button
                type="button"
                onClick={() => setDoseMode('BIOMETRIC')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  doseMode === 'BIOMETRIC' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                }`}
              >
                Spirometry Bio
              </button>
            </div>
          </div>

          {/* Mode Controls */}
          {doseMode === 'PRESET' ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'resting', label: 'Resting (6 L/m)', ve: 6 },
                  { key: 'walking', label: 'Walk (25 L/m)', ve: 25 },
                  { key: 'cycling', label: 'Cycle (57.3 L/m)', ve: 57.3 },
                  { key: 'running', label: 'Running (60 L/m)', ve: 60 },
                ].map((act) => (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => setActivityPreset(act.key as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      activityPreset === act.key
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold">{act.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Heart Rate: {heartRate} BPM</span>
                <input
                  type="range"
                  min="60"
                  max="190"
                  value={heartRate}
                  onChange={(e) => setHeartRate(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Forced Vital Capacity (FVC): {fvcLiters} L</span>
                <input
                  type="range"
                  min="2.0"
                  max="7.0"
                  step="0.1"
                  value={fvcLiters}
                  onChange={(e) => setFvcLiters(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Breathing Rate: {breathsPerMin} /min</span>
                <input
                  type="range"
                  min="12"
                  max="45"
                  value={breathsPerMin}
                  onChange={(e) => setBreathsPerMin(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Age: {ageYears} years</span>
                <input
                  type="range"
                  min="12"
                  max="80"
                  value={ageYears}
                  onChange={(e) => setAgeYears(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Biological Sex:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`flex-1 py-1 rounded text-xs font-semibold ${sex === 'male' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`flex-1 py-1 rounded text-xs font-semibold ${sex === 'female' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Female
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mask & Duration Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Duration:</span>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-200">
                <input
                  type="number"
                  min="10"
                  max="240"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 60))}
                  className="w-14 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-center"
                />
                <span>mins</span>
              </div>
            </div>

            {/* N95 Respirator Toggle */}
            <button
              type="button"
              onClick={() => setHasN95Mask(!hasN95Mask)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                hasN95Mask
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{hasN95Mask ? 'N95 / FFP2 On (-90% Dose)' : 'Unmasked (100% Inhaled)'}</span>
            </button>
          </div>

          {/* Computed Hourly Inhalation Dose */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Pulmonary Minute Ventilation:</span>
              <span className="font-mono font-bold text-cyan-300">{minuteVentilationLMin} L/min</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Inhaled PM2.5 Mass:</span>
              <span className="font-mono font-extrabold text-rose-400 text-base">
                {pm25InhaledDoseUg.toFixed(1)} µg
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Inhaled PM10 Mass:</span>
              <span className="font-mono font-bold text-emerald-400">
                {pm10InhaledDoseUg.toFixed(1)} µg
              </span>
            </div>
          </div>
        </div>

        {/* MPPD v3.04 Regional Lung-Deposition Visualizer (6 Cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    MPPD v3.04 Regional Lung-Deposition Dosimetry
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Yeh-Shum Symmetric Human Lung Airway Model
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-mono">
                Alveolar Penetration
              </span>
            </div>

            {/* Anatomical Comparison Compartments */}
            <div className="space-y-3 pt-3 text-xs">
              {/* Head / Upper Airway */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Head & Extrathoracic Upper Airways (H)</span>
                  <span className="font-mono text-slate-400">PM10: 96% | PM2.5: 62%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    PM10: <strong className="text-emerald-400">{mppd.pm10.headUpperAirwaysUg} µg</strong> trapped
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    PM2.5: <strong className="text-rose-400">{mppd.pm25.headUpperAirwaysUg} µg</strong> trapped
                  </div>
                </div>
              </div>

              {/* Tracheobronchial (TB) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Tracheobronchial Mucociliary Tree (TB)</span>
                  <span className="font-mono text-slate-400">PM10: 3.5% | PM2.5: 11.4%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    PM10: <strong className="text-emerald-400">{mppd.pm10.tracheobronchialUg} µg</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    PM2.5: <strong className="text-rose-400">{mppd.pm25.tracheobronchialUg} µg</strong>
                  </div>
                </div>
              </div>

              {/* Deep Alveolar / Pulmonary (P) - THE CARDINAL DIFFERENCE */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-rose-300 font-bold">Deep Alveolar Gas-Exchange (Bloodstream Entry)</span>
                  <span className="font-mono text-rose-400 font-bold">PM10: 0.7% | PM2.5: 26.6%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                    PM10: {mppd.pm10.alveolarPulmonaryUg} µg
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 font-bold">
                    PM2.5: {mppd.pm25.alveolarPulmonaryUg} µg (Vascular Barrier Crossing)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-sans">
            {mppd.clinicalPathologySummary}
          </div>
        </div>
      </div>

      {/* Row 3: Sensitive-Group Precaution Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Sensitive-Group Precaution Matrix ({sev.category} AQI Tier)
              </h3>
              <p className="text-xs text-slate-400">
                Clinical advisories mapped across 5 vulnerability cohorts for current atmospheric severity
              </p>
            </div>
          </div>

          {/* Cohort Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { key: 'generalPublic', label: 'General Public' },
              { key: 'childrenAndPregnant', label: 'Children & Pregnant' },
              { key: 'elderly', label: 'Elderly (65+)' },
              { key: 'asthmaCopd', label: 'Asthma & COPD' },
              { key: 'cardiovascularCad', label: 'Cardiovascular CAD' },
            ].map((cohort) => (
              <button
                key={cohort.key}
                type="button"
                onClick={() => setSelectedCohort(cohort.key as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                  selectedCohort === cohort.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cohort.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advisory Card */}
        <div className="p-5 rounded-xl bg-slate-950/70 border border-indigo-900/50 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${sev.colorHex}25`,
                color: sev.colorHex,
                border: `1px solid ${sev.colorHex}60`,
              }}
            >
              {sev.category} Advisory
            </span>
            <span className="text-xs font-semibold text-slate-300">
              For {selectedCohort === 'generalPublic' ? 'the General Population' : selectedCohort === 'childrenAndPregnant' ? 'Children & Expectant Mothers' : selectedCohort === 'elderly' ? 'Seniors (Aged 65+)' : selectedCohort === 'asthmaCopd' ? 'Patients with Asthma or COPD' : 'Cardiovascular & CAD Patients'}:
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed font-sans pt-1">
            {activePrec[selectedCohort]}
          </p>
        </div>
      </div>
    </div>
  );
};
