// src/types/telemetry.ts
// Unified Telemetry Data Contract & Provenance Models for AetherGuard

export type DataProvenanceCategory =
  | 'ACTUAL_LIVE_MEASUREMENT' // Current ground station or current model assimilation (t = 0)
  | 'HISTORICAL_ARCHIVE'      // Verified past observations or reanalysis (t < 0)
  | 'FORECAST_ML_ESTIMATE';    // Future CAMS/OWM model or local ML prediction (t > 0)

export type TelemetrySourceId =
  | 'WAQI_GROUND_STATION'
  | 'OPENAQ_V3_GROUND_STATION'
  | 'OPEN_METEO_CAMS'
  | 'OPENWEATHERMAP_POLLUTION'
  | 'LOCAL_EXPLAINABLE_ML';

export interface SourceAttribution {
  sourceId: TelemetrySourceId;
  organizationName: string; // e.g., "CPCB - India Central Pollution Control Board" or "Open-Meteo CAMS (CC BY 4.0)"
  sourceUrl: string;
  stationName?: string;
  stationUid?: string | number;
  distanceKm?: number; // Haversine distance from requested lat/lon to physical monitor
  isPhysicalMonitor: boolean;
}

export interface NormalizedPollutants {
  pm2_5: number | null; // Always normalized to µg/m³
  pm10: number | null;  // Always normalized to µg/m³
  no2: number | null;   // Always normalized to µg/m³
  so2: number | null;   // Always normalized to µg/m³
  co: number | null;    // Always normalized to mg/m³ for CPCB, with µg/m³ & ppm helpers
  o3: number | null;    // Always normalized to µg/m³
  nh3?: number | null;  // Optional µg/m³ (from OWM / OpenAQ / Open-Meteo Europe)
  dust?: number | null; // µg/m³ (from Open-Meteo)
  aod?: number | null;  // Dimensionless Aerosol Optical Depth at 550nm (from Open-Meteo)
}

export type CpcbAqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderately Polluted'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type UsEpaAqiCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface DualStandardAQIResult {
  cpcb: {
    aqi: number;
    category: CpcbAqiCategory;
    colorHex: string;
    prominentPollutant: string;
    subIndices: Record<string, number>;
    meetsMinimumDataRule: boolean; // True if >=3 pollutants including PM2.5 or PM10 are present
    isRolling24hAverage: boolean;  // True if computed over 24h window (8h for CO/O3); false if instantaneous screening
  };
  usEpa: {
    aqi: number;
    category: UsEpaAqiCategory;
    colorHex: string;
    prominentPollutant: string;
    subIndices: Record<string, number>;
  };
}

export interface MeteorologyData {
  temperatureC: number | null;
  relativeHumidityPct: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  boundaryLayerHeightM: number | null;
  surfacePressureHpa: number | null;
  ventilationCoefficientM2s: number | null; // PBLH (m) * WindSpeed (m/s)
  weatherCode?: number;
}

export interface UnifiedAirQualityEnvelope {
  location: {
    name: string;
    admin1?: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    elevationM?: number;
    timezone: string;
  };
  timestamp: {
    measurementTimeISO: string; // Exact time of measurement/forecast slot
    fetchedAtISO: string;       // Client/Server ingestion timestamp
    unixEpochSeconds: number;
    stalenessMinutes: number;
  };
  provenance: {
    dataCategory: DataProvenanceCategory;
    badgeLabel:
      | 'LIVE GROUND STATION'
      | 'LIVE ATMOSPHERIC MODEL'
      | 'HISTORICAL ARCHIVE'
      | 'FORECAST / ML ESTIMATE';
    primarySource: SourceAttribution;
    crossVerifiedSources: SourceAttribution[];
    fallbackTriggered: boolean;
    fallbackReason?: string;
    cacheStatus: 'LIVE_NETWORK' | 'STALE_WHILE_REVALIDATE' | 'OFFLINE_INDEXEDDB';
  };
  pollutants: NormalizedPollutants;
  meteorology: MeteorologyData;
  indices: DualStandardAQIResult;
}

export interface HourlyTelemetryPoint {
  timeISO: string;
  unixEpochSeconds: number;
  dataCategory: DataProvenanceCategory;
  pollutants: NormalizedPollutants;
  cpcbAqi: number;
  usEpaAqi: number;
  prominentPollutant: string;
  meteorology: MeteorologyData;
  pm25ToPm10Ratio: number | null;
  isSpikeAnomaly?: boolean;
}

export interface CompleteLocationDataset {
  current: UnifiedAirQualityEnvelope;
  historical: HourlyTelemetryPoint[]; // past 7 days (168 hours)
  forecast: HourlyTelemetryPoint[];   // future 5 days (120 hours)
  stationsNearby: StationPin[];
}

export interface StationPin {
  uid: string | number;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number;
  prominentPollutant?: string;
  distanceKm?: number;
  isHotspot?: boolean;
  source: TelemetrySourceId;
  updatedAtISO?: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country: string;
  countryCode: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
}
