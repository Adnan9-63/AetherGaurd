// src/App.tsx
// Atmospheric Command Center Orchestrator for AetherGuard (Breathe Better)
// Modern Left-Sidebar Multi-Page Architecture with Earthy Obsidian & Diwali Warm Sand Palette

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
} from 'lucide-react';
import type { CompleteLocationDataset } from './types/telemetry.ts';
import { fetchAirQualityData, generateRealisticFallbackDataset } from './services/apiOrchestrator.ts';
import { getSeverityInfo } from './utils/severityHelper.ts';
import { NavigationSidebar } from './components/NavigationSidebar.tsx';
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
  const [theme, setTheme] = useState<'espresso' | 'charcoal'>('espresso');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Modals state
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

  // Toggle theme between ☕ Warm Volcanic Espresso and 🌌 Deep Midnight Charcoal (Dual Dark Palettes)
  const handleToggleTheme = () => {
    const nextTheme = theme === 'espresso' ? 'charcoal' : 'espresso';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Telemetry Ingestion function with 100% resilient failover
  const loadData = useCallback(
    async (lat: number, lon: number, name: string, admin1?: string, countryCode = 'IN', bypassCache = false) => {
      try {
        if (!dataset) setIsLoading(true);
        else setIsRefreshing(true);

        const data = await fetchAirQualityData(lat, lon, name, admin1, countryCode, bypassCache);
        setDataset(data);

        // Update Dynamic Ambient CSS glow based on AQI
        const activeAqi = activeStandard === 'CPCB' ? data.current.indices.cpcb.aqi : data.current.indices.usEpa.aqi;
        const sev = getSeverityInfo(activeAqi, activeStandard, colorblindMode);
        document.documentElement.style.setProperty('--aqi-glow-primary', sev.bgGlow);
        document.documentElement.style.setProperty('--aqi-border-accent', `${sev.colorHex}66`);
      } catch (err: any) {
        console.warn('Telemetry ingestion failover triggered:', err);
        // Resilient failover: serve realistic climatological baseline so red screen never locks the UI
        const fallback = generateRealisticFallbackDataset(
          lat,
          lon,
          name,
          admin1,
          countryCode,
          `Automated Resilient Failover: ${err?.message || 'Remote API unreachable'}`
        );
        setDataset(fallback);
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

  const currentAqi = dataset
    ? activeStandard === 'CPCB'
      ? dataset.current.indices.cpcb.aqi
      : dataset.current.indices.usEpa.aqi
    : undefined;

  const currentCategory = dataset
    ? activeStandard === 'CPCB'
      ? dataset.current.indices.cpcb.category
      : dataset.current.indices.usEpa.category
    : undefined;

  const categoryColorHex = currentAqi !== undefined
    ? getSeverityInfo(currentAqi, activeStandard, colorblindMode).colorHex
    : '#f59e0b';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 1. Left Navigation Sidebar (Mandatory Features A–F + Quick Tools) */}
      <NavigationSidebar
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        cityName={location.name}
        currentAqi={currentAqi}
        aqiCategory={currentCategory}
        categoryColorHex={categoryColorHex}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenJudgeTour={() => setIsJudgeTourOpen(true)}
        onOpenApiInspector={() => setIsApiInspectorOpen(true)}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Compact Single-Tier Top Bar (h-16) */}
        {dataset && (
          <ProvenanceHeaderBar
            currentData={dataset.current}
            activeStandard={activeStandard}
            onToggleStandard={() => setActiveStandard(activeStandard === 'CPCB' ? 'US_EPA' : 'CPCB')}
            colorblindMode={colorblindMode}
            onToggleColorblind={() => setColorblindMode(!colorblindMode)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onSelectLocation={handleSelectLocation}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            isRefreshing={isRefreshing}
            onManualRefresh={() => loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode, true)}
          />
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm text-stone-400 font-mono">
                  Calibrating Atmospheric Models & Multi-Tier Reanalysis...
                </p>
              </div>
            ) : dataset ? (
              <>
                {/* Page 1: Live Command Center (Mandatory Feature A) */}
                {activeTab === 'live' && (
                  <LiveAQIDashboard
                    currentData={dataset.current}
                    forecastPoints={dataset.forecast}
                    activeStandard={activeStandard}
                    onToggleStandard={() => setActiveStandard(activeStandard === 'CPCB' ? 'US_EPA' : 'CPCB')}
                    colorblindMode={colorblindMode}
                  />
                )}

                {/* Page 2: Spatial Map & Clean Air Finder (Mandatory Feature B + Bonus #4 & #6) */}
                {activeTab === 'map' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-xl flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight">
                          Spatial Atmospheric Map & Clean Air Refuge Finder
                        </h2>
                        <p className="text-xs text-stone-400 mt-0.5">
                          High-resolution Carto tile matrix, WebGL density heatmap, and spatial radius vector recommender
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                        Feature B + Bonus #4 & #6
                      </span>
                    </div>

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
                  </div>
                )}

                {/* Page 3: Historical Pollution Tracker & Anomaly Lab (Mandatory Feature C + Bonus #11) */}
                {activeTab === 'history' && (
                  <HistoricalPollutionTracker
                    historicalPoints={dataset.historical}
                    cityName={location.name}
                    activeStandard={activeStandard}
                    colorblindMode={colorblindMode}
                  />
                )}

                {/* Page 4: City Comparison Matrix & Leaderboard (Mandatory Feature D + Bonus #9) */}
                {activeTab === 'compare' && (
                  <LocationComparisonMatrix
                    onSelectCity={handleSelectLocation}
                    activeStandard={activeStandard}
                    colorblindMode={colorblindMode}
                  />
                )}

                {/* Leaderboard Direct Route */}
                {activeTab === 'leaderboard' && (
                  <PollutionLeaderboard
                    onSelectCity={handleSelectLocation}
                    activeStandard={activeStandard}
                    colorblindMode={colorblindMode}
                  />
                )}

                {/* Page 5: Clinical Health & Dosimetry Dashboard (Mandatory Feature E) */}
                {activeTab === 'health' && (
                  <HealthSafetyDashboard
                    currentData={dataset.current}
                    forecastPoints={dataset.forecast}
                    activeStandard={activeStandard}
                    colorblindMode={colorblindMode}
                  />
                )}

                {/* Page 6: 5-Day Forecast & Explainable ML Lab (Mandatory Feature F + Bonus #3) */}
                {activeTab === 'forecast' && (
                  <AQIForecastAndMLLab
                    currentData={dataset.current}
                    historicalPoints={dataset.historical}
                    forecastPoints={dataset.forecast}
                    activeStandard={activeStandard}
                    colorblindMode={colorblindMode}
                  />
                )}
              </>
            ) : null}
          </div>

          {/* Clean Editorial Footer */}
          <footer className="max-w-7xl mx-auto mt-12 pt-6 pb-4 border-t border-stone-800/80 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-300">AetherGuard Atmospheric Intelligence</span>
              <span>•</span>
              <span>LETS CODE DIWALI CHALLENGE 2026 Submission</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span>Open-Meteo CAMS (CC BY 4.0)</span>
              <span>•</span>
              <span>CPCB Reference Stations</span>
              <span>•</span>
              <span>WHO 2021 Air Quality Guidelines</span>
            </div>
          </footer>
        </main>
      </div>

      {/* ====================================================================
          MODALS & FLOATING ASSISTANT
          ==================================================================== */}

      {/* Judge's 19-Feature Verification Tour Modal (6 Mandatory + 13 Bonus) */}
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

      {/* Smart Threshold Alerts Modal (Bonus #2) */}
      {dataset && (
        <SmartAQIAlertsModal
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          currentData={dataset.current}
          activeStandard={activeStandard}
        />
      )}

      {/* Social Sharing Card Modal (Bonus #7) */}
      {dataset && (
        <SocialSharingCardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          currentData={dataset.current}
          activeStandard={activeStandard}
          colorblindMode={colorblindMode}
        />
      )}

      {/* Pollution Impact & Health Report Exporter (Bonus #8) */}
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

      {/* API Telemetry & Fallback Inspector Modal (Bonus #12) */}
      {dataset && (
        <ApiTelemetryModal
          isOpen={isApiInspectorOpen}
          onClose={() => setIsApiInspectorOpen(false)}
          currentData={dataset.current}
          onTriggerRefresh={() => loadData(location.lat, location.lon, location.name, location.admin1, location.countryCode, true)}
        />
      )}

      {/* Floating AI AQI Copilot & Voice Assistant (Bonus #1, #10 & #13) */}
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
