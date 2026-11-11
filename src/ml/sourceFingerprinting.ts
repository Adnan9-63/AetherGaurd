// src/ml/sourceFingerprinting.ts
// Innovation Anchor: Multi-Pollutant Source Apportionment & Diwali Firecracker Fingerprinting
// Differentiates Diwali Pyrotechnic, Agricultural Stubble Burning, Vehicular Exhaust, and Crustal Dust

export interface SourceFingerprintOutput {
  dominantSource:
    | 'PYROTECHNIC_FIRECRACKERS'
    | 'BIOMASS_CROP_BURNING'
    | 'VEHICULAR_TRAFFIC'
    | 'CRUSTAL_DUST'
    | 'SECONDARY_BACKGROUND';
  confidencePct: number;
  probabilities: {
    pyrotechnicFirecrackers: number;
    biomassCropBurning: number;
    vehicularTraffic: number;
    crustalDust: number;
  };
  diagnosticMetrics: {
    pm25ToPm10Ratio: number;
    so2ToNo2Ratio: number;
    coToNo2Ratio: number;
    so2ZScore: number;
  };
  scientificNarrative: string;
}

/**
 * Classifies pollution source regimes using atmospheric stoichiometry and empirical Indian post-monsoon signatures.
 * Grounded in peer-reviewed field studies across Delhi, Visakhapatnam, Bhavnagar, and Chennai.
 */
export function classifyPollutionSource(
  pm25: number,
  pm10: number,
  so2: number,
  no2: number,
  coMgM3: number,
  dustUgM3 = 0,
  localHour: number = new Date().getHours(),
  rolling24hSo2Median = 12.0,
  rolling24hSo2Mad = 4.0
): SourceFingerprintOutput {
  const safePm10 = Math.max(pm10, pm25, 1.0);
  const safeNo2 = Math.max(no2, 1.0);
  const pmRatio = Math.min(1.0, pm25 / safePm10); // Fine-to-coarse ratio
  const so2No2Ratio = so2 / safeNo2; // Sulfur-to-nitrogen oxidation ratio
  const coNo2Ratio = (coMgM3 * 1000) / safeNo2; // Incomplete combustion ratio
  const so2ModZ = (0.6745 * (so2 - rolling24hSo2Median)) / Math.max(rolling24hSo2Mad, 1.0);
  const isEveningNight = localHour >= 18 || localHour <= 3;

  // Heuristic logit scores grounded in Indian source-apportionment literature
  // 1. Pyrotechnic Firecrackers: Acute nocturnal SO2 surge + high PM2.5 fraction
  // Stricter check: enforce SO2 > 20 µg/m³ AND (evening/night timing OR extreme statistical surge Z > 2.5) to eliminate daytime false positives
  const isPyroPlausible = so2 > 20 && (isEveningNight || so2ModZ > 2.5);
  const scorePyro = isPyroPlausible
    ? (pmRatio > 0.62 ? 2.5 * pmRatio : 0.5 * pmRatio) +
      (so2 > 25 ? 1.8 : 0.2) +
      (so2No2Ratio > 0.45 ? 2.2 * so2No2Ratio : 0.3) +
      (so2ModZ > 3.0 ? 2.5 : Math.max(0, 0.4 * so2ModZ)) +
      (isEveningNight ? 1.2 : -0.5)
    : -2.5;

  // 2. Agricultural Stubble Burning: High PM2.5/PM10, high CO from smoldering, but normal SO2
  const scoreBiomass =
    (pmRatio > 0.55 ? 2.8 * pmRatio : 0.4 * pmRatio) +
    (coMgM3 > 1.5 ? 1.8 : 0.4 * coMgM3) +
    (coNo2Ratio > 25 ? 1.5 : 0.3) -
    (so2No2Ratio > 0.6 ? 1.2 : 0);

  // 3. Vehicular Traffic: Elevated NO2 and CO, moderate PM ratio (0.38 - 0.58), low SO2
  const scoreTraffic =
    (no2 > 45 ? 2.2 : 0.03 * no2) +
    (coMgM3 > 1.2 ? 1.5 : 0.3 * coMgM3) +
    (pmRatio >= 0.38 && pmRatio <= 0.58 ? 1.4 : 0.2) -
    (so2 > 40 ? 1.0 : 0);

  // 4. Crustal Dust: Coarse-mode dominance (low PM2.5/PM10 ratio), high PM10 and Open-Meteo dust
  const scoreDust =
    (pmRatio < 0.38 ? 3.5 * (1 - pmRatio) : 0.2) +
    (pm10 > 150 && pm25 < 65 ? 2.5 : 0.3) +
    (dustUgM3 > 45 ? 2.0 : 0.02 * dustUgM3);

  // Numerically stable Softmax
  const scores = [scorePyro, scoreBiomass, scoreTraffic, scoreDust];
  const maxScore = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxScore));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => Math.round((e / sumExp) * 1000) / 10);

  const labels: SourceFingerprintOutput['dominantSource'][] = [
    'PYROTECHNIC_FIRECRACKERS',
    'BIOMASS_CROP_BURNING',
    'VEHICULAR_TRAFFIC',
    'CRUSTAL_DUST',
  ];

  const maxIdx = probs.indexOf(Math.max(...probs));
  const dominantSource = labels[maxIdx];

  const narratives: Record<SourceFingerprintOutput['dominantSource'], string> = {
    PYROTECHNIC_FIRECRACKERS: `High fine-particle fraction (PM2.5/PM10 = ${pmRatio.toFixed(2)}) paired with an acute SO2 surge (${so2.toFixed(1)} µg/m³, Modified Z = ${so2ModZ.toFixed(1)}) matches potassium-nitrate (KNO3) and sulfur pyrotechnic (firecracker) combustion.`,
    BIOMASS_CROP_BURNING: `Elevated fine-mode aerosol ratio (PM2.5/PM10 = ${pmRatio.toFixed(2)}) alongside high CO (${coMgM3.toFixed(2)} mg/m³) without a proportional SO2 spike indicates regional biomass or agricultural crop-residue burning.`,
    VEHICULAR_TRAFFIC: `High NO2 (${no2.toFixed(1)} µg/m³) and CO (${coMgM3.toFixed(2)} mg/m³) with moderate PM2.5/PM10 ratio (${pmRatio.toFixed(2)}) points to primary vehicular exhaust and urban traffic congestion.`,
    CRUSTAL_DUST: `Coarse-mode dominance (PM2.5/PM10 = ${pmRatio.toFixed(2)}, PM10 = ${pm10.toFixed(0)} µg/m³) with low gaseous combustion tracers indicates resuspended road, soil, or construction dust.`,
    SECONDARY_BACKGROUND: `Balanced background aerosol profile across fine and coarse modes.`,
  };

  return {
    dominantSource,
    confidencePct: probs[maxIdx],
    probabilities: {
      pyrotechnicFirecrackers: probs[0],
      biomassCropBurning: probs[1],
      vehicularTraffic: probs[2],
      crustalDust: probs[3],
    },
    diagnosticMetrics: {
      pm25ToPm10Ratio: Number(pmRatio.toFixed(3)),
      so2ToNo2Ratio: Number(so2No2Ratio.toFixed(3)),
      coToNo2Ratio: Number(coNo2Ratio.toFixed(1)),
      so2ZScore: Number(so2ModZ.toFixed(2)),
    },
    scientificNarrative: narratives[dominantSource],
  };
}
