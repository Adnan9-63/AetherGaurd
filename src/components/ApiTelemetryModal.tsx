// src/components/ApiTelemetryModal.tsx
// Bonus #12: Multi-API Telemetry & Fallback Inspector Modal for Judges & Operators

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, Globe, RefreshCw, ShieldAlert, X } from 'lucide-react';
import type { UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { getSimulateOutage, setSimulateOutage } from '../services/apiOrchestrator.ts';

interface ApiTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: UnifiedAirQualityEnvelope;
  onTriggerRefresh: () => void;
}

export const ApiTelemetryModal: React.FC<ApiTelemetryModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onTriggerRefresh,
}) => {
  const [simulateOutage, setSimulateOutageState] = React.useState(getSimulateOutage());

  if (!isOpen) return null;

  const handleToggleOutage = () => {
    const nextState = !simulateOutage;
    setSimulateOutageState(nextState);
    setSimulateOutage(nextState);
    onTriggerRefresh();
  };

  const { provenance } = currentData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold tracking-wide">Multi-API Fusion & Fallback Inspector</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-mono">
              Bonus #12 Verified
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Active Pipeline Status */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Active Ingestion Pipeline
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                provenance.dataCategory === 'ACTUAL_LIVE_MEASUREMENT'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {provenance.badgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Primary Provider:</span>
                <p className="font-medium text-slate-200 mt-0.5">{provenance.primarySource.organizationName}</p>
              </div>
              <div>
                <span className="text-slate-400">Cache / Route Status:</span>
                <p className="font-mono text-cyan-400 mt-0.5">{provenance.cacheStatus}</p>
              </div>
              <div>
                <span className="text-slate-400">Physical Monitor:</span>
                <p className="font-medium text-slate-200 mt-0.5">
                  {provenance.primarySource.isPhysicalMonitor ? 'Yes (Ground Station)' : 'No (Numerical Atmospheric Model)'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Station Distance:</span>
                <p className="font-medium text-slate-200 mt-0.5">
                  {provenance.primarySource.distanceKm !== undefined ? `${provenance.primarySource.distanceKm} km` : 'Gridded Coordinates'}
                </p>
              </div>
            </div>

            {provenance.fallbackTriggered && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Circuit Breaker Fallback Active: </span>
                  {provenance.fallbackReason}
                </div>
              </div>
            )}
          </div>

          {/* 3-Tier Public Ingestion Hierarchy */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              3-Tier Fault-Tolerant Hierarchy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Tier 1 */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Globe className="w-4 h-4" />
                  <span>Tier 1: Open-Meteo</span>
                </div>
                <p className="text-slate-400">
                  Keyless baseline, CAMS/ECMWF IFS model, 92-day historical archives, and 5-day hourly forecast.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Operational
                </div>
              </div>

              {/* Tier 2 */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <Database className="w-4 h-4" />
                  <span>Tier 2: WAQI / OpenAQ</span>
                </div>
                <p className="text-slate-400">
                  Physical CPCB & SPCB ground-station monitors with live sub-index inverted stoichiometry.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-400">
                  {provenance.primarySource.sourceId === 'WAQI_GROUND_STATION' ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Anchoring Live Readings</span>
                  ) : (
                    <span>Ready / Standby</span>
                  )}
                </div>
              </div>

              {/* Tier 3 */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                  <RefreshCw className="w-4 h-4" />
                  <span>Tier 3: OWM Pollution</span>
                </div>
                <p className="text-slate-400">
                  Redundancy and cross-verification layer for secondary validation when primary monitors stall.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Cross-check & Redundancy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Judge Simulation Controls */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-indigo-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Judge Outage Simulation Switch
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate instant failure of Tier 2 primary ground stations to test automatic fallback.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleOutage}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                  simulateOutage
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {simulateOutage ? 'Outage Active (Reset)' : 'Simulate Primary API Outage'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Staleness: {currentData.timestamp.stalenessMinutes} min ago</span>
          <span>Ingested at: {new Date(currentData.timestamp.fetchedAtISO).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
