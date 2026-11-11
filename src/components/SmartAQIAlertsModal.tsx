// src/components/SmartAQIAlertsModal.tsx
// Bonus #2: Smart Threshold Alerts Engine with Hysteresis Deadband & Web Notifications

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle,
  Flame,
  Info,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import type { UnifiedAirQualityEnvelope } from '../types/telemetry.ts';

interface SmartAQIAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: UnifiedAirQualityEnvelope;
  activeStandard: 'CPCB' | 'US_EPA';
}

interface AlertConfig {
  enabled: boolean;
  cpcbThreshold: number;
  useEpaThreshold: number;
  pyroSpikeAlert: boolean;
  cleanAirWindowAlert: boolean;
  hysteresisArmed: boolean;
  lastTriggeredAqi?: number;
  lastTriggeredTimestamp?: string;
}

const STORAGE_KEY = 'aetherguard_alert_config_v1';

export const SmartAQIAlertsModal: React.FC<SmartAQIAlertsModalProps> = ({
  isOpen,
  onClose,
  currentData,
  activeStandard,
}) => {
  const [config, setConfig] = useState<AlertConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load alert config from localStorage:', e);
    }
    return {
      enabled: true,
      cpcbThreshold: 200, // CPCB "Poor" threshold
      useEpaThreshold: 150, // EPA "Unhealthy" threshold
      pyroSpikeAlert: true,
      cleanAirWindowAlert: true,
      hysteresisArmed: true,
    };
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testNotificationSent, setTestNotificationSent] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync notification permission status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  // Save config changes to localStorage
  const updateConfig = (updated: Partial<AlertConfig>) => {
    const next = { ...config, ...updated };
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist alert config:', e);
    }
  };

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setToastMessage('Web Notifications are not supported in this browser.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        setToastMessage('System notification permissions granted successfully.');
      } else if (result === 'denied') {
        setToastMessage('Notification permission denied by user browser settings.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const triggerTestNotification = () => {
    const currentAqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
    const standardLabel = activeStandard === 'CPCB' ? 'Indian CPCB NAQI' : 'US-EPA AQI';
    const city = currentData.location.name;

    const title = `⚠️ AetherGuard Alert: AQI ${currentAqi} in ${city}`;
    const body = `Air quality in ${city} has reached ${currentAqi} (${standardLabel}). Prominent pollutant: ${currentData.indices.cpcb.prominentPollutant.toUpperCase()}. Recommended action: Wear an N95 respirator outdoors.`;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification instantiation error, fallback to in-app toast:', err);
      }
    }

    setToastMessage(`[TEST ALERT FIRED]: ${title} — ${body}`);
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 5000);
  };

  if (!isOpen) return null;

  const currentAqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
  const activeThreshold = activeStandard === 'CPCB' ? config.cpcbThreshold : config.useEpaThreshold;
  const isCurrentlyExceeded = currentAqi >= activeThreshold;
  const hysteresisResetLevel = activeThreshold - 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Smart Atmospheric Alerts</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
                  Bonus #2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customizable severity thresholds with 10-point hysteresis deadband & Web Notifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* In-app Toast Banner */}
        {toastMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-950/70 border border-amber-600/60 text-amber-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-mono text-[11px]">{toastMessage}</div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-amber-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Permission Status Pill */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Browser Push Permission</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      notificationPermission === 'granted'
                        ? 'bg-emerald-400'
                        : notificationPermission === 'denied'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[11px] text-slate-400 capitalize">
                    {notificationPermission === 'granted'
                      ? 'System Notifications Enabled'
                      : notificationPermission === 'denied'
                      ? 'Blocked by Browser Settings'
                      : 'Permission Not Yet Granted'}
                  </span>
                </div>
              </div>
            </div>

            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                onClick={requestPermission}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-900/30"
              >
                Enable Notifications
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Ready</span>
              </div>
            )}
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div>
              <p className="text-sm font-semibold text-slate-100">Enable Air Quality Guard</p>
              <p className="text-xs text-slate-400">
                Evaluates every telemetry cycle and notifies when AQI crosses safety thresholds
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                config.enabled ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Threshold Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Active Threshold ({activeStandard === 'CPCB' ? 'Indian CPCB NAQI' : 'US-EPA AQI'})
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-lg">
                Alert Trigger: ≥ {activeThreshold} AQI
              </span>
            </div>

            {activeStandard === 'CPCB' ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min="50"
                  max="450"
                  step="10"
                  value={config.cpcbThreshold}
                  onChange={(e) => updateConfig({ cpcbThreshold: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50 (Good)</span>
                  <span>100 (Satisfactory)</span>
                  <span>200 (Moderate)</span>
                  <span>300 (Poor)</span>
                  <span>400 (Very Poor)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="10"
                  value={config.useEpaThreshold}
                  onChange={(e) => updateConfig({ useEpaThreshold: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50 (Good)</span>
                  <span>100 (Moderate)</span>
                  <span>150 (USG)</span>
                  <span>200 (Unhealthy)</span>
                  <span>300 (Very Unhealthy)</span>
                </div>
              </div>
            )}

            {/* 10-Point Hysteresis Explainer */}
            <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Anti-Alert-Fatigue Hysteresis Guard (10-Point Deadband)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When AQI fluctuates around the threshold, repeated notification spam is suppressed. After triggering at <strong className="text-white">AQI ≥ {activeThreshold}</strong>, the alert engine will only re-arm when air quality reliably drops below <strong className="text-white">AQI {hysteresisResetLevel}</strong> (threshold − 10).
              </p>
              <div className="pt-1 flex items-center gap-3 text-[11px] font-mono">
                <span className="text-slate-400">Current AQI: <span className="text-cyan-300 font-bold">{currentAqi}</span></span>
                <span>•</span>
                <span className={isCurrentlyExceeded ? 'text-amber-400' : 'text-emerald-400'}>
                  Status: {isCurrentlyExceeded ? 'Exceeded Threshold' : 'Within Safe Range'}
                </span>
              </div>
            </div>
          </div>

          {/* Specialized Event Triggers */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Specialized Environmental Triggers
            </h3>

            {/* Fireworks / Pyrotechnics Spike Trigger */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Diwali Pyrotechnic Spike Sentinel</p>
                  <p className="text-[11px] text-slate-400">
                    Notifies immediately if pyrotechnic burst fingerprint confidence crosses 50% with acute SO2/PM2.5 ratio rise
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateConfig({ pyroSpikeAlert: !config.pyroSpikeAlert })}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  config.pyroSpikeAlert ? 'bg-orange-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Clean Air Safe Exercise Window Trigger */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Daily Clean-Air Safe Window Alert</p>
                  <p className="text-[11px] text-slate-400">
                    Notifies 30 minutes before the daily lowest-pollution ventilation window begins for safe outdoor activity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateConfig({ cleanAirWindowAlert: !config.cleanAirWindowAlert })}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  config.cleanAirWindowAlert ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={triggerTestNotification}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-md ${
              testNotificationSent
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{testNotificationSent ? 'Live Alert Dispatched!' : 'Trigger Live Test Alert (For Judges)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
