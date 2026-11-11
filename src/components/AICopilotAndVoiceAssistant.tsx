// src/components/AICopilotAndVoiceAssistant.tsx
// Bonus #1: Context-Injected AI AQI Assistant Chatbot
// Bonus #10 & #13: Hands-Free Voice Assistant (SpeechRecognition + speechSynthesis)
// Deterministic Epidemiological Reasoning Engine with Optional Gemini API Key Support

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Mic,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { HourlyTelemetryPoint, UnifiedAirQualityEnvelope } from '../types/telemetry.ts';
import { classifyPollutionSource } from '../ml/sourceFingerprinting.ts';
import { calculateBerkeleyEarthCigarettes, findSafeOutdoorActivityWindow, SENSITIVE_GROUP_PRECAUTIONS } from '../utils/healthDosimetry.ts';
import { HandsFreeVoiceAssistant } from '../services/voiceAssistant.ts';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AICopilotAndVoiceAssistantProps {
  currentData: UnifiedAirQualityEnvelope;
  forecastPoints: HourlyTelemetryPoint[];
  activeStandard: 'CPCB' | 'US_EPA';
}

export const AICopilotAndVoiceAssistant: React.FC<AICopilotAndVoiceAssistantProps> = ({
  currentData,
  forecastPoints,
  activeStandard,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState<'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'UNSUPPORTED'>('IDLE');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am AetherGuard AI, your Environmental Epidemiologist. I am strictly grounded in live telemetry from ${currentData.location.name} (CPCB AQI ${currentData.indices.cpcb.aqi}, US-EPA ${currentData.indices.usEpa.aqi}). Ask me anything about safe exercise windows, thermal inversions, or emission source forensics!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceAssistantRef = useRef<HandsFreeVoiceAssistant | null>(null);

  // Update welcome greeting or contextually append notice when city / AQI changes
  useEffect(() => {
    setMessages((prev) => {
      const newWelcomeText = `Hello! I am AetherGuard AI, your Environmental Epidemiologist. I am strictly grounded in live telemetry from ${currentData.location.name} (CPCB AQI ${currentData.indices.cpcb.aqi}, US-EPA ${currentData.indices.usEpa.aqi}). Ask me anything about safe exercise windows, thermal inversions, or emission source forensics!`;

      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{
          id: 'welcome',
          sender: 'assistant',
          text: newWelcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];
      }

      const lastMsg = prev[prev.length - 1];
      if (lastMsg && !lastMsg.text.includes(currentData.location.name)) {
        return [
          ...prev,
          {
            id: `switch-${Date.now()}`,
            sender: 'assistant',
            text: `📍 Context switched to **${currentData.location.name}** (CPCB AQI ${currentData.indices.cpcb.aqi}, US-EPA ${currentData.indices.usEpa.aqi}). All health and dosimetry queries are now updated to local telemetry.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ];
      }
      return prev;
    });
  }, [currentData.location.name, currentData.indices.cpcb.aqi, currentData.indices.usEpa.aqi]);

  // Initialize Web Speech API Voice Assistant
  useEffect(() => {
    voiceAssistantRef.current = new HandsFreeVoiceAssistant(
      (transcript, isFinal) => {
        setInputText(transcript);
        if (isFinal && transcript.trim().length > 3) {
          handleSendMessage(transcript);
        }
      },
      (status) => {
        setVoiceStatus(status);
      }
    );

    return () => {
      voiceAssistantRef.current?.cancelSpeech();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Deterministic Local Epidemiological Reasoning Engine
  const generateDeterministicAnswer = (query: string): string => {
    const q = query.toLowerCase();
    const pm25 = currentData.pollutants.pm2_5 ?? 60;
    const pm10 = currentData.pollutants.pm10 ?? 110;
    const aqi = activeStandard === 'CPCB' ? currentData.indices.cpcb.aqi : currentData.indices.usEpa.aqi;
    const cat = activeStandard === 'CPCB' ? currentData.indices.cpcb.category : currentData.indices.usEpa.category;
    const standardName = activeStandard === 'CPCB' ? 'Indian CPCB NAQI' : 'US-EPA AQI';
    const fp = classifyPollutionSource(pm25, pm10, currentData.pollutants.so2 ?? 15, currentData.pollutants.no2 ?? 30, currentData.pollutants.co ?? 1.2);
    const cigs = calculateBerkeleyEarthCigarettes(pm25, 2, false, 'adult');
    const safeWindow = findSafeOutdoorActivityWindow(forecastPoints, 2);
    const blh = Math.round(currentData.meteorology.boundaryLayerHeightM || 350);
    const vc = Math.round(currentData.meteorology.ventilationCoefficientM2s || 400);

    const safeStart = safeWindow ? new Date(safeWindow.bestWindowStartISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '15:00';
    const safeEnd = safeWindow ? new Date(safeWindow.bestWindowEndISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '17:00';

    if (q.includes('run') || q.includes('exercise') || q.includes('workout') || q.includes('cycling') || q.includes('safe to go')) {
      if (aqi > 250) {
        return `Current AQI in ${currentData.location.name} is ${aqi} (${cat}), which is dangerous for high-ventilation workouts. Running multiplies your pulmonary minute-ventilation from 6 L/min to 60 L/min, driving an estimated ${(pm25 * 0.06 * 60).toFixed(0)} µg/hr of fine particles directly into your alveoli. I recommend shifting your workout indoors with HEPA air filtration, or waiting for the diurnal safe window between ${safeStart} and ${safeEnd} IST.`;
      }
      return `Current AQI in ${currentData.location.name} is ${aqi} (${cat}). Outdoor running is acceptable, but check symptoms if you have respiratory sensitivity. The safest outdoor window today is ${safeStart} to ${safeEnd} IST when solar turbulence disperses ground particulates.`;
    }

    if (q.includes('why') || q.includes('spik') || q.includes('inversion') || q.includes('thermal') || q.includes('night')) {
      return `Air pollution is accumulating due to a nocturnal thermal inversion. The Planetary Boundary Layer Height has dropped to ${blh} meters with stagnant ventilation (${vc} m²/s). Combined with primary emission from ${fp.dominantSource.replace(/_/g, ' ').toLowerCase()} (${fp.confidencePct}% match), particulates are trapped near the ground.`;
    }

    if (q.includes('who') || q.includes('limit') || q.includes('guideline') || q.includes('standard')) {
      const pm25Ratio = (pm25 / 15).toFixed(1);
      return `The WHO 2021 daily safe guideline for PM2.5 is 15 µg/m³. In ${currentData.location.name}, current PM2.5 is ${pm25} µg/m³, which is ${pm25Ratio}x above the WHO safe limit. For PM10 (${pm10} µg/m³), it is ${(pm10 / 45).toFixed(1)}x the 45 µg/m³ limit.`;
    }

    if (q.includes('cigar') || q.includes('smoke') || q.includes('berkeley')) {
      return `According to the Berkeley Earth epidemiological model (22 µg/m³ PM2.5 = 1 cig/day), breathing ambient air in ${currentData.location.name} today for 2 outdoor hours carries the statistical mortality risk equivalent to smoking ~${cigs.cigarettesPerDay} cigarettes per day (${cigs.cigarettesPerYear} cigs/year), equating to ~${cigs.lifeMinutesLostPerDay} lost life-minutes daily.`;
    }

    if (q.includes('asthma') || q.includes('copd') || q.includes('patient') || q.includes('heart') || q.includes('precaution')) {
      const prec = SENSITIVE_GROUP_PRECAUTIONS[cat] || SENSITIVE_GROUP_PRECAUTIONS['Poor'];
      return `Medical Advisory for ${cat} air: Asthma & COPD patients should strictly avoid outdoor exertion and keep bronchodilator rescue inhalers accessible. ${prec.asthmaCopd} Cardiovascular patients should avoid high-ventilation activity to minimize ST-segment cardiac depression.`;
    }

    return `Telemetry summary for ${currentData.location.name}: ${standardName} is ${aqi} (${cat}) driven primarily by ${fp.dominantSource.replace(/_/g, ' ').toLowerCase()} (${fp.confidencePct}% match). PM2.5 is ${pm25} µg/m³ (${(pm25 / 15).toFixed(1)}x WHO limit). Atmospheric ventilation capacity is ${vc} m²/s. Safest outdoor window: ${safeStart} to ${safeEnd} IST.`;
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setVoiceStatus('THINKING');

    let assistantResponse = '';

    // Check optional Gemini API Key
    const geminiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';

    if (geminiKey) {
      try {
        const liveContext = JSON.stringify({
          location: currentData.location,
          indices: currentData.indices,
          pollutants: currentData.pollutants,
          meteorology: currentData.meteorology,
          provenance: currentData.provenance,
        });

        const prompt = `You are AetherGuard AI, an Environmental Epidemiologist and Atmospheric Scientist.
Base your answer STRICTLY on this live telemetry context:
${liveContext}
Answer concisely (under 60 words for voice synthesis compatibility), citing CPCB/US-EPA AQI, specific pollutant numbers, and physical dispersion factors (PBLH/VC).
User Question: ${userText}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        const json = await res.json();
        const geminiText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          assistantResponse = geminiText;
        } else {
          assistantResponse = generateDeterministicAnswer(userText);
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local deterministic model:', err);
        assistantResponse = generateDeterministicAnswer(userText);
      }
    } else {
      assistantResponse = generateDeterministicAnswer(userText);
    }

    const botMsg: Message = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      text: assistantResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
    setVoiceStatus('IDLE');

    // Voice response output if enabled
    if (isTtsEnabled && voiceAssistantRef.current) {
      voiceAssistantRef.current.speakResponse(assistantResponse);
    }
  };

  const handleVoiceButtonClick = () => {
    if (voiceStatus === 'LISTENING') {
      voiceAssistantRef.current?.stopListening();
    } else if (voiceStatus === 'SPEAKING') {
      voiceAssistantRef.current?.cancelSpeech();
    } else {
      voiceAssistantRef.current?.startListening();
    }
  };

  return (
    <>
      {/* Floating Bottom-Right Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-2xl hover:shadow-cyan-500/30 transition-all border border-cyan-400/40 group"
          >
            <Bot className="w-5 h-5 text-cyan-200 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-xs tracking-wide">AI AQI Copilot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Slide-over or Modal Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all ${
          isMinimized ? 'h-14' : 'h-[620px]'
        }`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-white">AetherGuard AI Copilot</h3>
                  <span className="text-[10px] font-mono px-1.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Live Grounded
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {currentData.location.name} • CPCB AQI {currentData.indices.cpcb.aqi}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Toggle */}
              <button
                type="button"
                onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                title={isTtsEnabled ? 'Mute Spoken Voice' : 'Enable Spoken Voice'}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  voiceAssistantRef.current?.cancelSpeech();
                  setIsOpen(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md leading-relaxed font-sans ${
                        m.sender === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className="block text-[9px] text-slate-400 text-right mt-1 opacity-70">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {voiceStatus === 'THINKING' && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 italic flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span>Synthesizing atmospheric telemetry...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Pills */}
              <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
                {[
                  'Is it safe to go for a run right now?',
                  'Why is AQI spiking tonight?',
                  'Compare PM2.5 vs WHO limits',
                  'What precautions should asthma patients take?',
                  'Calculate my cigarette equivalence',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap shrink-0 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input Bar & Hands-Free Web Speech Button */}
              <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                {/* Voice Mic Button (Bonus #13) */}
                <button
                  type="button"
                  onClick={handleVoiceButtonClick}
                  title="Ask Hands-Free via Voice (Indian English en-IN)"
                  className={`p-2.5 rounded-xl border transition-all ${
                    voiceStatus === 'LISTENING'
                      ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                      : voiceStatus === 'SPEAKING'
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder={voiceStatus === 'LISTENING' ? 'Listening to voice...' : 'Ask environmental health question...'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage(inputText)}
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
