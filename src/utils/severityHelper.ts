// src/utils/severityHelper.ts
// Standardized Severity Colors, Geometric Icons, and Colorblind-Safe (Okabe-Ito) Mapping

export interface SeverityTierInfo {
  tierIndex: number; // 1 to 6
  cpcbCategory: string;
  usEpaCategory: string;
  cpcbColor: string;
  usEpaColor: string;
  okabeItoColor: string;
  geometricIcon: string;
  geometricName: string;
  washRgba: string;
  humanVerdict: string;
  breathingPeriodSeconds: number;
}

export const SEVERITY_TIERS: SeverityTierInfo[] = [
  {
    tierIndex: 1,
    cpcbCategory: 'Good',
    usEpaCategory: 'Good',
    cpcbColor: '#10B981', // Alpine Spruce
    usEpaColor: '#10B981',
    okabeItoColor: '#009E73', // Bluish Green
    geometricIcon: '●',
    geometricName: 'Solid Circle',
    washRgba: 'rgba(16, 185, 129, 0.12)',
    humanVerdict: 'PRISTINE AIR • SAFE OUTDOORS',
    breathingPeriodSeconds: 5.0,
  },
  {
    tierIndex: 2,
    cpcbCategory: 'Satisfactory',
    usEpaCategory: 'Moderate',
    cpcbColor: '#EAB308', // Solar Flax
    usEpaColor: '#EAB308',
    okabeItoColor: '#56B4E9', // Sky Blue
    geometricIcon: '▲',
    geometricName: 'Upward Triangle',
    washRgba: 'rgba(234, 179, 8, 0.12)',
    humanVerdict: 'ACCEPTABLE AIR • MINOR HAZE',
    breathingPeriodSeconds: 4.2,
  },
  {
    tierIndex: 3,
    cpcbCategory: 'Moderately Polluted',
    usEpaCategory: 'Unhealthy for Sensitive Groups',
    cpcbColor: '#F97316', // Amber Ochre
    usEpaColor: '#F97316',
    okabeItoColor: '#F0E442', // Bright Yellow
    geometricIcon: '◆',
    geometricName: 'Diamond',
    washRgba: 'rgba(249, 115, 22, 0.13)',
    humanVerdict: 'MODERATE SMOG • MASK RECOMMENDED',
    breathingPeriodSeconds: 3.4,
  },
  {
    tierIndex: 4,
    cpcbCategory: 'Poor',
    usEpaCategory: 'Unhealthy',
    cpcbColor: '#EF4444', // Smog Vermilion
    usEpaColor: '#EF4444',
    okabeItoColor: '#E69F00', // Deep Orange
    geometricIcon: '■',
    geometricName: 'Solid Square',
    washRgba: 'rgba(239, 68, 68, 0.14)',
    humanVerdict: 'UNHEALTHY AIR • RESTRICT RUNNING',
    breathingPeriodSeconds: 2.7,
  },
  {
    tierIndex: 5,
    cpcbCategory: 'Very Poor',
    usEpaCategory: 'Very Unhealthy',
    cpcbColor: '#E11D48', // Pyrotechnic Crimson
    usEpaColor: '#E11D48',
    okabeItoColor: '#D55E00', // Vermilion
    geometricIcon: '⬟',
    geometricName: 'Pentagon',
    washRgba: 'rgba(225, 29, 72, 0.16)',
    humanVerdict: 'VERY POOR • TRAPPED URBAN SMOG',
    breathingPeriodSeconds: 2.2,
  },
  {
    tierIndex: 6,
    cpcbCategory: 'Severe',
    usEpaCategory: 'Hazardous',
    cpcbColor: '#9F1239', // Volcanic Burgundy
    usEpaColor: '#9F1239',
    okabeItoColor: '#CC79A7', // Reddish Purple
    geometricIcon: '⯃',
    geometricName: 'Octagon',
    washRgba: 'rgba(159, 18, 57, 0.20)',
    humanVerdict: 'HAZARDOUS SMOG • SEAL WINDOWS',
    breathingPeriodSeconds: 1.8,
  },
];

export function getSeverityInfo(
  aqi: number,
  standard: 'CPCB' | 'US_EPA' = 'CPCB',
  colorblindMode = false
): {
  category: string;
  colorHex: string;
  icon: string;
  tierIndex: number;
  bgGlow: string;
  washRgba: string;
  humanVerdict: string;
  breathingPeriodSeconds: number;
} {
  let tier: SeverityTierInfo;

  if (standard === 'CPCB') {
    if (aqi <= 50) tier = SEVERITY_TIERS[0];
    else if (aqi <= 100) tier = SEVERITY_TIERS[1];
    else if (aqi <= 200) tier = SEVERITY_TIERS[2];
    else if (aqi <= 300) tier = SEVERITY_TIERS[3];
    else if (aqi <= 400) tier = SEVERITY_TIERS[4];
    else tier = SEVERITY_TIERS[5];
  } else {
    if (aqi <= 50) tier = SEVERITY_TIERS[0];
    else if (aqi <= 100) tier = SEVERITY_TIERS[1];
    else if (aqi <= 150) tier = SEVERITY_TIERS[2];
    else if (aqi <= 200) tier = SEVERITY_TIERS[3];
    else if (aqi <= 300) tier = SEVERITY_TIERS[4];
    else tier = SEVERITY_TIERS[5];
  }

  const category = standard === 'CPCB' ? tier.cpcbCategory : tier.usEpaCategory;
  const colorHex = colorblindMode
    ? tier.okabeItoColor
    : standard === 'CPCB'
    ? tier.cpcbColor
    : tier.usEpaColor;

  return {
    category,
    colorHex,
    icon: tier.geometricIcon,
    tierIndex: tier.tierIndex,
    bgGlow: `${colorHex}33`, // 20% alpha glow
    washRgba: tier.washRgba,
    humanVerdict: tier.humanVerdict,
    breathingPeriodSeconds: tier.breathingPeriodSeconds,
  };
}

/**
 * Calculates initial compass bearing (0-360 deg) from point 1 to point 2
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { degrees: number; compass8: string } {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const thetaRad = Math.atan2(y, x);
  const deg = (Math.round((thetaRad * 180) / Math.PI) + 360) % 360;

  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const compass8 = points[Math.round(deg / 45) % 8];

  return { degrees: deg, compass8 };
}
