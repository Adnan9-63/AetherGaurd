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
}

export const SEVERITY_TIERS: SeverityTierInfo[] = [
  {
    tierIndex: 1,
    cpcbCategory: 'Good',
    usEpaCategory: 'Good',
    cpcbColor: '#00B050',
    usEpaColor: '#00E400',
    okabeItoColor: '#009E73', // Bluish Green
    geometricIcon: '●',
    geometricName: 'Solid Circle',
  },
  {
    tierIndex: 2,
    cpcbCategory: 'Satisfactory',
    usEpaCategory: 'Moderate',
    cpcbColor: '#92D050',
    usEpaColor: '#EAB308', // Amber/Yellow
    okabeItoColor: '#56B4E9', // Sky Blue
    geometricIcon: '▲',
    geometricName: 'Upward Triangle',
  },
  {
    tierIndex: 3,
    cpcbCategory: 'Moderately Polluted',
    usEpaCategory: 'Unhealthy for Sensitive Groups',
    cpcbColor: '#EAB308',
    usEpaColor: '#F97316', // Orange
    okabeItoColor: '#F0E442', // Bright Yellow
    geometricIcon: '◆',
    geometricName: 'Diamond',
  },
  {
    tierIndex: 4,
    cpcbCategory: 'Poor',
    usEpaCategory: 'Unhealthy',
    cpcbColor: '#F97316',
    usEpaColor: '#EF4444', // Red
    okabeItoColor: '#E69F00', // Deep Orange
    geometricIcon: '■',
    geometricName: 'Solid Square',
  },
  {
    tierIndex: 5,
    cpcbCategory: 'Very Poor',
    usEpaCategory: 'Very Unhealthy',
    cpcbColor: '#EF4444',
    usEpaColor: '#8B5CF6', // Purple
    okabeItoColor: '#D55E00', // Vermilion
    geometricIcon: '⬟',
    geometricName: 'Pentagon',
  },
  {
    tierIndex: 6,
    cpcbCategory: 'Severe',
    usEpaCategory: 'Hazardous',
    cpcbColor: '#7E0023',
    usEpaColor: '#7E0023', // Maroon
    okabeItoColor: '#CC79A7', // Reddish Purple
    geometricIcon: '✖',
    geometricName: 'Octagon Cross',
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
