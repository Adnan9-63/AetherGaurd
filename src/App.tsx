// src/App.tsx
// Atmospheric Command Center Orchestrator for AetherGuard (Breathe Better)
// Fuses Provenance Header, Live Dashboard, MapLibre Spatial Intelligence, Historical Tracker, Forecast & Leaderboard

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Archive,
  Compass,
  Cpu,
  Gauge,
  HeartPulse,
  Map as MapIcon,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import type { CompleteLocationDataset } from './types/telemetry.ts';
import { fetchAirQualityData } from './services/apiOrchestrator.ts';
import { getSeverityInfo } from './utils/severityHelper.ts';
import { ProvenanceHeaderBar } from './components/ProvenanceHeaderBar.tsx';
import { LiveAQIDashboard } from './components/LiveAQIDashboard.tsx';
import { InteractiveAirQualityMap } from './components/InteractiveAirQualityMap.tsx';
import { HistoricalPollutionTracker } from './components/HistoricalPollutionTracker.tsx';
import { AQIForecastAndMLLab } from './components/AQIForecastAndMLLab.tsx';
import { LocationComparisonMatrix } from './components/LocationComparisonMatrix.tsx';
import { PollutionLeaderboard } from './components/PollutionLeaderboard.tsx';
import { HealthSafetyDashboard } from './components/HealthSafetyDashboard.tsx';
import { ApiTelemetryModal } from './components/ApiTelemetryModal.tsx';
import { SmartAQIAlertsModal } from './components/SmartAQIAlertsModal.tsx';
import { SocialSharingCardModal } from './components/SocialSharingCardModal.tsx';
import { PollutionImpactReportExporter } from './components/PollutionImpactReportExporter.tsx';
import { JudgeVerificationTourModal } from './components/JudgeVerificationTourModal.tsx';
import { AICopilotAndVoiceAssistant } from './components/AICopilotAndVoiceAssistant.tsx';

export type NavigationTab =
  | 'live'
  | 'map'
  | 'history'
  | 'forecast'
  | 'health'
  | 'compare'
  | 'leaderboard';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('live');
  const [activeStandard, setActiveStandard] = useState<'CPCB' | 'US_EPA'>('CPCB');
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState<boolean>(false);
  const [isJudgeTourOpen, setIsJudgeTourOpen] = useState<boolean>(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Active Location State
  const [location, setLocation] = useState({
    name: 'New Delhi',
    lat: 28.6139,
    lon: 77.2090,
    admin1: 'Delhi',
    countryCode: 'IN',
  });

  const [dataset, setDataset] = useState<CompleteLocationDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingestion Fetch function
  const loadData = useCallback(
    async (lat: number, lon: number, name: string, admin1?: string, countryCode = 'IN', bypassCache = false) => {
      try {
        if (!dataset) setIsLoading(true);
        else setIsRefreshing(true);
        setErrorMessage(null);

        const data = await fetchAirQualityData(lat, lon, name, admin1, countryCode, bypassCache);
        setDataset(data);

        // Update Dynamic Ambient CSS glow based on AQI
        const activeAqi = activeStandard === 'CPCB' ? data.current.indices.cpcb.aqi : data.current.indices.usEpa.aqi;
        const sev = getSeverityInfo(activeAqi, activeStandard, colorblindMode);
        document.documentElement.style.setProperty('--aqi-glow-primary', sev.bgGlow);
        document.documentElement.style.setProperty('--aqi-border-accent', `${sev.colorHex}66`);
      } catch (err: any) {
        console.error('Failed to ingest telemetry:', err);
        setErrorMessage(err.message || 'Failed to communicate with atmospheric telemetry providers.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dataset, activeStandard, colorblindMode]
  );

  // Initial load
  useEffect(() => {
    loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode);
  }, []);

  // Update dynamic CSS glow whenever active standard or colorblind mode changes
  useEffect(() => {
    if (dataset) {
      const activeAqi = activeStandard === 'CPCB' ? dataset.current.indices.cpcb.aqi : dataset.current.indices.usEpa.aqi;
      const sev = getSeverityInfo(activeAqi, activeStandard, colorblindMode);
      document.documentElement.style.setProperty('--aqi-glow-primary', sev.bgGlow);
      document.documentElement.style.setProperty('--aqi-border-accent', `${sev.colorHex}66`);
    }
  }, [activeStandard, colorblindMode, dataset]);

  // Handle Location Selection
  const handleSelectLocation = (lat: number, lon: number, name: string, admin1?: string, countryCode?: string) => {
    setLocation({
      name,
      lat,
      lon,
      admin1: admin1 || '',
      countryCode: countryCode || 'IN',
    });
    loadData(lat, lon, name, admin1, countryCode);
    setActiveTab('live');
  };

  // Bonus #5: Three-Stage Geolocation Cascade
  const handleLocateMe = () => {
    setIsLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          handleSelectLocation(latitude, longitude, 'My Location');
          setIsLocating(false);
        },
        async (error) => {
          console.warn('HTML5 Geolocation failed or denied, trying WAQI IP fallback:', error.message);
          try {
            const token = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WAQI_API_TOKEN) || 'demo';
            const res = await fetch(`https://api.waqi.info/feed/here/?token=${token}`);
            const json = await res.json();
            if (json.status === 'ok' && json.data?.city?.geo) {
              const [ipLat, ipLon] = json.data.city.geo;
              const cityName = json.data.city.name || 'Local Air Basin';
              handleSelectLocation(ipLat, ipLon, cityName);
              setIsLocating(false);
              return;
            }
          } catch (e) {
            console.warn('IP fallback also failed, reverting to New Delhi baseline', e);
          }
          handleSelectLocation(28.6139, 77.2090, 'New Delhi', 'Delhi', 'IN');
          setIsLocating(false);
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
      );
    } else {
      setIsLocating(false);
      handleSelectLocation(28.6139, 77.2090, 'New Delhi', 'Delhi', 'IN');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Immutable Top Provenance Header Bar */}
      {dataset && (
        <ProvenanceHeaderBar
          currentData={dataset.current}
          activeStandard={activeStandard}
          onToggleStandard={() => setActiveStandard(activeStandard === 'CPCB' ? 'US_EPA' : 'CPCB')}
          colorblindMode={colorblindMode}
          onToggleColorblind={() => setColorblindMode(!colorblindMode)}
          onSelectLocation={handleSelectLocation}
          onLocateMe={handleLocateMe}
          onOpenApiInspector={() => setIsApiInspectorOpen(true)}
          onOpenJudgeTour={() => setIsJudgeTourOpen(true)}
          onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          isLocating={isLocating}
          isRefreshing={isRefreshing}
          onManualRefresh={() => loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode, true)}
        />
      )}

      {/* 2. Navigation Tabs Bar */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-[69px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none text-xs">
          {/* Tab 1: Live AQI Dashboard (Mandatory A) */}
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'live'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Live Command Center</span>
          </button>

          {/* Tab 2: Interactive Spatial Map (Mandatory B + Bonus #4 & #6) */}
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'map'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapIcon className="w-4 h-4 text-emerald-400" />
            <span>Spatial Map & Clean Air Finder</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">
              WebGL
            </span>
          </button>

          {/* Tab 3: Historical Pollution Tracker (Mandatory C + Bonus #11) */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-950 text-blue-300 border border-blue-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Archive className="w-4 h-4 text-blue-400" />
            <span>Historical Tracker & Anomaly Lab</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-blue-950 text-blue-400 font-mono">
              Bonus #11
            </span>
          </button>

          {/* Tab 4: AQI Forecast & ML Lab (Mandatory F + Bonus #3) */}
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'forecast'
                ? 'bg-amber-950 text-amber-300 border border-amber-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>5-Day Forecast & ML Lab</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 font-mono">
              Bonus #3
            </span>
          </button>

          {/* Tab 5: Health & Dosimetry Lab (Mandatory Feature E) */}
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'health'
                ? 'bg-rose-950 text-rose-300 border border-rose-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>Health & Dosimetry Lab</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-rose-950 text-rose-400 font-mono">
              Feature E
            </span>
          </button>

          {/* Tab 6: Multi-Location Comparison (Mandatory D) */}
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'compare'
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Multi-City Comparison</span>
          </button>

          {/* Tab 7: Pollution Leaderboard (Bonus #9) */}
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-purple-950 text-purple-300 border border-purple-700/80 shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>Pollution Leaderboard</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-purple-950 text-purple-400 font-mono">
              Bonus #9
            </span>
          </button>
        </div>
      </div>

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-400 font-mono">
              Fusing Multi-Tier Atmospheric Telemetry & CAMS Models...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="p-6 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-base">Telemetry Ingestion Disruption</h3>
            </div>
            <p className="text-sm">{errorMessage}</p>
            <button
              type="button"
              onClick={() => loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode, true)}
              className="px-4 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        ) : dataset ? (
          <>
            {/* Tab 1: Live Command Center (Feature A) */}
            {activeTab === 'live' && (
              <LiveAQIDashboard
                currentData={dataset.current}
                forecastPoints={dataset.forecast}
                activeStandard={activeStandard}
                onToggleStandard={() => setActiveStandard(activeStandard === 'CPCB' ? 'US_EPA' : 'CPCB')}
                colorblindMode={colorblindMode}
              />
            )}

            {/* Tab 2: Interactive Spatial Map (Feature B + Bonus #4 & #6) */}
            {activeTab === 'map' && (
              <InteractiveAirQualityMap
                centerLat={location.lat}
                centerLon={location.lon}
                cityName={location.name}
                currentAqi={activeStandard === 'CPCB' ? dataset.current.indices.cpcb.aqi : dataset.current.indices.usEpa.aqi}
                stations={dataset.stationsNearby}
                activeStandard={activeStandard}
                colorblindMode={colorblindMode}
                onNavigateToLocation={handleSelectLocation}
              />
            )}

            {/* Tab 3: Historical Pollution Tracker (Feature C + Bonus #11) */}
            {activeTab === 'history' && (
              <HistoricalPollutionTracker
                historicalPoints={dataset.historical}
                cityName={location.name}
                activeStandard={activeStandard}
                colorblindMode={colorblindMode}
              />
            )}

            {/* Tab 4: AQI Forecast & ML Lab (Feature F + Bonus #3) */}
            {activeTab === 'forecast' && (
              <AQIForecastAndMLLab
                currentData={dataset.current}
                historicalPoints={dataset.historical}
                forecastPoints={dataset.forecast}
                activeStandard={activeStandard}
                colorblindMode={colorblindMode}
              />
            )}

            {/* Tab 5: Health & Safety Dosimetry Lab (Mandatory Feature E) */}
            {activeTab === 'health' && (
              <HealthSafetyDashboard
                currentData={dataset.current}
                forecastPoints={dataset.forecast}
                activeStandard={activeStandard}
                colorblindMode={colorblindMode}
              />
            )}

            {/* Tab 6: Multi-Location Comparison Matrix (Feature D) */}
            {activeTab === 'compare' && (
              <LocationComparisonMatrix />
            )}

            {/* Tab 7: Pollution Leaderboard (Bonus #9) */}
            {activeTab === 'leaderboard' && (
              <PollutionLeaderboard
                onSelectCity={handleSelectLocation}
                activeStandard={activeStandard}
                colorblindMode={colorblindMode}
              />
            )}
          </>
        ) : null}
      </main>

      {/* 4. Footer & Rubric Attribution */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AetherGuard Intelligence</span>
            <span>—</span>
            <span>Official Submission for LETS CODE DIWALI CHALLENGE 2026</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Open-Meteo CAMS (CC BY 4.0)</span>
            <span>•</span>
            <span>CPCB / WAQI Physical Ground Stations</span>
            <span>•</span>
            <span>WHO 2021 Guidelines</span>
          </div>
        </div>
      </footer>

      {/* 5. Judge's 19-Feature Verification Tour Modal (6 Mandatory + 13 Bonus) */}
      <JudgeVerificationTourModal
        isOpen={isJudgeTourOpen}
        onClose={() => setIsJudgeTourOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenModal={(modal) => {
          if (modal === 'api') setIsApiInspectorOpen(true);
          else if (modal === 'alerts') setIsAlertsModalOpen(true);
          else if (modal === 'share') setIsShareModalOpen(true);
          else if (modal === 'report') setIsReportModalOpen(true);
        }}
      />

      {/* 6. Smart Threshold Alerts Modal (Bonus #2) */}
      {dataset && (
        <SmartAQIAlertsModal
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          currentData={dataset.current}
          activeStandard={activeStandard}
        />
      )}

      {/* 7. Social Sharing Card Modal (Bonus #7) */}
      {dataset && (
        <SocialSharingCardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          currentData={dataset.current}
          activeStandard={activeStandard}
          colorblindMode={colorblindMode}
        />
      )}

      {/* 8. Pollution Impact & Health Report Exporter (Bonus #8) */}
      {dataset && (
        <PollutionImpactReportExporter
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          currentData={dataset.current}
          historicalPoints={dataset.historical}
          forecastPoints={dataset.forecast}
          activeStandard={activeStandard}
          colorblindMode={colorblindMode}
        />
      )}

      {/* 9. API Telemetry & Fallback Inspector Modal (Bonus #12) */}
      {dataset && (
        <ApiTelemetryModal
          isOpen={isApiInspectorOpen}
          onClose={() => setIsApiInspectorOpen(false)}
          currentData={dataset.current}
          onTriggerRefresh={() => loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode, true)}
        />
      )}

      {/* 10. Floating AI AQI Copilot & Voice Assistant (Bonus #1, #10 & #13) */}
      {dataset && (
        <AICopilotAndVoiceAssistant
          currentData={dataset.current}
          forecastPoints={dataset.forecast}
          activeStandard={activeStandard}
        />
      )}
    </div>
  );
}

export default App;
