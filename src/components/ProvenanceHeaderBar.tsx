// src/components/ProvenanceHeaderBar.tsx
// Compact Single-Tier Provenance Header Bar for AetherGuard (Breathe Better)
// Eliminates stacked navbars while guaranteeing 100% strict data provenance display

import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Eye,
  Globe2,
  Headphones,
  Menu,
  Moon,
  Navigation,
  RefreshCw,
  Search,
  Sun,
  VolumeX,
} from 'lucide-react';
import type { GeocodingResult, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { searchCities } from '../services/apiOrchestrator.ts';

interface ProvenanceHeaderBarProps {
  currentData: UnifiedAirQualityEnvelope;
  activeStandard: 'CPCB' | 'US_EPA';
  onToggleStandard: () => void;
  colorblindMode: boolean;
  onToggleColorblind: () => void;
  theme: 'espresso' | 'sand';
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  onSelectLocation: (lat: number, lon: number, name: string, admin1?: string, countryCode?: string) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  isRefreshing: boolean;
  onManualRefresh: () => void;
}

const PRESET_CITIES = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, admin1: 'Delhi', country: 'IN' },
  { name: 'Patna', lat: 25.5941, lon: 85.1376, admin1: 'Bihar', country: 'IN' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, admin1: 'Karnataka', country: 'IN' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, admin1: 'Maharashtra', country: 'IN' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, admin1: 'West Bengal', country: 'IN' },
  { name: 'Zurich', lat: 47.3769, lon: 8.5417, admin1: 'Zurich', country: 'CH' },
];

export const ProvenanceHeaderBar: React.FC<ProvenanceHeaderBarProps> = ({
  currentData,
  activeStandard,
  onToggleStandard,
  colorblindMode,
  onToggleColorblind,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
  onSelectLocation,
  onLocateMe,
  isLocating,
  isRefreshing,
  onManualRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSpeakingBrief, setIsSpeakingBrief] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 30s Human Atmospheric Briefing via SpeechSynthesis
  const handleToggleAudioBrief = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isSpeakingBrief) {
      window.speechSynthesis.cancel();
      setIsSpeakingBrief(false);
      return;
    }

    window.speechSynthesis.cancel();

    const aqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
    const cat = activeStandard === 'CPCB' ? currentData.indices.cpcb.category : currentData.indices.usEpa.category;
    const prominent = currentData.indices.cpcb.prominentPollutant.toUpperCase();
    const pblh = Math.round(currentData.meteorology.boundaryLayerHeightM || 450);

    const script = `Here is your atmospheric briefing for ${currentData.location.name}. Current air quality is ${cat} with a CPCB AQI of ${aqi}, driven primarily by ${prominent}. Planetary boundary layer height is at ${pblh} meters. Check your safe exercise window before planning outdoor activity.`;

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.includes('en-IN')) || voices.find((v) => v.lang.startsWith('en')) || null;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeakingBrief(true);
    utterance.onend = () => setIsSpeakingBrief(false);
    utterance.onerror = () => setIsSpeakingBrief(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCities(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('City search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city: GeocodingResult) => {
    onSelectLocation(city.latitude, city.longitude, city.name, city.admin1, city.countryCode);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const { provenance, timestamp } = currentData;
  const measurementDate = new Date(timestamp.measurementTimeISO);
  const formattedTime = !isNaN(measurementDate.getTime())
    ? measurementDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'Live';

  return (
    <header className="w-full bg-[#141210] border-b border-stone-800/80 sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between gap-3 text-stone-200">
      {/* Left: Mobile Menu Toggle & City Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* City Autocomplete Search Input */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search city, district, or coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              className="w-full pl-9 pr-9 py-1.5 text-xs bg-stone-900/90 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium"
            />
            {isSearching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-stone-800/80">
              {searchResults.map((city) => (
                <button
                  key={`${city.id}-${city.latitude}`}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-stone-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-stone-100">{city.name}</span>
                    <span className="text-stone-400 text-[11px] ml-1.5">
                      {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locate Me Button (Bonus #5) */}
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          title="Detect My Location (HTML5 GPS + WAQI IP Fallback)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-800 transition-all hover:border-amber-500/50 shrink-0"
        >
          <Navigation className={`w-3.5 h-3.5 text-amber-400 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Locate</span>
        </button>
      </div>

      {/* Middle: Immutable Data Provenance Badge */}
      <div className="hidden lg:flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm border ${
            provenance.dataCategory === 'ACTUAL_LIVE_MEASUREMENT'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
              : provenance.dataCategory === 'HISTORICAL_ARCHIVE'
              ? 'bg-amber-950/70 text-amber-300 border-amber-800/70'
              : 'bg-orange-950/70 text-orange-300 border-orange-800/70'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">{provenance.badgeLabel}</span>
          <span className="text-stone-500 text-[10px]">|</span>
          <span className="text-stone-300 text-[10px] truncate max-w-[160px]">
            {provenance.primarySource.organizationName}
          </span>
          {provenance.primarySource.distanceKm !== undefined && (
            <span className="text-stone-400 text-[10px]">
              ({provenance.primarySource.distanceKm} km away)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
          <Clock className="w-3 h-3 text-stone-500" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Right Controls: Presets, Audio Brief, Standard, Colorblind, Theme, Refresh */}
      <div className="flex items-center gap-1.5">
        {/* Preset quick pills on wide screens */}
        <div className="hidden xl:flex items-center gap-1 mr-1">
          {PRESET_CITIES.slice(0, 4).map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelectLocation(c.lat, c.lon, c.name, c.admin1, c.country)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* 30s Air Radio Brief */}
        <button
          type="button"
          onClick={handleToggleAudioBrief}
          title="Play 30-Second Human Atmospheric Radio Brief"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            isSpeakingBrief
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/80'
          }`}
        >
          {isSpeakingBrief ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : (
            <>
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">30s Brief</span>
            </>
          )}
        </button>

        {/* Dual Standard Switch (CPCB NAQI / US-EPA AQI) */}
        <button
          type="button"
          onClick={onToggleStandard}
          title="Switch between Indian CPCB NAQI and US-EPA Standard"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 transition-all"
        >
          <Globe2 className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeStandard === 'CPCB' ? 'CPCB' : 'US-EPA'}</span>
        </button>

        {/* Okabe-Ito Colorblind Toggle */}
        <button
          type="button"
          onClick={onToggleColorblind}
          title="Toggle Okabe-Ito Colorblind-Safe Palette"
          className={`p-1.5 rounded-xl text-xs font-medium border transition-all ${
            colorblindMode
              ? 'bg-amber-950/80 border-amber-600 text-amber-200'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          <Eye className="w-4 h-4 text-amber-400" />
        </button>

        {/* ☀️ Daylight Sand / 🌙 Warm Espresso Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'espresso' ? 'Switch to ☀️ Daylight Sand (Light Mode)' : 'Switch to 🌙 Warm Espresso (Dark Mode)'}
          className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 transition-all"
        >
          {theme === 'espresso' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-stone-300" />
          )}
        </button>

        {/* Manual Refresh Button */}
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Force Live Data Revalidation"
          className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
