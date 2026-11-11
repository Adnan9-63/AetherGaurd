// src/ml/anomalyDetector.ts
// Bonus #11: Unsupervised Real-Time Anomaly Detection Engine
// Combines Iglewicz & Hoaglin Rolling Modified Z-Score (MAD) with Multivariate Isolation Forest

import type { HourlyTelemetryPoint, NormalizedPollutants } from '../types/telemetry.ts';

const EULER_MASCHERONI = 0.5772156649;

/**
 * Average path length of an unsuccessful search in a Binary Search Tree (BST)
 * c(n) = 2 * (ln(n - 1) + EulerMascheroni) - 2*(n - 1)/n
 */
export function bstExpectedPathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const harmonic = Math.log(n - 1) + EULER_MASCHERONI;
  return 2 * harmonic - (2 * (n - 1)) / n;
}

/**
 * Stage 1: Iglewicz & Hoaglin Rolling Modified Z-Score (Median Absolute Deviation - MAD)
 * Outlier-resistant univariate spike detector for PM2.5 or other key series.
 */
export function computeModifiedZScore(
  series: number[],
  currentVal: number
): {
  modZ: number;
  median: number;
  mad: number;
  isAnomaly: boolean;
} {
  if (series.length < 4) {
    return { modZ: 0, median: currentVal, mad: 1, isAnomaly: false };
  }

  const sorted = [...series].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const absDevs = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  let mad = absDevs.length % 2 !== 0 ? absDevs[mid] : (absDevs[mid - 1] + absDevs[mid]) / 2;

  // Guard against MAD = 0 when >50% of rolling values are identical (NIST recommendation)
  if (mad < 1e-5) {
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    mad = Math.max((q3 - q1) * 0.7413, 1.0);
  }

  const modZ = (0.6745 * (currentVal - median)) / mad;

  return {
    modZ: Number(modZ.toFixed(2)),
    median: Number(median.toFixed(2)),
    mad: Number(mad.toFixed(2)),
    isAnomaly: Math.abs(modZ) > 3.5,
  };
}

interface ITreeNode {
  splitFeature?: number;
  splitValue?: number;
  left?: ITreeNode;
  right?: ITreeNode;
  size: number;
}

function buildITree(data: number[][], depth: number, maxDepth: number): ITreeNode {
  const n = data.length;
  if (depth >= maxDepth || n <= 1) return { size: n };

  const numFeatures = data[0].length;
  const f = Math.floor(Math.random() * numFeatures);

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const row of data) {
    if (row[f] < minVal) minVal = row[f];
    if (row[f] > maxVal) maxVal = row[f];
  }

  if (maxVal - minVal < 1e-6) return { size: n };

  const splitValue = minVal + Math.random() * (maxVal - minVal);
  const leftData = data.filter((r) => r[f] < splitValue);
  const rightData = data.filter((r) => r[f] >= splitValue);

  return {
    splitFeature: f,
    splitValue,
    size: n,
    left: buildITree(leftData, depth + 1, maxDepth),
    right: buildITree(rightData, depth + 1, maxDepth),
  };
}

function pathLength(x: number[], node: ITreeNode, currentDepth: number): number {
  if (!node.left || !node.right || node.splitFeature === undefined || node.splitValue === undefined) {
    return currentDepth + bstExpectedPathLength(node.size);
  }

  if (x[node.splitFeature] < node.splitValue) {
    return pathLength(x, node.left, currentDepth + 1);
  }
  return pathLength(x, node.right, currentDepth + 1);
}

/**
 * Stage 2: Multivariate Isolation Forest Detector across 6-pollutant vectors
 * s(v, n) = 2^(-E(h(v)) / c(n))
 */
export function scoreIsolationForest(
  windowVectors: number[][],
  currentVector: number[],
  numTrees = 75
): number {
  const n = windowVectors.length;
  if (n < 12) return 0.5;

  const maxDepth = Math.ceil(Math.log2(n));
  let totalPath = 0;

  for (let t = 0; t < numTrees; t++) {
    const tree = buildITree(windowVectors, 0, maxDepth);
    totalPath += pathLength(currentVector, tree, 0);
  }

  const avgPath = totalPath / numTrees;
  const cn = bstExpectedPathLength(n);
  return Number(Math.pow(2, -avgPath / Math.max(cn, 1e-4)).toFixed(3));
}

/**
 * Unified Real-Time Anomaly Evaluator
 * Runs rolling 24h univariate PM2.5 MAD and 168h 6-pollutant Isolation Forest
 */
export function detectRealTimeAnomalies(
  historicalPoints: HourlyTelemetryPoint[],
  currentPollutants: NormalizedPollutants
): {
  isAnomaly: boolean;
  univariateModZ: number;
  multivariateScore: number;
  anomalyType?: 'UNIVARIATE_SPIKE' | 'MULTIVARIATE_ANOMALY' | 'COMBINED_EXTREME_EVENT';
  summary: string;
} {
  // Extract rolling 24-hour PM2.5 series
  const last24hPoints = historicalPoints.slice(-24);
  const pm25Series = last24hPoints
    .map((p) => p.pollutants.pm2_5)
    .filter((v): v is number => v !== null && !isNaN(v));

  const curPm25 = currentPollutants.pm2_5 ?? 0;
  const { modZ, isAnomaly: isModZAnomaly } = computeModifiedZScore(pm25Series, curPm25);

  // Extract 168h 6-pollutant vectors: [pm2_5, pm10, no2, so2, co, o3]
  const windowVectors: number[][] = historicalPoints.map((p) => [
    p.pollutants.pm2_5 ?? 25,
    p.pollutants.pm10 ?? 45,
    p.pollutants.no2 ?? 20,
    p.pollutants.so2 ?? 15,
    (p.pollutants.co ?? 1.0) * 1000,
    p.pollutants.o3 ?? 30,
  ]);

  const currentVector: number[] = [
    curPm25,
    currentPollutants.pm10 ?? 45,
    currentPollutants.no2 ?? 20,
    currentPollutants.so2 ?? 15,
    (currentPollutants.co ?? 1.0) * 1000,
    currentPollutants.o3 ?? 30,
  ];

  const isolationScore = scoreIsolationForest(windowVectors, currentVector, 75);
  const isForestAnomaly = isolationScore >= 0.65;

  let isAnomaly = false;
  let anomalyType: 'UNIVARIATE_SPIKE' | 'MULTIVARIATE_ANOMALY' | 'COMBINED_EXTREME_EVENT' | undefined;
  let summary = 'Measurements within normal expected diurnal bounds.';

  if (isModZAnomaly && isForestAnomaly) {
    isAnomaly = true;
    anomalyType = 'COMBINED_EXTREME_EVENT';
    summary = `Critical multi-pollutant event: Rolling MAD Z-Score (${modZ}) and Isolation Forest score (${isolationScore}) both exceed regulatory anomaly thresholds.`;
  } else if (isModZAnomaly) {
    isAnomaly = true;
    anomalyType = 'UNIVARIATE_SPIKE';
    summary = `Acute PM2.5 surge detected: Rolling Modified Z-Score is ${modZ} (|M| > 3.5), indicating a statistical outlier relative to the 24-hour baseline.`;
  } else if (isForestAnomaly) {
    isAnomaly = true;
    anomalyType = 'MULTIVARIATE_ANOMALY';
    summary = `Unusual multi-gas stoichiometric combination detected: Isolation Forest score is ${isolationScore} (>= 0.65).`;
  }

  return {
    isAnomaly,
    univariateModZ: modZ,
    multivariateScore: isolationScore,
    anomalyType,
    summary,
  };
}
