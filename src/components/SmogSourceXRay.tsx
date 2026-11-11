// src/components/SmogSourceXRay.tsx
// Sprint 3: Interactive "Smog Source X-Ray" Chemical Dissector
// 4-pill stoichiometric forensic microscope separating Diwali Firecrackers, Biomass, Traffic, and Dust

import React, { useState } from 'react';
import { Flame, Microscope, Sparkles, TestTube2 } from 'lucide-react';
import type { SourceFingerprintOutput } from '../ml/sourceFingerprinting.ts';

interface SmogSourceXRayProps {
  fingerprint: SourceFingerprintOutput;
}

type SourceKey =
  | 'PYROTECHNIC_FIRECRACKERS'
  | 'BIOMASS_CROP_BURNING'
  | 'VEHICULAR_TRAFFIC'
  | 'CRUSTAL_DUST';

export const SmogSourceXRay: React.FC<SmogSourceXRayProps> = ({ fingerprint }) => {
  const [selectedSource, setSelectedSource] = useState<SourceKey>(
    (fingerprint.dominantSource as SourceKey) || 'PYROTECHNIC_FIRECRACKERS'
  );

  const sourcesConfig: Record<
    SourceKey,
    {
      title: string;
      icon: string;
      color: string;
      probability: number;
      primaryChemicals: string;
      combustionType: string;
      healthMechanism: string;
      diagnosticWhy: string;
    }
  > = {
    PYROTECHNIC_FIRECRACKERS: {
      title: 'Diwali Pyrotechnic Firecrackers',
      icon: '🎆',
      color: '#E11D48',
      probability: fingerprint.probabilities.pyrotechnicFirecrackers,
      primaryChemicals: 'Potassium Nitrate (KNO3), Elemental Sulfur (S8), Barium Nitrate (Ba(NO3)2), Strontium Salts',
      combustionType: 'Explosive deflagration at 1,000°C+ releasing concentrated SO2 gas and ultra-fine potassium sulfate aerosols',
      healthMechanism: 'Sulfur dioxide gas reacts with alveolar moisture forming sulfurous acid, provoking acute bronchospasm',
      diagnosticWhy: `High PM2.5/PM10 ratio (${fingerprint.diagnosticMetrics.pm25ToPm10Ratio}) + nocturnal SO2 surge (Mod-Z: ${fingerprint.diagnosticMetrics.so2ZScore}) matches gun-powder fireworks stoichiometry.`,
    },
    BIOMASS_CROP_BURNING: {
      title: 'Agricultural Stubble / Biomass',
      icon: '🌾',
      color: '#F59E0B',
      probability: fingerprint.probabilities.biomassCropBurning,
      primaryChemicals: 'Levoglucosan, Organic Carbon (OC), Elemental Carbon (EC), Carbon Monoxide (CO), Potassium',
      combustionType: 'Low-temperature smoldering pyrolysis of paddy crop residue in Punjab/Haryana rural belts',
      healthMechanism: 'Polycyclic Aromatic Hydrocarbons (PAHs) trigger systemic oxidative stress and endothelial vascular dysfunction',
      diagnosticWhy: `Elevated fine fraction (${fingerprint.diagnosticMetrics.pm25ToPm10Ratio}) with high CO/NO2 (${fingerprint.diagnosticMetrics.coToNo2Ratio}) but baseline SO2 indicates organic biomass without pyrotechnic sulfur.`,
    },
    VEHICULAR_TRAFFIC: {
      title: 'Vehicular Traffic Exhaust',
      icon: '🚗',
      color: '#3B82F6',
      probability: fingerprint.probabilities.vehicularTraffic,
      primaryChemicals: 'Nitrogen Dioxide (NO2), Black Carbon (BC), Polycyclic Aromatics, Benzene, Ultra-fine Copper brake dust',
      combustionType: 'Internal combustion engine exhaust (Diesel & Gasoline) along congested urban arterial corridors',
      healthMechanism: 'Deep pulmonary inflammation and long-term atherosclerosis due to diesel exhaust nanoparticle translocation',
      diagnosticWhy: `Elevated NO2 and moderate PM2.5/PM10 ratio (${fingerprint.diagnosticMetrics.pm25ToPm10Ratio}) aligns with ground transport corridors.`,
    },
    CRUSTAL_DUST: {
      title: 'Crustal Road & Construction Dust',
      icon: '🏗️',
      color: '#A855F7',
      probability: fingerprint.probabilities.crustalDust,
      primaryChemicals: 'Silicon Dioxide (SiO2), Aluminum Oxide (Al2O3), Calcium Carbonate (CaCO3), Iron Oxides',
      combustionType: 'Non-combustion mechanical abrasion, vehicle tire friction, and unpaved road dust resuspension',
      healthMechanism: 'Mechanical irritation of upper tracheobronchial tract; 96% filtered before deep alveoli',
      diagnosticWhy: `Coarse-mode dominance with low PM2.5/PM10 ratio (${fingerprint.diagnosticMetrics.pm25ToPm10Ratio}) with trace combustion gases.`,
    },
  };

  const current = sourcesConfig[selectedSource];
  const isDominant = fingerprint.dominantSource === selectedSource;

  return (
    <div className="mineral-card p-5 rounded-3xl space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <Microscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Smog Source X-Ray & Chemical Dissector
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                Stoichiometric AI Fingerprint
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any emission source to inspect its molecular tracers, combustion physics, and clinical mechanism
            </p>
          </div>
        </div>

        {/* 4-Pill Source Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/70 p-1 rounded-2xl border border-white/[0.08] text-xs">
          {(Object.keys(sourcesConfig) as SourceKey[]).map((key) => {
            const cfg = sourcesConfig[key];
            const isSelected = selectedSource === key;
            const isActualDominant = fingerprint.dominantSource === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedSource(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-white/20 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cfg.icon}</span>
                <span className="hidden sm:inline">{cfg.title.split(' ')[0]}</span>
                {isActualDominant && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Source Deep Dissection Card */}
      <div className="mineral-well p-4 rounded-2xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">{current.title}</h4>
                {isDominant && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    Primary Detected Source
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{current.diagnosticWhy}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Classifier Confidence</span>
            <span className="text-xl font-extrabold font-mono text-white tabular-nums">
              {current.probability}%
            </span>
          </div>
        </div>

        {/* 3 Chemical Dissection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
              <TestTube2 className="w-3 h-3 text-cyan-400" />
              Primary Molecular Tracers
            </span>
            <p className="text-slate-200 leading-snug font-medium">
              {current.primaryChemicals}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              Combustion Thermodynamics
            </span>
            <p className="text-slate-200 leading-snug font-medium">
              {current.combustionType}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400" />
              Alveolar Pathology Mechanism
            </span>
            <p className="text-slate-200 leading-snug font-medium">
              {current.healthMechanism}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
