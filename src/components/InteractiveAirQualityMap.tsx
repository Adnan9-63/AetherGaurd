// src/components/InteractiveAirQualityMap.tsx
// Mandatory Feature B: Interactive Air Quality Map (MapLibre GL JS + CartoDB Dark Matter)
// Bonus #4: WebGL Pollution Heatmap Layer
// Bonus #6: Clean Air Finder (Spatial Radius Scanner & Glowing Cyan Vector Recommender)

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AlertTriangle,
  Compass,
  Flame,
} from 'lucide-react';
import type { StationPin } from '../types/telemetry.ts';
import { calculateBearingDegrees, getSeverityInfo } from '../utils/severityHelper.ts';
import { StationTelemetryDrawer } from './StationTelemetryDrawer.tsx';

interface InteractiveAirQualityMapProps {
  centerLat: number;
  centerLon: number;
  cityName: string;
  currentAqi: number;
  stations: StationPin[];
  activeStandard: 'CPCB' | 'US_EPA';
  colorblindMode: boolean;
  onNavigateToLocation: (lat: number, lon: number, name: string) => void;
}

interface CleanAirRefuge {
  station: StationPin;
  distanceKm: number;
  bearingDeg: number;
  compass8: string;
  aqiDelta: number;
  reductionScore: number;
}

export const InteractiveAirQualityMap: React.FC<InteractiveAirQualityMapProps> = ({
  centerLat,
  centerLon,
  cityName,
  currentAqi,
  stations,
  activeStandard,
  colorblindMode,
  onNavigateToLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [cleanAirFinderActive, setCleanAirFinderActive] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(50);
  const [selectedStation, setSelectedStation] = useState<StationPin | null>(null);

  // Compute Automated Statistical Hotspots: mu + 1.5 * sigma
  const { hotspotThreshold, worstHotspot } = useMemo(() => {
    if (stations.length === 0) return { hotspotThreshold: 200, worstHotspot: null };

    const validAqis = stations.map((s) => s.aqi);
    const mu = validAqis.reduce((a, b) => a + b, 0) / validAqis.length;
    const variance = validAqis.reduce((acc, val) => acc + Math.pow(val - mu, 2), 0) / validAqis.length;
    const sigma = Math.sqrt(variance);
    const threshold = Math.max(200, Math.round(mu + 1.5 * sigma));

    let worst: StationPin | null = null;
    let maxVal = -1;
    for (const s of stations) {
      if (s.aqi > maxVal) {
        maxVal = s.aqi;
        worst = s;
      }
    }

    return { hotspotThreshold: threshold, worstHotspot: worst };
  }, [stations]);

  // Compute Clean Air Refuges within selected radius
  const cleanAirRefuges: CleanAirRefuge[] = useMemo(() => {
    if (!cleanAirFinderActive || stations.length === 0) return [];

    const candidates: CleanAirRefuge[] = [];

    for (const st of stations) {
      // Must be cleaner than current AQI
      if (st.aqi < currentAqi) {
        const { degrees, compass8 } = calculateBearingDegrees(centerLat, centerLon, st.latitude, st.longitude);
        const dist = st.distanceKm ?? 10;

        if (dist <= searchRadiusKm) {
          const aqiDelta = currentAqi - st.aqi;
          // S_k = (AQI_0 - AQI_k) / max(d_k, 1.5)^0.35
          const reductionScore = aqiDelta / Math.pow(Math.max(dist, 1.5), 0.35);

          candidates.push({
            station: st,
            distanceKm: dist,
            bearingDeg: degrees,
            compass8,
            aqiDelta,
            reductionScore,
          });
        }
      }
    }

    // Sort by Reduction Score descending
    candidates.sort((a, b) => b.reductionScore - a.reductionScore);
    return candidates.slice(0, 3);
  }, [cleanAirFinderActive, stations, currentAqi, centerLat, centerLon, searchRadiusKm]);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [centerLon, centerLat],
      zoom: 9.5,
      pitch: 25,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      // Add GeoJSON Source for Heatmap & Stations
      const geojsonFeatures = stations.map((st) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [st.longitude, st.latitude],
        },
        properties: {
          aqi: st.aqi,
          name: st.name,
        },
      }));

      map.addSource('stations-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: geojsonFeatures,
        },
      });

      // Add Native WebGL Heatmap Layer
      map.addLayer({
        id: 'aqi-heatmap-layer',
        type: 'heatmap',
        source: 'stations-data',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 500, 1],
          'heatmap-intensity': 1.6,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 176, 80, 0)',
            0.2, '#00b050',
            0.4, '#92d050',
            0.6, '#ffff00',
            0.8, '#ff9900',
            1.0, '#7e0023',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 11, 65],
          'heatmap-opacity': 0.70,
        },
      });

      // Add GeoJSON Source for Clean Air Directional Vectors
      map.addSource('clean-air-vectors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Glowing Cyan Vector Lines Layer
      map.addLayer({
        id: 'clean-air-vectors-layer',
        type: 'line',
        source: 'clean-air-vectors',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Center camera when coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [centerLon, centerLat],
        zoom: 9.8,
        essential: true,
        duration: 1200,
      });
    }
  }, [centerLat, centerLon]);

  // Update Heatmap Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('aqi-heatmap-layer')) {
      map.setLayoutProperty(
        'aqi-heatmap-layer',
        'visibility',
        heatmapEnabled ? 'visible' : 'none'
      );
    }
  }, [heatmapEnabled]);

  // Render & Update Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add Center Location Pin
    const centerEl = document.createElement('div');
    centerEl.className = 'flex flex-col items-center cursor-pointer group z-20';
    centerEl.innerHTML = `
      <div class="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-400 text-cyan-200 text-[10px] font-bold shadow-lg whitespace-nowrap mb-0.5">
        📍 ${cityName} (Active)
      </div>
      <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/30 animate-pulse"></div>
    `;
    const centerMarker = new maplibregl.Marker({ element: centerEl })
      .setLngLat([centerLon, centerLat])
      .addTo(map);
    markersRef.current.push(centerMarker);

    // Add Station Markers with Hotspot detection
    stations.forEach((st) => {
      const isHotspot = st.aqi >= hotspotThreshold;
      const severity = getSeverityInfo(st.aqi, activeStandard, colorblindMode);

      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-pointer group z-10 transition-transform hover:scale-110';

      const hotspotPulseClass = isHotspot ? 'pulsing-hotspot ring-4 ring-rose-500/80' : '';

      el.innerHTML = `
        <div class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-lg border whitespace-nowrap mb-0.5 text-white"
             style="background-color: ${severity.colorHex}; border-color: rgba(255,255,255,0.25);">
          ${severity.icon} ${st.aqi}
        </div>
        <div class="w-3 h-3 rounded-full ${hotspotPulseClass}"
             style="background-color: ${severity.colorHex};"></div>
      `;

      el.addEventListener('click', () => {
        setSelectedStation({ ...st, isHotspot });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([st.longitude, st.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Update GeoJSON source for heatmap
    if (map.isStyleLoaded() && map.getSource('stations-data')) {
      const source = map.getSource('stations-data') as maplibregl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: stations.map((st) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [st.longitude, st.latitude],
          },
          properties: {
            aqi: st.aqi,
            name: st.name,
          },
        })),
      });
    }
  }, [stations, hotspotThreshold, activeStandard, colorblindMode, centerLat, centerLon, cityName]);

  // Update Clean Air Vector Lines on the Map Canvas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const vectorSource = map.getSource('clean-air-vectors') as maplibregl.GeoJSONSource | undefined;
    if (!vectorSource) return;

    if (!cleanAirFinderActive || cleanAirRefuges.length === 0) {
      vectorSource.setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    const vectorFeatures = cleanAirRefuges.map((refuge) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [centerLon, centerLat],
          [refuge.station.longitude, refuge.station.latitude],
        ],
      },
      properties: {
        aqiDelta: refuge.aqiDelta,
        score: refuge.reductionScore,
      },
    }));

    vectorSource.setData({
      type: 'FeatureCollection',
      features: vectorFeatures,
    });
  }, [cleanAirRefuges, cleanAirFinderActive, centerLat, centerLon]);

  const handleJumpToWorstHotspot = () => {
    if (!worstHotspot || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [worstHotspot.longitude, worstHotspot.latitude],
      zoom: 12.5,
      duration: 1500,
    });
    setSelectedStation({ ...worstHotspot, isHotspot: true });
  };

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top HUD Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Heatmap Toggle Pill (Bonus #4) */}
        <button
          type="button"
          onClick={() => setHeatmapEnabled(!heatmapEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-lg transition-all ${
            heatmapEnabled
              ? 'bg-rose-950/80 text-rose-200 border-rose-700/80'
              : 'bg-slate-900/80 text-slate-300 border-slate-700'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>{heatmapEnabled ? 'WebGL Heatmap ON' : 'Heatmap OFF'}</span>
        </button>

        {/* Clean Air Finder Toggle (Bonus #6) */}
        <button
          type="button"
          onClick={() => setCleanAirFinderActive(!cleanAirFinderActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-lg transition-all ${
            cleanAirFinderActive
              ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500 shadow-cyan-500/20'
              : 'bg-slate-900/80 text-slate-300 border-slate-700'
          }`}
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Clean Air Finder</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/80 text-cyan-300 font-mono">
            Bonus #6
          </span>
        </button>

        {/* Jump to Worst Hotspot HUD Button */}
        {worstHotspot && worstHotspot.aqi >= hotspotThreshold && (
          <button
            type="button"
            onClick={handleJumpToWorstHotspot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-900/90 hover:bg-rose-800 text-rose-100 border border-rose-600 backdrop-blur-md shadow-lg transition-all animate-pulse"
          >
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <span>Jump to Worst Hotspot ({worstHotspot.aqi} AQI)</span>
          </button>
        )}
      </div>

      {/* Clean Air Finder Overlay Panel (Bonus #6) */}
      {cleanAirFinderActive && (
        <div className="absolute bottom-4 left-4 z-20 w-80 p-4 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 shadow-2xl text-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-white">Clean Air Finder Refuges</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono">Top 3 Vectors</span>
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 mr-1">Radius:</span>
            {[10, 25, 50, 100].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSearchRadiusKm(r)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  searchRadiusKm === r
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>

          {/* Refuges List */}
          <div className="space-y-2">
            {cleanAirRefuges.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No active monitors with lower AQI found within {searchRadiusKm} km radius.
              </p>
            ) : (
              cleanAirRefuges.map((refuge, i) => (
                <div
                  key={refuge.station.uid}
                  onClick={() => setSelectedStation(refuge.station)}
                  className="cursor-pointer p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-100 line-clamp-1">
                      #{i + 1} {refuge.station.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>{refuge.distanceKm} km {refuge.compass8}</span>
                      <span>({refuge.bearingDeg}°)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400">
                      {refuge.station.aqi} AQI
                    </span>
                    <span className="block text-[10px] text-emerald-300 font-medium">
                      -{refuge.aqiDelta} pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 px-3 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-xl text-[11px] text-slate-300 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Good</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Poor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <span>Severe</span>
        </div>
      </div>

      {/* Click-to-Inspect Station Telemetry Slide-Over Drawer */}
      <StationTelemetryDrawer
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        activeStandard={activeStandard}
        colorblindMode={colorblindMode}
        onNavigateToStation={(lat, lon, name) => {
          setSelectedStation(null);
          onNavigateToLocation(lat, lon, name);
        }}
      />
    </div>
  );
};
