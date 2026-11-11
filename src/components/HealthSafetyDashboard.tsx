// src/components/HealthSafetyDashboard.tsx
// Mandatory Feature E: Health & Safety Dosimetry Dashboard
// Clean 3-Sub-Tab Decluttered Architecture:
// Sub-tab 1: Action Plan & 24h Safe Outdoor Window
// Sub-tab 2: Biological Dosimetry & Berkeley Earth Cigarette Pack
// Sub-tab 3: Sensitive Groups Precaution & AQI Category Guide

import React, { useState } from 'react';
import {
  Cigarette,
  Clock,
  Heart,
  HeartPulse,
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
import { VentilationButlerRibbon } from './VentilationButlerRibbon.tsx';

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
  const [activeSubTab, setActiveSubTab] = useState<'action_window' | 'dosimetry_cigs' | 'advisory_matrix'>('action_window');

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

  const sev = getSeverityInfo(
    activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi,
    activeStandard,
    colorblindMode
  );

  const activePrec = SENSITIVE_GROUP_PRECAUTIONS[sev.category] || SENSITIVE_GROUP_PRECAUTIONS['Moderate'];

  return (
    <div className="space-y-6">
      {/* Header Bar: Clinical Title & Sub-Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900/90 backdrop-blur-xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Clinical Health Dosimetry & Exposure Intelligence
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-semibold">
                Mandatory Feature E
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Epidemiological exposure modeling, MPPD regional lung deposition, and personalized precautions
            </p>
          </div>
        </div>

        {/* 3-Sub-Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('action_window')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'action_window'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>24h Safe Window</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('dosimetry_cigs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'dosimetry_cigs'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Cigarette className="w-3.5 h-3.5" />
            <span>Dosimetry & Cigarettes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('advisory_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'advisory_matrix'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sensitive Groups Matrix</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          SUB-TAB 1: ACTION PLAN & 24H SAFE OUTDOOR WINDOW
          ==================================================================== */}
      {activeSubTab === 'action_window' && (
        <div className="space-y-6">
          {/* 24-Hour Safe Outdoor Activity Window */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-stone-900 to-amber-950/40 border border-amber-900/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Clock className="w-4 h-4 text-amber-400" />
                Diurnal Safe-Window Recommender (J(t) Minimizer)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-bold">
                Optimal Window
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Recommended Outdoor Cardio Window Today: <span className="text-amber-300 font-mono">{safeStart} – {safeEnd} IST</span>
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                Atmospheric thermal inversions trap particulate matter close to the ground during early mornings and nights. Afternoon solar thermal heating drives boundary layer convection, creating this optimal 2-hour window where cumulative pulmonary exposure penalty J(t) is minimized.
              </p>
            </div>

            {safeWindow && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-900/40">
                  <span className="text-stone-400 text-[11px] block">Expected Window AQI:</span>
                  <span className="text-2xl font-bold font-mono text-emerald-300 mt-0.5 block">
                    ~{safeWindow.averagePm25Aqi} AQI
                  </span>
                  <span className="text-[10px] text-stone-400">Lowest diurnal exposure today</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-900/40">
                  <span className="text-stone-400 text-[11px] block">Suitability Grade:</span>
                  <span className="text-2xl font-bold font-mono text-amber-300 mt-0.5 block">
                    {safeWindow.suitabilityGrade}
                  </span>
                  <span className="text-[10px] text-stone-400">{safeWindow.averageTemperatureC}°C Ambient Temp</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-900/40">
                  <span className="text-stone-400 text-[11px] block">Clinical Recommendation:</span>
                  <span className="text-xs font-semibold text-stone-200 mt-1 block">
                    {safeWindow.advisoryText}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 24-Hour Ventilation Butler Ribbon */}
          <VentilationButlerRibbon
            forecastPoints={forecastPoints}
            currentAqi={activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi}
          />
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 2: BIOLOGICAL DOSIMETRY & CIGARETTES
          ==================================================================== */}
      {activeSubTab === 'dosimetry_cigs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Berkeley Earth PM2.5-to-Cigarette Equivalence Model (6 Cols) */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cigarette className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Berkeley Earth PM2.5-to-Cigarette Model
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      22 µg/m³ PM2.5 sustained 24h = 1 cigarette/day mortality burden
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-mono">
                  Muller & Muller 2015
                </span>
              </div>

              {/* Results Display */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <span className="text-[11px] text-stone-400 block">Daily Equivalence</span>
                  <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">
                    {cigs.cigarettesPerDay}
                  </div>
                  <span className="text-[10px] text-stone-400">cigs / day</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <span className="text-[11px] text-stone-400 block">Life-Minutes Lost</span>
                  <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">
                    -{cigs.lifeMinutesLostPerDay}
                  </div>
                  <span className="text-[10px] text-stone-400">min / day (11m/cig)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <span className="text-[11px] text-stone-400 block">Annual Inhalation</span>
                  <div className="text-3xl font-extrabold font-mono text-orange-400 mt-1">
                    {cigs.cigarettesPerYear}
                  </div>
                  <span className="text-[10px] text-stone-400">cigs / year</span>
                </div>
              </div>

              {/* Sliders & Controls */}
              <div className="space-y-4 pt-2 border-t border-stone-800 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Daily Outdoor Exposure Duration:</span>
                    <span className="font-mono font-bold text-amber-300">{outdoorHours} Hours / Day</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={outdoorHours}
                    onChange={(e) => setOutdoorHours(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>0h (Indoors)</span>
                    <span>8h (Commute/Work)</span>
                    <span>24h (Ambient)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-stone-400 block">Vulnerability Cohort:</span>
                    <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                      {(['adult', 'child', 'senior'] as const).map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setAgeGroup(grp)}
                          className={`flex-1 py-1 rounded-lg text-xs capitalize transition-colors font-medium ${
                            ageGroup === grp
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {grp === 'adult' ? 'Adult' : grp === 'child' ? 'Child' : '65+'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-stone-400 block">Indoor Filtration:</span>
                    <button
                      type="button"
                      onClick={() => setHepaEnabled(!hepaEnabled)}
                      className={`w-full py-1.5 px-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        hepaEnabled
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      <span className="font-semibold text-xs">
                        {hepaEnabled ? 'HEPA On (α=0.20)' : 'Unfiltered (α=1.0)'}
                      </span>
                      <ShieldCheck className={`w-4 h-4 ${hepaEnabled ? 'text-emerald-400' : 'text-stone-500'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-stone-500 italic">
                * {cigs.disclaimer}
              </p>
            </div>

            {/* Minute-Ventilation Dose Calculator (6 Cols) */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Minute-Ventilation (V̇_E) Inhaled Dose
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      ID = C · V̇_E · t · κ_mask (PMC6615621 Dosimetry Model)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDoseMode('PRESET')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      doseMode === 'PRESET' ? 'bg-amber-600 text-white' : 'text-stone-400'
                    }`}
                  >
                    Activity Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoseMode('BIOMETRIC')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      doseMode === 'BIOMETRIC' ? 'bg-amber-600 text-white' : 'text-stone-400'
                    }`}
                  >
                    Spirometry Bio
                  </button>
                </div>
              </div>

              {/* Mode Controls */}
              {doseMode === 'PRESET' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { key: 'resting', label: 'Resting (6 L/m)' },
                    { key: 'walking', label: 'Walk (25 L/m)' },
                    { key: 'cycling', label: 'Cycle (57.3 L/m)' },
                    { key: 'running', label: 'Running (60 L/m)' },
                  ].map((act) => (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => setActivityPreset(act.key as any)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        activityPreset === act.key
                          ? 'bg-amber-950/80 border-amber-600 text-amber-200 font-bold'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">{act.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-stone-400">Heart Rate: {heartRate} BPM</span>
                    <input
                      type="range"
                      min="60"
                      max="190"
                      value={heartRate}
                      onChange={(e) => setHeartRate(parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-stone-400">Vital Capacity (FVC): {fvcLiters} L</span>
                    <input
                      type="range"
                      min="2.0"
                      max="7.0"
                      step="0.1"
                      value={fvcLiters}
                      onChange={(e) => setFvcLiters(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-stone-400">Breathing Rate: {breathsPerMin} /min</span>
                    <input
                      type="range"
                      min="12"
                      max="45"
                      value={breathsPerMin}
                      onChange={(e) => setBreathsPerMin(parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-stone-400">Age: {ageYears} yrs</span>
                    <input
                      type="range"
                      min="12"
                      max="80"
                      value={ageYears}
                      onChange={(e) => setAgeYears(parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <span className="text-stone-400">Biological Sex:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSex('male')}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold ${sex === 'male' ? 'bg-amber-600 text-white' : 'bg-stone-850 text-stone-400'}`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setSex('female')}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold ${sex === 'female' ? 'bg-amber-600 text-white' : 'bg-stone-850 text-stone-400'}`}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mask & Duration Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Duration:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-stone-200">
                    <input
                      type="number"
                      min="10"
                      max="240"
                      step="5"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 60))}
                      className="w-14 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-center"
                    />
                    <span>mins</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasN95Mask(!hasN95Mask)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                    hasN95Mask
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{hasN95Mask ? 'N95 / FFP2 (-90% Dose)' : 'Unmasked (100% Inhaled)'}</span>
                </button>
              </div>

              {/* Computed Hourly Inhalation Dose */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Ventilation Rate:</span>
                  <span className="font-bold text-amber-300">{minuteVentilationLMin} L/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Inhaled PM2.5 Mass:</span>
                  <span className="font-extrabold text-rose-400 text-sm">{pm25InhaledDoseUg.toFixed(1)} µg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Inhaled PM10 Mass:</span>
                  <span className="font-bold text-emerald-400">{pm10InhaledDoseUg.toFixed(1)} µg</span>
                </div>
              </div>
            </div>
          </div>

          {/* MPPD v3.04 Regional Lung-Deposition Dosimetry */}
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    MPPD v3.04 Regional Lung-Deposition Compartmentalization
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Yeh-Shum Symmetric Human Airway Morphometry Model
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-mono font-bold">
                Alveolar Penetration Risk
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Head / Upper Airway */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <span className="text-stone-300 font-bold block">1. Head & Nasopharyngeal (H)</span>
                <span className="text-[10px] text-stone-400 block">PM10: 96% trapped | PM2.5: 62% trapped</span>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  PM10: {mppd.pm10.headUpperAirwaysUg} µg
                </div>
                <div className="text-xs font-mono text-amber-300">
                  PM2.5: {mppd.pm25.headUpperAirwaysUg} µg
                </div>
              </div>

              {/* Tracheobronchial */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <span className="text-stone-300 font-bold block">2. Tracheobronchial Mucociliary (TB)</span>
                <span className="text-[10px] text-stone-400 block">PM10: 3.5% | PM2.5: 11.4% clearance</span>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  PM10: {mppd.pm10.tracheobronchialUg} µg
                </div>
                <div className="text-xs font-mono text-amber-300">
                  PM2.5: {mppd.pm25.tracheobronchialUg} µg
                </div>
              </div>

              {/* Deep Alveolar Pulmonary */}
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-1">
                <span className="text-rose-200 font-bold block">3. Deep Alveolar (Pulmonary P)</span>
                <span className="text-[10px] text-rose-300 block">Crosses alveolar-capillary blood barrier</span>
                <div className="text-sm font-mono font-bold text-rose-300 mt-1">
                  PM2.5: {mppd.pm25.alveolarPulmonaryUg} µg (26.6% deep entry)
                </div>
                <div className="text-xs font-mono text-stone-400">
                  PM10: {mppd.pm10.alveolarPulmonaryUg} µg (0.7%)
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 bg-stone-950 p-3 rounded-xl border border-stone-800">
              {mppd.clinicalPathologySummary}
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 3: SENSITIVE GROUPS MATRIX & AQI GUIDE
          ==================================================================== */}
      {activeSubTab === 'advisory_matrix' && (
        <div className="space-y-6">
          {/* Sensitive-Group Precaution Matrix */}
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Sensitive-Group Precaution Matrix ({sev.category} AQI Tier)
                  </h3>
                  <p className="text-xs text-stone-400">
                    Clinical advisories mapped across 5 vulnerability cohorts for current atmospheric severity
                  </p>
                </div>
              </div>

              {/* Cohort Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs bg-stone-950 p-1 rounded-xl border border-stone-800">
                {[
                  { key: 'generalPublic', label: 'General Public' },
                  { key: 'childrenAndPregnant', label: 'Children & Expectant' },
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
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cohort.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advisory Card */}
            <div className="p-5 rounded-xl bg-stone-950 border border-amber-900/50 space-y-2">
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
                <span className="text-xs font-semibold text-stone-300">
                  Targeted Advisory for {selectedCohort === 'generalPublic' ? 'the General Population' : selectedCohort === 'childrenAndPregnant' ? 'Children & Expectant Mothers' : selectedCohort === 'elderly' ? 'Seniors (Aged 65+)' : selectedCohort === 'asthmaCopd' ? 'Patients with Asthma or COPD' : 'Cardiovascular & CAD Patients'}:
                </span>
              </div>

              <p className="text-sm text-stone-200 leading-relaxed font-sans pt-1">
                {activePrec[selectedCohort]}
              </p>
            </div>
          </div>

          {/* Complete 6-Tier AQI Category Explainer Matrix */}
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Complete Dual Standard Severity Breakpoint Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { tier: 'Good', cpcb: '0–50', epa: '0–50', color: '#10b981', action: 'Ideal for all outdoor activities. Zero precautions required.' },
                { tier: 'Satisfactory / Moderate', cpcb: '51–100', epa: '51–100', color: '#84cc16', action: 'Minor breathing discomfort possible for sensitive individuals.' },
                { tier: 'Moderate / Sensitive', cpcb: '101–200', epa: '101–150', color: '#eab308', action: 'Breathing discomfort to people with lung disease, asthma, and heart conditions.' },
                { tier: 'Poor / Unhealthy', cpcb: '201–300', epa: '151–200', color: '#f97316', action: 'Breathing discomfort to most people on prolonged exposure.' },
                { tier: 'Very Poor', cpcb: '301–400', epa: '201–300', color: '#ef4444', action: 'Respiratory illness on prolonged exposure. Wear N95 outdoors.' },
                { tier: 'Severe / Hazardous', cpcb: '401–500', epa: '301–500', color: '#7f1d1d', action: 'Healthy people affected; serious impacts on those with existing diseases.' },
              ].map((row) => (
                <div key={row.tier} className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: row.color }}>{row.tier}</span>
                    <span className="font-mono text-[11px] text-stone-400">CPCB {row.cpcb}</span>
                  </div>
                  <p className="text-[11px] text-stone-300 font-sans leading-relaxed">
                    {row.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
