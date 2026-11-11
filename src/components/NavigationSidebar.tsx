// src/components/NavigationSidebar.tsx
// Modern Left Navigation Sidebar for AetherGuard (Breathe Better)
// Provides clean, breathable single-purpose navigation across Mandatory Features A–F + Quick Tools

import React from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Compass,
  FileSpreadsheet,
  Gauge,
  HeartPulse,
  MapPin,
  Share2,
  Terminal,
  TrendingUp,
  X,
} from 'lucide-react';
import type { NavigationTab } from '../App.tsx';

interface NavigationSidebarProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  cityName: string;
  currentAqi?: number;
  aqiCategory?: string;
  categoryColorHex?: string;
  onOpenVoiceCopilot?: () => void;
  onOpenShareModal: () => void;
  onOpenReportModal: () => void;
  onOpenJudgeTour: () => void;
  onOpenApiInspector: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  cityName,
  currentAqi,
  aqiCategory,
  categoryColorHex = '#f59e0b',
  onOpenShareModal,
  onOpenReportModal,
  onOpenJudgeTour,
  onOpenApiInspector,
}) => {
  const navItems: {
    id: NavigationTab;
    label: string;
    subtext: string;
    featureTag: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'live',
      label: 'Live Dashboard',
      subtext: 'Hero gauge & 6 pollutants',
      featureTag: 'Feature A',
      icon: <Gauge className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'map',
      label: 'Spatial Pollution Map',
      subtext: 'Carto tiles & clean air finder',
      featureTag: 'Feature B',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'history',
      label: 'Historical Trends',
      subtext: '7–30d archive & anomaly lab',
      featureTag: 'Feature C',
      icon: <TrendingUp className="w-4 h-4 text-orange-400" />,
    },
    {
      id: 'compare',
      label: 'City Comparison',
      subtext: '5-city matrix & leaderboard',
      featureTag: 'Feature D & #9',
      icon: <BarChart3 className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'health',
      label: 'Health & Dosimetry',
      subtext: 'Cigarettes & inhaled dose',
      featureTag: 'Feature E',
      icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'forecast',
      label: '5-Day AQI Forecast',
      subtext: '120h ML timeline & drivers',
      featureTag: 'Feature F & #3',
      icon: <Activity className="w-4 h-4 text-amber-300" />,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 bg-[#141210] text-stone-200 border-r border-stone-800/80">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-lg shadow-inner">
              🪔
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono">
                  AetherGuard
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold uppercase tracking-wider">
                  Diwali '26
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-medium">Breathe Better Intelligence</p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg bg-stone-800/80 text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Location Pill */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-stone-900/90 border border-stone-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-white block truncate">{cityName}</span>
              <span className="text-[10px] text-stone-400 block truncate">
                {aqiCategory || 'Live Station Telemetry'}
              </span>
            </div>
          </div>
          {currentAqi !== undefined && (
            <div
              className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold shrink-0 shadow-sm"
              style={{
                backgroundColor: `${categoryColorHex}20`,
                color: categoryColorHex,
                border: `1px solid ${categoryColorHex}50`,
              }}
            >
              {currentAqi} AQI
            </div>
          )}
        </div>

        {/* Navigation Items (Mandatory A–F) */}
        <div className="mt-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 px-2 block mb-1">
            Core Instrument Pages
          </span>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-amber-950/70 text-amber-200 border border-amber-700/60 shadow-md font-semibold'
                    : 'text-stone-300 hover:bg-stone-850 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-900/60 text-amber-300'
                      : 'bg-stone-800/80 text-stone-400 group-hover:text-amber-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate group-hover:text-white">
                      {item.label}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-stone-800/90 text-stone-400">
                      {item.featureTag}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 block truncate font-normal">
                    {item.subtext}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Quick Action Tools */}
      <div className="pt-3 border-t border-stone-800/80 space-y-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 px-2 block mb-1">
          Forensics & Sharing
        </span>

        {/* Judge Verification Tour */}
        <button
          type="button"
          onClick={() => {
            onOpenJudgeTour();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-950/80 to-orange-950/60 border border-amber-600/50 text-amber-200 hover:border-amber-500 transition-all shadow-sm"
        >
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Judge's 19-Feature Tour</span>
          <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-amber-900 text-amber-300 font-mono">
            100%
          </span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {/* Social Share Modal */}
          <button
            type="button"
            onClick={() => {
              onOpenShareModal();
              onCloseMobile();
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-all"
          >
            <Share2 className="w-3 h-3 text-amber-400" />
            <span>Social Card</span>
          </button>

          {/* Impact Report Exporter */}
          <button
            type="button"
            onClick={() => {
              onOpenReportModal();
              onCloseMobile();
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-all"
          >
            <FileSpreadsheet className="w-3 h-3 text-orange-400" />
            <span>PDF/CSV</span>
          </button>
        </div>

        {/* Multi-Tier API Telemetry */}
        <button
          type="button"
          onClick={() => {
            onOpenApiInspector();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[11px] font-mono text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-all"
        >
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Multi-Tier API Inspector</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold">Tier 1–3</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 z-40 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
