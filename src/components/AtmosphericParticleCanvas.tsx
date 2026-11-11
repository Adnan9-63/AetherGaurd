// src/components/AtmosphericParticleCanvas.tsx
// Sprint 1: Hardware-Safe "Living Atmosphere Particle Canvas"
// Real-time atmospheric fluid particle drift driven by live wind speed & wind direction

import React, { useRef, useEffect } from 'react';

interface AtmosphericParticleCanvasProps {
  aqi: number;
  windSpeedMps?: number;
  windDirectionDeg?: number;
  isPyroDetected?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  isSpark?: boolean;
  life?: number;
  maxLife?: number;
}

export const AtmosphericParticleCanvas: React.FC<AtmosphericParticleCanvasProps> = ({
  aqi,
  windSpeedMps = 3.2,
  windDirectionDeg = 240,
  isPyroDetected = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isRunning = true;

    // Resize canvas to parent container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Configuration based on AQI Severity
    const isClean = aqi <= 100;
    const isSevere = aqi > 200;
    const count = isClean ? 28 : isSevere ? 42 : 34;

    // Convert wind direction (meteorological standard: direction wind comes FROM) to drift direction
    const windRad = ((windDirectionDeg + 180) % 360) * (Math.PI / 180);
    const speedMagnitude = Math.min(Math.max(windSpeedMps * 0.25, 0.4), 2.2);

    const baseDriftX = Math.cos(windRad) * speedMagnitude;
    const baseDriftY = Math.sin(windRad) * speedMagnitude;

    // Color Palettes
    const cleanColors = ['#10B981', '#34D399', '#6EE7B7', '#FDE047'];
    const moderateColors = ['#EAB308', '#F59E0B', '#F97316', '#CBD5E1'];
    const severeColors = ['#F97316', '#EF4444', '#E11D48', '#9F1239'];
    const activePalette = isClean ? cleanColors : isSevere ? severeColors : moderateColors;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 300;
    const h = rect.height || 200;

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const color = activePalette[Math.floor(Math.random() * activePalette.length)];
      const radius = isClean ? Math.random() * 1.8 + 0.8 : Math.random() * 2.8 + 1.2;
      const baseAlpha = isClean ? Math.random() * 0.35 + 0.15 : Math.random() * 0.5 + 0.25;

      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius,
        vx: baseDriftX * (Math.random() * 0.6 + 0.7) + (Math.random() - 0.5) * 0.3,
        vy: baseDriftY * (Math.random() * 0.6 + 0.7) + (Math.random() - 0.5) * 0.3,
        alpha: baseAlpha,
        baseAlpha,
        color,
      });
    }

    // Occasional Pyrotechnic micro-sparks
    let sparkCooldown = 0;

    const render = () => {
      if (!isRunning) return;

      const currentRect = canvas.getBoundingClientRect();
      const currentW = currentRect.width;
      const currentH = currentRect.height;

      ctx.clearRect(0, 0, currentW, currentH);

      // Add spark if fireworks detected
      if (isPyroDetected && isSevere) {
        sparkCooldown++;
        if (sparkCooldown > 12 && particles.length < 48) {
          sparkCooldown = 0;
          particles.push({
            x: Math.random() * currentW,
            y: Math.random() * currentH,
            radius: Math.random() * 2.2 + 1.0,
            vx: (Math.random() - 0.5) * 3.5,
            vy: (Math.random() - 0.5) * 3.5,
            alpha: 0.9,
            baseAlpha: 0.9,
            color: '#FDE047', // Yellow-gold sulfur spark
            isSpark: true,
            life: 0,
            maxLife: 24,
          });
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.isSpark) {
          p.x += p.vx;
          p.y += p.vy;
          p.life = (p.life || 0) + 1;
          p.alpha = Math.max(0, 1 - p.life / (p.maxLife || 24));

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#FDE047';
          ctx.fill();
          ctx.shadowBlur = 0;

          if (p.life >= (p.maxLife || 24)) {
            particles.splice(i, 1);
          }
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < -10) p.x = currentW + 10;
        if (p.x > currentW + 10) p.x = -10;
        if (p.y < -10) p.y = currentH + 10;
        if (p.y > currentH + 10) p.y = -10;

        // Micro ambient pulse
        p.alpha = p.baseAlpha + Math.sin(Date.now() * 0.002 + i) * 0.08;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.05, Math.min(0.85, p.alpha));
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [aqi, windSpeedMps, windDirectionDeg, isPyroDetected]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.75 }}
    />
  );
};
