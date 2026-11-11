// src/utils/aqiCalculator.ts
// Precision Piecewise Linear Interpolation for Indian CPCB NAQI & US-EPA (May 2024 revision)
// Includes WHO 2021 Global Air Quality Guideline Multipliers & Sub-Index Inversion

import type {
  CpcbAqiCategory,
  DualStandardAQIResult,
  NormalizedPollutants,
  UsEpaAqiCategory,
} from '../types/telemetry';

export interface BreakpointBand {
  bpLo: number;
  bpHi: number;
  iLo: number;
  iHi: number;
}

// ---------------------------------------------------------------------------
// Official Indian CPCB NAQI Breakpoint Bands
// Reference: Central Pollution Control Board (CPCB), Ministry of Environment, Forest & Climate Change
// ---------------------------------------------------------------------------
export const CPCB_BREAKPOINTS: Record<string, BreakpointBand[]> = {
  pm2_5: [
    { bpLo: 0, bpHi: 30, iLo: 0, iHi: 50 },
    { bpLo: 31, bpHi: 60, iLo: 51, iHi: 100 },
    { bpLo: 61, bpHi: 90, iLo: 101, iHi: 200 },
    { bpLo: 91, bpHi: 120, iLo: 201, iHi: 300 },
    { bpLo: 121, bpHi: 250, iLo: 301, iHi: 400 },
    { bpLo: 251, bpHi: 500, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { bpLo: 0, bpHi: 50, iLo: 0, iHi: 50 },
    { bpLo: 51, bpHi: 100, iLo: 51, iHi: 100 },
    { bpLo: 101, bpHi: 250, iLo: 101, iHi: 200 },
    { bpLo: 251, bpHi: 350, iLo: 201, iHi: 300 },
    { bpLo: 351, bpHi: 430, iLo: 301, iHi: 400 },
    { bpLo: 431, bpHi: 600, iLo: 401, iHi: 500 },
  ],
  no2: [
    { bpLo: 0, bpHi: 40, iLo: 0, iHi: 50 },
    { bpLo: 41, bpHi: 80, iLo: 51, iHi: 100 },
    { bpLo: 81, bpHi: 180, iLo: 101, iHi: 200 },
    { bpLo: 181, bpHi: 280, iLo: 201, iHi: 300 },
    { bpLo: 281, bpHi: 400, iLo: 301, iHi: 400 },
    { bpLo: 401, bpHi: 550, iLo: 401, iHi: 500 },
  ],
  so2: [
    { bpLo: 0, bpHi: 40, iLo: 0, iHi: 50 },
    { bpLo: 41, bpHi: 80, iLo: 51, iHi: 100 },
    { bpLo: 81, bpHi: 380, iLo: 101, iHi: 200 },
    { bpLo: 381, bpHi: 800, iLo: 201, iHi: 300 },
    { bpLo: 801, bpHi: 1600, iLo: 301, iHi: 400 },
    { bpLo: 1601, bpHi: 2100, iLo: 401, iHi: 500 },
  ],
  // CO in mg/m³
  co: [
    { bpLo: 0, bpHi: 1.0, iLo: 0, iHi: 50 },
    { bpLo: 1.1, bpHi: 2.0, iLo: 51, iHi: 100 },
    { bpLo: 2.1, bpHi: 10.0, iLo: 101, iHi: 200 },
    { bpLo: 10.1, bpHi: 17.0, iLo: 201, iHi: 300 },
    { bpLo: 17.1, bpHi: 34.0, iLo: 301, iHi: 400 },
    { bpLo: 34.1, bpHi: 50.0, iLo: 401, iHi: 500 },
  ],
  o3: [
    { bpLo: 0, bpHi: 50, iLo: 0, iHi: 50 },
    { bpLo: 51, bpHi: 100, iLo: 51, iHi: 100 },
    { bpLo: 101, bpHi: 168, iLo: 101, iHi: 200 },
    { bpLo: 169, bpHi: 208, iLo: 201, iHi: 300 },
    { bpLo: 209, bpHi: 748, iLo: 301, iHi: 400 },
    { bpLo: 749, bpHi: 1000, iLo: 401, iHi: 500 },
  ],
};

// ---------------------------------------------------------------------------
// Official US-EPA Breakpoint Bands (Including May 2024 PM2.5 Annual/Daily Revision)
// Reference: US-EPA PM NAAQS AQI Fact Sheet (May 2024) & Technical Assistance Document
// ---------------------------------------------------------------------------
export const US_EPA_BREAKPOINTS: Record<string, BreakpointBand[]> = {
  // PM2.5 updated to May 2024 revised standard (0-9.0 µg/m³ = Good)
  pm2_5: [
    { bpLo: 0.0, bpHi: 9.0, iLo: 0, iHi: 50 },
    { bpLo: 9.1, bpHi: 35.4, iLo: 51, iHi: 100 },
    { bpLo: 35.5, bpHi: 55.4, iLo: 101, iHi: 150 },
    { bpLo: 55.5, bpHi: 125.4, iLo: 151, iHi: 200 },
    { bpLo: 125.5, bpHi: 225.4, iLo: 201, iHi: 300 },
    { bpLo: 225.5, bpHi: 325.4, iLo: 301, iHi: 500 },
  ],
  pm10: [
    { bpLo: 0, bpHi: 54, iLo: 0, iHi: 50 },
    { bpLo: 55, bpHi: 154, iLo: 51, iHi: 100 },
    { bpLo: 155, bpHi: 254, iLo: 101, iHi: 150 },
    { bpLo: 255, bpHi: 354, iLo: 151, iHi: 200 },
    { bpLo: 355, bpHi: 424, iLo: 201, iHi: 300 },
    { bpLo: 425, bpHi: 604, iLo: 301, iHi: 500 },
  ],
  // NO2 1-hour in µg/m³ (converted from ppb @ 25°C 1 atm, MW=46.01)
  no2: [
    { bpLo: 0, bpHi: 100, iLo: 0, iHi: 50 },
    { bpLo: 101, bpHi: 188, iLo: 51, iHi: 100 },
    { bpLo: 189, bpHi: 677, iLo: 101, iHi: 150 },
    { bpLo: 678, bpHi: 1221, iLo: 151, iHi: 200 },
    { bpLo: 1222, bpHi: 2349, iLo: 201, iHi: 300 },
    { bpLo: 2350, bpHi: 3853, iLo: 301, iHi: 500 },
  ],
  // SO2 1-hour in µg/m³ (converted from ppb @ 25°C 1 atm, MW=64.07)
  so2: [
    { bpLo: 0, bpHi: 92, iLo: 0, iHi: 50 },
    { bpLo: 93, bpHi: 196, iLo: 51, iHi: 100 },
    { bpLo: 197, bpHi: 485, iLo: 101, iHi: 150 },
    { bpLo: 486, bpHi: 796, iLo: 151, iHi: 200 },
    { bpLo: 797, bpHi: 1582, iLo: 201, iHi: 300 },
    { bpLo: 1583, bpHi: 2630, iLo: 301, iHi: 500 },
  ],
  // CO 8-hour in mg/m³ (converted from ppm @ 25°C 1 atm, MW=28.01)
  co: [
    { bpLo: 0.0, bpHi: 5.0, iLo: 0, iHi: 50 },
    { bpLo: 5.1, bpHi: 10.8, iLo: 51, iHi: 100 },
    { bpLo: 10.9, bpHi: 14.2, iLo: 101, iHi: 150 },
    { bpLo: 14.3, bpHi: 17.6, iLo: 151, iHi: 200 },
    { bpLo: 17.7, bpHi: 34.8, iLo: 201, iHi: 300 },
    { bpLo: 34.9, bpHi: 57.7, iLo: 301, iHi: 500 },
  ],
  // O3 8-hour / 1-hour in µg/m³ (converted from ppm @ 25°C 1 atm, MW=48.00)
  o3: [
    { bpLo: 0, bpHi: 106, iLo: 0, iHi: 50 },
    { bpLo: 107, bpHi: 137, iLo: 51, iHi: 100 },
    { bpLo: 138, bpHi: 167, iLo: 101, iHi: 150 },
    { bpLo: 168, bpHi: 206, iLo: 151, iHi: 200 },
    { bpLo: 207, bpHi: 393, iLo: 201, iHi: 300 },
    { bpLo: 394, bpHi: 989, iLo: 301, iHi: 500 },
  ],
};

// ---------------------------------------------------------------------------
// WHO 2021 Global Air Quality Guidelines (24-Hour / Daily Maximum Reference Limits)
// ---------------------------------------------------------------------------
export const WHO_2021_GUIDELINES = {
  pm2_5: 15.0,      // µg/m³ (24-hour mean)
  pm10: 45.0,       // µg/m³ (24-hour mean)
  no2: 25.0,        // µg/m³ (24-hour mean)
  so2: 40.0,        // µg/m³ (24-hour mean)
  co: 4.0,          // mg/m³ (24-hour mean; = 4000 µg/m³)
  o3: 100.0,        // µg/m³ (8-hour daily maximum)
};

/**
 * Piecewise linear interpolation formula:
 * I = Math.round(((iHi - iLo) / (bpHi - bpLo)) * (cp - bpLo) + iLo)
 */
export function interpolateSubIndex(
  cp: number,
  bands: BreakpointBand[]
): number {
  if (cp <= 0 || Number.isNaN(cp)) return 0;

  for (const band of bands) {
    if (cp >= band.bpLo && cp <= band.bpHi) {
      return Math.round(
        ((band.iHi - band.iLo) / (band.bpHi - band.bpLo)) * (cp - band.bpLo) + band.iLo
      );
    }
  }

  // If concentration is between breakpoints with small decimal gaps (e.g. 30.4 between 30 and 31)
  for (let i = 0; i < bands.length - 1; i++) {
    const cur = bands[i];
    const next = bands[i + 1];
    if (cp > cur.bpHi && cp < next.bpLo) {
      return Math.round(
        ((next.iLo - cur.iHi) / (next.bpLo - cur.bpHi)) * (cp - cur.bpHi) + cur.iHi
      );
    }
  }

  // Beyond highest breakpoint (>500): extrapolate using the highest severity band slope
  const last = bands[bands.length - 1];
  if (cp > last.bpHi) {
    return Math.round(
      ((last.iHi - last.iLo) / (last.bpHi - last.bpLo)) * (cp - last.bpLo) + last.iLo
    );
  }

  return 0;
}

/**
 * Truncate decimal according to US-EPA standard rules before interpolation
 */
export function calcUsEpaSubIndex(
  rawValue: number,
  bands: BreakpointBand[],
  decimals = 1
): number {
  if (rawValue <= 0 || Number.isNaN(rawValue)) return 0;
  const factor = Math.pow(10, decimals);
  const cp = Math.floor(rawValue * factor) / factor;
  return interpolateSubIndex(cp, bands);
}

/**
 * Inverts a WAQI / US-EPA PM2.5 sub-index back into raw physical µg/m³
 * Essential when WAQI only returns `iaqi.pm25.v` without raw concentration!
 */
export function invertWaqiPm25ToConcentration(aqiValue: number): number {
  if (aqiValue <= 0 || Number.isNaN(aqiValue)) return 0;
  const bands = US_EPA_BREAKPOINTS.pm2_5;

  for (const band of bands) {
    if (aqiValue >= band.iLo && aqiValue <= band.iHi) {
      const slope = (band.bpHi - band.bpLo) / (band.iHi - band.iLo);
      const cp = (aqiValue - band.iLo) * slope + band.bpLo;
      return Number(cp.toFixed(1));
    }
  }

  // Beyond 500 extrapolation
  const last = bands[bands.length - 1];
  const slope = (last.bpHi - last.bpLo) / (last.iHi - last.iLo);
  const cp = (aqiValue - last.iLo) * slope + last.bpLo;
  return Number(cp.toFixed(1));
}

/**
 * Compute WHO 2021 Guideline Exceedance Multipliers
 */
export function calculateWhoMultipliers(
  pollutants: NormalizedPollutants
): Record<string, { ratio: number; rawValue: number; unit: string; guideline: number }> {
  const result: Record<string, { ratio: number; rawValue: number; unit: string; guideline: number }> = {};

  if (pollutants.pm2_5 !== null) {
    result.pm2_5 = {
      rawValue: pollutants.pm2_5,
      unit: 'µg/m³',
      guideline: WHO_2021_GUIDELINES.pm2_5,
      ratio: Number((pollutants.pm2_5 / WHO_2021_GUIDELINES.pm2_5).toFixed(2)),
    };
  }

  if (pollutants.pm10 !== null) {
    result.pm10 = {
      rawValue: pollutants.pm10,
      unit: 'µg/m³',
      guideline: WHO_2021_GUIDELINES.pm10,
      ratio: Number((pollutants.pm10 / WHO_2021_GUIDELINES.pm10).toFixed(2)),
    };
  }

  if (pollutants.no2 !== null) {
    result.no2 = {
      rawValue: pollutants.no2,
      unit: 'µg/m³',
      guideline: WHO_2021_GUIDELINES.no2,
      ratio: Number((pollutants.no2 / WHO_2021_GUIDELINES.no2).toFixed(2)),
    };
  }

  if (pollutants.so2 !== null) {
    result.so2 = {
      rawValue: pollutants.so2,
      unit: 'µg/m³',
      guideline: WHO_2021_GUIDELINES.so2,
      ratio: Number((pollutants.so2 / WHO_2021_GUIDELINES.so2).toFixed(2)),
    };
  }

  if (pollutants.co !== null) {
    result.co = {
      rawValue: pollutants.co,
      unit: 'mg/m³',
      guideline: WHO_2021_GUIDELINES.co,
      ratio: Number((pollutants.co / WHO_2021_GUIDELINES.co).toFixed(2)),
    };
  }

  if (pollutants.o3 !== null) {
    result.o3 = {
      rawValue: pollutants.o3,
      unit: 'µg/m³',
      guideline: WHO_2021_GUIDELINES.o3,
      ratio: Number((pollutants.o3 / WHO_2021_GUIDELINES.o3).toFixed(2)),
    };
  }

  return result;
}

/**
 * Get CPCB AQI Category and Official Colors
 */
export function getCpcbCategoryAndColor(aqi: number): {
  category: CpcbAqiCategory;
  colorHex: string;
  colorblindHex: string;
} {
  if (aqi <= 50) {
    return { category: 'Good', colorHex: '#00B050', colorblindHex: '#009E73' };
  } else if (aqi <= 100) {
    return { category: 'Satisfactory', colorHex: '#92D050', colorblindHex: '#56B4E9' };
  } else if (aqi <= 200) {
    return { category: 'Moderately Polluted', colorHex: '#FFFF00', colorblindHex: '#F0E442' };
  } else if (aqi <= 300) {
    return { category: 'Poor', colorHex: '#FF9900', colorblindHex: '#E69F00' };
  } else if (aqi <= 400) {
    return { category: 'Very Poor', colorHex: '#FF0000', colorblindHex: '#D55E00' };
  } else {
    return { category: 'Severe', colorHex: '#7E0023', colorblindHex: '#CC79A7' };
  }
}

/**
 * Get US-EPA AQI Category and Official Colors
 */
export function getUsEpaCategoryAndColor(aqi: number): {
  category: UsEpaAqiCategory;
  colorHex: string;
  colorblindHex: string;
} {
  if (aqi <= 50) {
    return { category: 'Good', colorHex: '#00E400', colorblindHex: '#009E73' };
  } else if (aqi <= 100) {
    return { category: 'Moderate', colorHex: '#FFFF00', colorblindHex: '#56B4E9' };
  } else if (aqi <= 150) {
    return { category: 'Unhealthy for Sensitive Groups', colorHex: '#FF7E00', colorblindHex: '#F0E442' };
  } else if (aqi <= 200) {
    return { category: 'Unhealthy', colorHex: '#FF0000', colorblindHex: '#E69F00' };
  } else if (aqi <= 300) {
    return { category: 'Very Unhealthy', colorHex: '#8F3F97', colorblindHex: '#D55E00' };
  } else {
    return { category: 'Hazardous', colorHex: '#7E0023', colorblindHex: '#CC79A7' };
  }
}

/**
 * Complete Dual Standard AQI Calculator
 * Computes both Indian CPCB NAQI and US-EPA AQI side-by-side with sub-index breakdown.
 */
export function calculateDualStandardAQI(
  pollutants: NormalizedPollutants,
  isRolling24h = false
): DualStandardAQIResult {
  const cpcbSubIndices: Record<string, number> = {};
  const usEpaSubIndices: Record<string, number> = {};

  // Defensive conversion: CO must be in mg/m³ for both CPCB and US-EPA
  const safeCo = pollutants.co !== null
    ? (pollutants.co > 50 ? Number((pollutants.co / 1000).toFixed(3)) : pollutants.co)
    : null;

  // 1. Compute CPCB sub-indices
  if (pollutants.pm2_5 !== null) {
    cpcbSubIndices.pm2_5 = interpolateSubIndex(pollutants.pm2_5, CPCB_BREAKPOINTS.pm2_5);
  }
  if (pollutants.pm10 !== null) {
    cpcbSubIndices.pm10 = interpolateSubIndex(pollutants.pm10, CPCB_BREAKPOINTS.pm10);
  }
  if (pollutants.no2 !== null) {
    cpcbSubIndices.no2 = interpolateSubIndex(pollutants.no2, CPCB_BREAKPOINTS.no2);
  }
  if (pollutants.so2 !== null) {
    cpcbSubIndices.so2 = interpolateSubIndex(pollutants.so2, CPCB_BREAKPOINTS.so2);
  }
  if (safeCo !== null) {
    cpcbSubIndices.co = interpolateSubIndex(safeCo, CPCB_BREAKPOINTS.co);
  }
  if (pollutants.o3 !== null) {
    cpcbSubIndices.o3 = interpolateSubIndex(pollutants.o3, CPCB_BREAKPOINTS.o3);
  }

  // 2. Compute US-EPA sub-indices
  if (pollutants.pm2_5 !== null) {
    usEpaSubIndices.pm2_5 = calcUsEpaSubIndex(pollutants.pm2_5, US_EPA_BREAKPOINTS.pm2_5, 1);
  }
  if (pollutants.pm10 !== null) {
    usEpaSubIndices.pm10 = calcUsEpaSubIndex(pollutants.pm10, US_EPA_BREAKPOINTS.pm10, 0);
  }
  if (pollutants.no2 !== null) {
    usEpaSubIndices.no2 = calcUsEpaSubIndex(pollutants.no2, US_EPA_BREAKPOINTS.no2, 0);
  }
  if (pollutants.so2 !== null) {
    usEpaSubIndices.so2 = calcUsEpaSubIndex(pollutants.so2, US_EPA_BREAKPOINTS.so2, 0);
  }
  if (safeCo !== null) {
    usEpaSubIndices.co = calcUsEpaSubIndex(safeCo, US_EPA_BREAKPOINTS.co, 1);
  }
  if (pollutants.o3 !== null) {
    usEpaSubIndices.o3 = calcUsEpaSubIndex(pollutants.o3, US_EPA_BREAKPOINTS.o3, 0);
  }

  // CPCB Minimum Data Rule: at least 3 pollutants present, including PM2.5 or PM10
  const cpcbKeys = Object.keys(cpcbSubIndices);
  const hasParticulate = 'pm2_5' in cpcbSubIndices || 'pm10' in cpcbSubIndices;
  const meetsMinimumDataRule = cpcbKeys.length >= 3 && hasParticulate;

  // Prominent pollutant is the one with highest sub-index
  let cpcbMaxVal = 0;
  let cpcbProminent = 'pm2_5';
  for (const [pol, val] of Object.entries(cpcbSubIndices)) {
    if (val >= cpcbMaxVal) {
      cpcbMaxVal = val;
      cpcbProminent = pol;
    }
  }

  let usEpaMaxVal = 0;
  let usEpaProminent = 'pm2_5';
  for (const [pol, val] of Object.entries(usEpaSubIndices)) {
    if (val >= usEpaMaxVal) {
      usEpaMaxVal = val;
      usEpaProminent = pol;
    }
  }

  const cpcbMeta = getCpcbCategoryAndColor(cpcbMaxVal);
  const usEpaMeta = getUsEpaCategoryAndColor(usEpaMaxVal);

  return {
    cpcb: {
      aqi: cpcbMaxVal,
      category: cpcbMeta.category,
      colorHex: cpcbMeta.colorHex,
      prominentPollutant: cpcbProminent,
      subIndices: cpcbSubIndices,
      meetsMinimumDataRule,
      isRolling24hAverage: isRolling24h,
    },
    usEpa: {
      aqi: usEpaMaxVal,
      category: usEpaMeta.category,
      colorHex: usEpaMeta.colorHex,
      prominentPollutant: usEpaProminent,
      subIndices: usEpaSubIndices,
    },
  };
}
