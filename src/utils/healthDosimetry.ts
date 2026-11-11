// src/utils/healthDosimetry.ts
// Module 2 & Feature E: Scientific Health Dosimetry & Clinical Exposure Modeling
// Integrates Berkeley Earth Cigarette Equivalence, Minute-Ventilation Inhalation Dose,
// MPPD v3.04 Regional Lung Deposition, 24-Hour Safe Window Recommender, and Sensitive-Group Precautions

import type { HourlyTelemetryPoint } from '../types/telemetry.ts';

// ---------------------------------------------------------------------------
// 1. Berkeley Earth PM2.5-to-Cigarette Equivalence Model
// Reference: Muller & Muller (2015), Berkeley Earth Air Pollution & Cigarette Equivalence
// Benchmark: Sustained 24h exposure to 22 µg/m³ PM2.5 carries population mortality risk of 1 cigarette/day
// ---------------------------------------------------------------------------

export interface BerkeleyEarthCigaretteResult {
  cigarettesPerDay: number;
  cigarettesPerYear: number;
  lifeMinutesLostPerDay: number; // ~11 minutes per cigarette equivalent
  lifeDaysLostPerYear: number;
  effectivePm25Exposure: number; // Infiltration-weighted 24h concentration (µg/m³)
  disclaimer: string;
}

export function calculateBerkeleyEarthCigarettes(
  pm25UgM3: number,
  hoursOutdoor = 2,
  indoorHepaFiltered = false,
  ageGroup: 'adult' | 'child' | 'senior' = 'adult'
): BerkeleyEarthCigaretteResult {
  const safePm25 = Math.max(0, pm25UgM3);
  const hoursOut = Math.min(24, Math.max(0, hoursOutdoor));
  const hoursIn = 24 - hoursOut;
  const alphaIn = indoorHepaFiltered ? 0.20 : 1.0; // Infiltration factor (0.20 with HEPA purifier, 1.0 unmitigated)

  // Age sensitivity multiplier
  const ageMultiplier = ageGroup === 'child' ? 1.5 : ageGroup === 'senior' ? 1.3 : 1.0;

  // Infiltration-weighted 24h exposure
  const effectiveExposure = (safePm25 * (hoursOut + alphaIn * hoursIn)) / 24;

  // Cigarette formula: (C_effective / 22) * ageMultiplier
  const cigsPerDay = Number(((effectiveExposure / 22) * ageMultiplier).toFixed(1));
  const cigsPerYear = Number((cigsPerDay * 365).toFixed(0));
  const lifeMinutesLost = Number((cigsPerDay * 11).toFixed(0));
  const lifeDaysLostPerYear = Number(((lifeMinutesLost * 365) / (24 * 60)).toFixed(1));

  return {
    cigarettesPerDay: cigsPerDay,
    cigarettesPerYear: cigsPerYear,
    lifeMinutesLostPerDay: lifeMinutesLost,
    lifeDaysLostPerYear,
    effectivePm25Exposure: Number(effectiveExposure.toFixed(1)),
    disclaimer:
      'The Berkeley Earth equivalence is an epidemiological risk communication metric comparing statistical mortality burden, not a literal measure of tobacco mass inhalation.',
  };
}

// ---------------------------------------------------------------------------
// 2. Minute-Ventilation (Ve) Pollutant Inhalation Dose Calculator
// Reference: PMC6615621, PMC7504492, MDPI Atmosphere 2022
// Inhaled Dose (ID_i, µg) = C_i (µg/m³) * Ve (m³/min) * duration (min) * kappa_mask
// ---------------------------------------------------------------------------

export type ActivityPreset = 'resting' | 'walking' | 'cycling' | 'running';

export const ACTIVITY_VENTILATION_RATES: Record<ActivityPreset, { label: string; veLMin: number; veM3Min: number }> = {
  resting: {
    label: 'Resting Indoors / Sedentary',
    veLMin: 6.0,
    veM3Min: 0.006, // 6.0 L/min / 1000
  },
  walking: {
    label: 'Brisk Walking (4-5 km/h)',
    veLMin: 25.0,
    veM3Min: 0.025, // 25.0 L/min / 1000
  },
  cycling: {
    label: 'Urban Commuter Cycling',
    veLMin: 57.3,
    veM3Min: 0.0573, // 57.3 L/min / 1000
  },
  running: {
    label: 'Outdoor Running / High Exertion',
    veLMin: 60.0,
    veM3Min: 0.060, // 60.0 L/min / 1000
  },
};

export interface InhalationDoseResult {
  minuteVentilationLMin: number;
  minuteVentilationM3Min: number;
  pm25DoseUg: number;
  pm10DoseUg: number;
  no2DoseUg: number;
  so2DoseUg: number;
  doseRateUgPerHour: number;
  maskProtectionPct: number;
}

export function calculateInhaledDosePreset(
  pm25UgM3: number,
  pm10UgM3: number,
  no2UgM3: number,
  so2UgM3: number,
  activity: ActivityPreset = 'running',
  durationMinutes = 60,
  hasN95Mask = false
): InhalationDoseResult {
  const maskFactor = hasN95Mask ? 0.10 : 1.0; // 90% filtration efficiency with well-fitted N95
  const ve = ACTIVITY_VENTILATION_RATES[activity];
  const t = Math.max(1, durationMinutes);

  const pm25Dose = pm25UgM3 * ve.veM3Min * t * maskFactor;
  const pm10Dose = pm10UgM3 * ve.veM3Min * t * maskFactor;
  const no2Dose = no2UgM3 * ve.veM3Min * t * maskFactor;
  const so2Dose = so2UgM3 * ve.veM3Min * t * maskFactor;

  const hourlyRate = (pm25Dose / t) * 60;

  return {
    minuteVentilationLMin: ve.veLMin,
    minuteVentilationM3Min: ve.veM3Min,
    pm25DoseUg: Number(pm25Dose.toFixed(2)),
    pm10DoseUg: Number(pm10Dose.toFixed(2)),
    no2DoseUg: Number(no2Dose.toFixed(2)),
    so2DoseUg: Number(so2Dose.toFixed(2)),
    doseRateUgPerHour: Number(hourlyRate.toFixed(2)),
    maskProtectionPct: hasN95Mask ? 90 : 0,
  };
}

/**
 * Biometric Spirometry Mode: Models D1 & D2
 * Cross-validated log-linear pooled equations from 14,550 measurements across 471 subjects (PMC6615621)
 */
export function calculateBiometricVentilationRate(
  heartRateBpm: number,
  ageYears: number,
  sex: 'male' | 'female',
  fvcLiters: number,
  breathsPerMinute?: number
): { veLMin: number; veM3Min: number } {
  const hr = Math.max(40, Math.min(220, heartRateBpm));
  const age = Math.max(5, Math.min(95, ageYears));
  const sexCode = sex === 'male' ? 1 : 2;
  const fvc = Math.max(1.0, Math.min(8.0, fvcLiters));

  let veLMin: number;

  if (breathsPerMinute && breathsPerMinute > 0) {
    // Model D2 (HR, fB, age, sex, FVC)
    const fb = Math.max(8, Math.min(60, breathsPerMinute));
    veLMin =
      Math.exp(-8.57) *
      Math.pow(hr, 1.72) *
      Math.pow(fb, 0.611) *
      Math.pow(age, 0.298) *
      Math.pow(sexCode, -0.206) *
      Math.pow(fvc, 0.614);
  } else {
    // Model D1 (HR, age, sex, FVC)
    veLMin =
      Math.exp(-9.59) *
      Math.pow(hr, 2.39) *
      Math.pow(age, 0.274) *
      Math.pow(sexCode, -0.204) *
      Math.pow(fvc, 0.520);
  }

  // Cap physiologically plausible minute ventilation between 4 L/min and 180 L/min
  const clampedVe = Math.max(4.0, Math.min(180.0, veLMin));
  return {
    veLMin: Number(clampedVe.toFixed(1)),
    veM3Min: Number((clampedVe / 1000).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// 3. MPPD v3.04 Regional Lung Deposition Dosimetry
// Multiple-Path Particle Dosimetry symmetric human model (Yeh-Shum airway geometry)
// ---------------------------------------------------------------------------

export interface MppdRegionalDeposition {
  pm10: {
    totalInhaledUg: number;
    headUpperAirwaysUg: number;    // 96.0% (Inertial impaction, nasal filtering)
    tracheobronchialUg: number;    // 3.5%
    alveolarPulmonaryUg: number;   // 0.7% (Deep lung penetration)
  };
  pm25: {
    totalInhaledUg: number;
    headUpperAirwaysUg: number;    // 62.0%
    tracheobronchialUg: number;    // 11.4%
    alveolarPulmonaryUg: number;   // 26.6% (Direct alveolar-capillary blood barrier entry)
  };
  clinicalPathologySummary: string;
}

export function calculateMppdDeposition(
  pm25DoseUg: number,
  pm10DoseUg: number
): MppdRegionalDeposition {
  const pm10Head = pm10DoseUg * 0.96;
  const pm10TB = pm10DoseUg * 0.035;
  const pm10Alv = pm10DoseUg * 0.007;

  const pm25Head = pm25DoseUg * 0.62;
  const pm25TB = pm25DoseUg * 0.114;
  const pm25Alv = pm25DoseUg * 0.266;

  return {
    pm10: {
      totalInhaledUg: Number(pm10DoseUg.toFixed(2)),
      headUpperAirwaysUg: Number(pm10Head.toFixed(2)),
      tracheobronchialUg: Number(pm10TB.toFixed(2)),
      alveolarPulmonaryUg: Number(pm10Alv.toFixed(2)),
    },
    pm25: {
      totalInhaledUg: Number(pm25DoseUg.toFixed(2)),
      headUpperAirwaysUg: Number(pm25Head.toFixed(2)),
      tracheobronchialUg: Number(pm25TB.toFixed(2)),
      alveolarPulmonaryUg: Number(pm25Alv.toFixed(2)),
    },
    clinicalPathologySummary: `While 96% of coarse PM10 is trapped in the upper airways, 26.6% of fine PM2.5 (${pm25Alv.toFixed(1)} µg) penetrates directly into the alveolar gas-exchange region, entering systemic circulation and inducing endothelial inflammation.`,
  };
}

// ---------------------------------------------------------------------------
// 4. 24-Hour Safe Outdoor Activity Window Recommender
// Minimizes composite exposure penalty J(t) across PM2.5, O3, UV, and Thermal comfort
// ---------------------------------------------------------------------------

export interface SafeWindowRecommendation {
  bestWindowStartISO: string;
  bestWindowEndISO: string;
  durationHours: number;
  averagePenaltyScore: number;
  averagePm25Aqi: number;
  averageO3Aqi: number;
  averageTemperatureC: number;
  suitabilityGrade: 'EXCELLENT' | 'FAIR' | 'POOR' | 'HAZARDOUS';
  advisoryText: string;
}

export function findSafeOutdoorActivityWindow(
  forecastPoints: HourlyTelemetryPoint[],
  windowDurationHours = 2
): SafeWindowRecommendation | null {
  const next24 = forecastPoints.slice(0, 24);
  if (next24.length < windowDurationHours) return null;

  let minPenalty = Infinity;
  let bestStartIdx = 0;

  for (let i = 0; i <= next24.length - windowDurationHours; i++) {
    let windowPenaltySum = 0;

    for (let k = 0; k < windowDurationHours; k++) {
      const slot = next24[i + k];
      const pm25Aqi = slot.cpcbAqi;
      const o3Ug = slot.pollutants.o3 ?? 30;
      const o3SubIndex = Math.min(500, (o3Ug / 100) * 50); // Normalized O3 penalty
      const uv = 2.0; // Moderate default UV
      const temp = slot.meteorology.temperatureC ?? 24;

      // J(t) = 0.65 * I_pm25 + 0.20 * I_o3 + 0.10 * max(0, UV - 6)*15 + 0.05 * |T - 22|*5
      const j_t =
        0.65 * pm25Aqi +
        0.20 * o3SubIndex +
        0.10 * Math.max(0, uv - 6) * 15 +
        0.05 * Math.abs(temp - 22) * 5;

      windowPenaltySum += j_t;
    }

    const avgJ = windowPenaltySum / windowDurationHours;
    if (avgJ < minPenalty) {
      minPenalty = avgJ;
      bestStartIdx = i;
    }
  }

  const startSlot = next24[bestStartIdx];
  const endSlot = next24[bestStartIdx + windowDurationHours - 1];

  let pm25Sum = 0;
  let o3Sum = 0;
  let tempSum = 0;

  for (let k = 0; k < windowDurationHours; k++) {
    const s = next24[bestStartIdx + k];
    pm25Sum += s.cpcbAqi;
    o3Sum += (s.pollutants.o3 ?? 30);
    tempSum += (s.meteorology.temperatureC ?? 24);
  }

  const avgPm25 = Math.round(pm25Sum / windowDurationHours);
  const avgO3 = Math.round(o3Sum / windowDurationHours);
  const avgTemp = Number((tempSum / windowDurationHours).toFixed(1));

  let suitabilityGrade: SafeWindowRecommendation['suitabilityGrade'] = 'EXCELLENT';
  let advisoryText = 'Ideal window for outdoor exercise, cycling, and natural ventilation.';

  if (avgPm25 > 250) {
    suitabilityGrade = 'HAZARDOUS';
    advisoryText = 'Extreme particulate accumulation persists even during the best diurnal window. Move all workouts indoors.';
  } else if (avgPm25 > 150) {
    suitabilityGrade = 'POOR';
    advisoryText = 'Elevated smog. Limit outdoor exertion to low-intensity walking or wear an N95 respirator.';
  } else if (avgPm25 > 80) {
    suitabilityGrade = 'FAIR';
    advisoryText = 'Acceptable conditions. Sensitive individuals should monitor for respiratory symptoms.';
  }

  return {
    bestWindowStartISO: startSlot.timeISO,
    bestWindowEndISO: endSlot.timeISO,
    durationHours: windowDurationHours,
    averagePenaltyScore: Number(minPenalty.toFixed(1)),
    averagePm25Aqi: avgPm25,
    averageO3Aqi: avgO3,
    averageTemperatureC: avgTemp,
    suitabilityGrade,
    advisoryText,
  };
}

// ---------------------------------------------------------------------------
// 5. Sensitive-Group Precaution Matrix
// Official guidance across all 6 AQI severity brackets and 5 vulnerability cohorts
// ---------------------------------------------------------------------------

export interface PrecautionCohort {
  generalPublic: string;
  childrenAndPregnant: string;
  elderly: string;
  asthmaCopd: string;
  cardiovascularCad: string;
}

export const SENSITIVE_GROUP_PRECAUTIONS: Record<string, PrecautionCohort> = {
  'Good': {
    generalPublic: 'Enjoy normal outdoor physical activities; ideal window for natural indoor ventilation.',
    childrenAndPregnant: 'Unrestricted outdoor play and school sports.',
    elderly: 'Normal outdoor walks and recreation.',
    asthmaCopd: 'Normal outdoor activity; maintain standard controller therapy.',
    cardiovascularCad: 'Normal outdoor activity.',
  },
  'Satisfactory': {
    generalPublic: 'Acceptable air quality; continue normal outdoor activities.',
    childrenAndPregnant: 'Unusually sensitive children should make outdoor exertion slightly shorter or less intense.',
    elderly: 'Normal activity; monitor for minor throat or eye irritation.',
    asthmaCopd: 'Keep rescue bronchodilator inhaler accessible during prolonged exertion.',
    cardiovascularCad: 'Unusually sensitive individuals should consider limiting prolonged exertion near busy traffic.',
  },
  'Moderately Polluted': {
    generalPublic: 'Reduce prolonged or heavy outdoor exertion; take more breaks and shift runs to lower-AQI hours.',
    childrenAndPregnant: 'Limit prolonged outdoor sports (>45 min); substitute brisk walking for high-ventilation running.',
    elderly: 'Limit prolonged outdoor walks; avoid peak morning and evening smog hours.',
    asthmaCopd: 'Avoid prolonged outdoor exertion; follow asthma action plan; wear N95 if commuting in traffic.',
    cardiovascularCad: 'Limit heavy exertion; watch for palpitations, shortness of breath, or unusual fatigue.',
  },
  'Poor': {
    generalPublic: 'Avoid prolonged outdoor exertion; move workouts indoors; wear N95/FFP2 during commutes.',
    childrenAndPregnant: 'Suspend outdoor school athletics; keep children indoors in filtered air.',
    elderly: 'Remain indoors and avoid outdoor physical exertion.',
    asthmaCopd: 'Strictly avoid outdoor exertion; keep quick-relief medicine handy; run HEPA filtration indoors.',
    cardiovascularCad: 'Avoid all outdoor physical activity; heightened risk of exercise-induced ST-segment depression.',
  },
  'Very Poor': {
    generalPublic: 'Avoid all physical activity outdoors; seal window leaks and run indoor HEPA purifiers on high.',
    childrenAndPregnant: 'Strictly indoors; mandatory fitted respirator if emergency transit is unavoidable.',
    elderly: 'Remain indoors in a clean-air room; avoid physical exertion.',
    asthmaCopd: 'Medical alert: remain in HEPA-filtered room; seek clinical care if symptoms escalate.',
    cardiovascularCad: 'Serious impact even during light physical activity; remain strictly indoors in filtered air.',
  },
  'Severe': {
    generalPublic: 'Environmental emergency: Stay indoors with air purifiers active. Hazardous for healthy individuals.',
    childrenAndPregnant: 'Extreme health alert: Zero outdoor exposure. Ensure sealed, HEPA-scrubbed indoor shelter.',
    elderly: 'Critical vulnerability: Complete indoor confinement. Monitor blood oxygenation and vitals closely.',
    asthmaCopd: 'Clinical emergency: High risk of severe bronchospasm. Keep emergency medical contacts on standby.',
    cardiovascularCad: 'Severe cardiac hazard: Avoid any exertion. Elevated risk of acute myocardial events.',
  },
};
