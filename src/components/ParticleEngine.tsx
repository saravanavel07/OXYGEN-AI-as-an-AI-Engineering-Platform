import React, { useEffect, useRef } from 'react';

interface ParticleEngineProps {
  density?: 'high' | 'medium' | 'low';
  reducedMotionOverride?: boolean;
  isProcessing?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCrimson: boolean;
  alpha: number;
}

interface WavePulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const ParticleEngine: React.FC<ParticleEngineProps> = ({
  density = 'medium',
  reducedMotionOverride = false,
  isProcessing = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingRef = useRef(isProcessing);
  processingRef.current = isProcessing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shouldReduceMotion = () => reducedMotionOverride || mediaQuery.matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = 0;
    let particles: Particle[] = [];
    const waves: WavePulse[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const getTargetCount = () => {
      if (shouldReduceMotion()) return 28;
      const isMobile = window.innerWidth < 768;
      const cores = navigator.hardwareConcurrency || 4;
      const lowPower = cores <= 2 || isMobile;
      if (density === 'low') return lowPower ? 32 : 55;
      if (density === 'high') return lowPower ? 64 : 135;
      return lowPower ? 48 : 95;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = getTargetCount();
      if (particles.length === 0) {
        particles = Array.from({ length: target }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.42,
          vy: (Math.random() - 0.5) * 0.42,
          radius: Math.random() * 1.6 + 0.8,
          isCrimson: Math.random() < 0.34,
          alpha: Math.random() * 0.45 + 0.2,
        }));
      } else if (particles.length > target) {
        particles = particles.slice(0, target);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active =
        mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
    };

    const handleClick = (e: MouseEvent) => {
      if (shouldReduceMotion()) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        waves.push({ x, y, radius: 4, maxRadius: 210, alpha: 0.35 });
      }
    };

    let lastWaveAt = 0;

    const renderFrame = (timestamp: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const reduced = shouldReduceMotion();
      const speedMul = processingRef.current ? 1.75 : 1.0;

      // Subtle periodic crimson energy wave
      if (!reduced && timestamp - lastWaveAt > (processingRef.current ? 2400 : 5800)) {
        lastWaveAt = timestamp;
        waves.push({
          x: width * 0.72,
          y: height * 0.28,
          radius: 8,
          maxRadius: Math.min(width, height) * 0.55,
          alpha: 0.16,
        });
      }

      // Draw & update energy waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.radius += processingRef.current ? 2.6 : 1.5;
        w.alpha *= 0.982;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(227, 38, 54, ${w.alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (w.radius >= w.maxRadius || w.alpha < 0.01) {
          waves.splice(i, 1);
        }
      }

      const maxDist = 115;
      const maxDistSq = maxDist * maxDist;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduced) {
          p.x += p.vx * speedMul;
          p.y += p.vy * speedMul;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 14000 && distSq > 4) {
              const force = (1 - distSq / 14000) * 0.45;
              const dist = Math.sqrt(distSq);
              p.x += (dx / dist) * force;
              p.y += (dy / dist) * force;
            }
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isCrimson
          ? `rgba(227, 38, 54, ${p.alpha})`
          : `rgba(184, 184, 184, ${p.alpha * 0.72})`;
        ctx.fill();

        // Draw distance connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < maxDistSq) {
            const ratio = 1 - Math.sqrt(dSq) / maxDist;
            const lineAlpha = ratio * (p.isCrimson || q.isCrimson ? 0.16 : 0.08);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle =
              p.isCrimson || q.isCrimson
                ? `rgba(227, 38, 54, ${lineAlpha.toFixed(3)})`
                : `rgba(184, 184, 184, ${lineAlpha.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      if (!reduced) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [density, reducedMotionOverride]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`}
    />
  );
};

interface NeuralOrbitStageProps {
  activeModel: string;
  isLive: boolean;
  isProcessing?: boolean;
  activeAgentCount?: number;
}

export const NeuralOrbitStage: React.FC<NeuralOrbitStageProps> = ({
  activeModel,
  isLive,
  isProcessing = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const procRef = useRef(isProcessing);
  procRef.current = isProcessing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let angle = 0;

    const draw = () => {
      const size = 260;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const speed = procRef.current ? 0.022 : 0.008;
      if (!reduced && !document.hidden) {
        angle += speed;
      }

      // Outer calibrated ring
      ctx.beginPath();
      ctx.arc(cx, cy, 98, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(184, 184, 184, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Secondary tilted orbital ring 1
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.55);
      ctx.beginPath();
      ctx.ellipse(0, 0, 96, 36, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(227, 38, 54, 0.52)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Orbiting electron 1
      const e1x = Math.cos(angle * 2.2) * 96;
      const e1y = Math.sin(angle * 2.2) * 36;
      ctx.rotate(0.35);
      ctx.beginPath();
      ctx.arc(e1x, e1y, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#E32636';
      ctx.fill();
      ctx.restore();

      // Secondary tilted orbital ring 2
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 82, 32, -0.65, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(184, 184, 184, 0.34)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const e2x = Math.cos(-angle * 1.8) * 82;
      const e2y = Math.sin(-angle * 1.8) * 32;
      ctx.rotate(-0.65);
      ctx.beginPath();
      ctx.arc(e2x, e2y, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F5F5';
      ctx.fill();
      ctx.restore();

      // Inner core radial halo
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 42);
      grad.addColorStop(0, 'rgba(227, 38, 54, 0.28)');
      grad.addColorStop(1, 'rgba(227, 38, 54, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();

      // Nucleus ring
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#101010';
      ctx.fill();
      ctx.strokeStyle = '#E32636';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F5F5';
      ctx.fill();

      if (!reduced) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} className="h-[260px] w-[260px]" aria-label="Hydrogen neural orbit visualization" />
      <div className="mt-2 flex items-center gap-2 text-xs text-[#969696]">
        <span className="font-mono text-[#F5F5F5]">{activeModel}</span>
        <span aria-hidden="true">·</span>
        <span className={isLive ? 'text-[#B8B8B8]' : 'text-[#E32636]'}>
          {isLive ? 'Live Runtime' : 'Key Required'}
        </span>
      </div>
    </div>
  );
};

export const ProcessingWaveform: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="inline-flex items-center gap-1 h-4" aria-label="Processing stream">
      {[0, 1, 2, 3, 4].map((idx) => (
        <span
          key={idx}
          className="w-0.5 rounded-full bg-[#E32636] animate-pulse"
          style={{
            height: `${8 + ((idx * 5) % 9)}px`,
            animationDelay: `${idx * 110}ms`,
          }}
        />
      ))}
    </div>
  );
};
