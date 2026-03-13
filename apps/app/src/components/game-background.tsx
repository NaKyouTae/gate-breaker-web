'use client';

import { useEffect, useRef } from 'react';

interface GameBackgroundProps {
  children: React.ReactNode;
}

export function GameBackground({ children }: GameBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const container = containerRef.current;
    let destroyed = false;

    (async () => {
      // Dynamic import to avoid SSR window issues
      const Phaser = await import('phaser');

      if (destroyed || !container) return;

      class GateScene extends Phaser.Scene {
        private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: number; life: number; maxLife: number }[] = [];
        private gfx!: Phaser.GameObjects.Graphics;
        private portalAngle = 0;
        private runeAngles: number[] = [];
        private lightningTimer = 0;
        private lightnings: { x1: number; y1: number; points: { x: number; y: number }[]; alpha: number }[] = [];

        constructor() {
          super({ key: 'GateScene' });
        }

        create() {
          this.gfx = this.add.graphics();
          this.runeAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

          for (let i = 0; i < 60; i++) {
            this.spawnParticle(true);
          }
        }

        private spawnParticle(initial = false) {
          const w = this.scale.width;
          const h = this.scale.height;
          const cx = w / 2;
          const cy = h * 0.38;

          const isOrbital = Math.random() < 0.3;
          let x: number, y: number, vx: number, vy: number;

          if (isOrbital) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 80;
            x = cx + Math.cos(angle) * dist;
            y = cy + Math.sin(angle) * dist;
            vx = Math.cos(angle + Math.PI / 2) * (0.3 + Math.random() * 0.5);
            vy = Math.sin(angle + Math.PI / 2) * (0.3 + Math.random() * 0.5);
          } else {
            x = Math.random() * w;
            y = initial ? Math.random() * h : h + 10;
            vx = (Math.random() - 0.5) * 0.3;
            vy = -(0.2 + Math.random() * 0.6);
          }

          const colors = [0x7c3aed, 0xa78bfa, 0xe94560, 0xc23152, 0x533483, 0x3b82f6, 0xfbbf24];

          this.particles.push({
            x, y, vx, vy,
            size: 1 + Math.random() * 3,
            alpha: 0.1 + Math.random() * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: initial ? Math.random() * 300 : 0,
            maxLife: 200 + Math.random() * 300,
          });
        }

        private generateLightning(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
          const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
          const segments = 6 + Math.floor(Math.random() * 4);
          for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 40;
            const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 40;
            points.push({ x: mx, y: my });
          }
          points.push({ x: x2, y: y2 });
          return points;
        }

        update(_time: number, delta: number) {
          const w = this.scale.width;
          const h = this.scale.height;
          const cx = w / 2;
          const cy = h * 0.38;
          const dt = delta / 16.67;

          this.gfx.clear();

          // Background gradient
          for (let i = 0; i < 20; i++) {
            const t = i / 20;
            const r = Math.floor(10 + t * 5);
            const g = Math.floor(10 + t * 3);
            const b = Math.floor(15 + t * 10);
            const color = (r << 16) | (g << 8) | b;
            this.gfx.fillStyle(color, 1);
            this.gfx.fillRect(0, (h / 20) * i, w, h / 20 + 1);
          }

          // Portal glow (outer)
          const glowPulse = 0.5 + Math.sin(this.portalAngle * 0.5) * 0.2;
          for (let r = 120; r > 0; r -= 4) {
            const a = (1 - r / 120) * 0.08 * glowPulse;
            this.gfx.fillStyle(0x7c3aed, a);
            this.gfx.fillCircle(cx, cy, r);
          }

          // Portal ring
          this.portalAngle += 0.015 * dt;
          const portalRadius = 55;
          const ringSegments = 64;

          // Outer ring
          this.gfx.lineStyle(3, 0x7c3aed, 0.7);
          this.gfx.beginPath();
          for (let i = 0; i <= ringSegments; i++) {
            const angle = (i / ringSegments) * Math.PI * 2 + this.portalAngle;
            const wobble = Math.sin(angle * 3 + this.portalAngle * 2) * 4;
            const px = cx + Math.cos(angle) * (portalRadius + wobble);
            const py = cy + Math.sin(angle) * (portalRadius + wobble);
            if (i === 0) this.gfx.moveTo(px, py);
            else this.gfx.lineTo(px, py);
          }
          this.gfx.strokePath();

          // Inner ring
          this.gfx.lineStyle(1.5, 0xa78bfa, 0.4);
          this.gfx.beginPath();
          for (let i = 0; i <= ringSegments; i++) {
            const angle = (i / ringSegments) * Math.PI * 2 - this.portalAngle * 0.7;
            const wobble = Math.sin(angle * 5 + this.portalAngle * 3) * 3;
            const px = cx + Math.cos(angle) * (portalRadius - 12 + wobble);
            const py = cy + Math.sin(angle) * (portalRadius - 12 + wobble);
            if (i === 0) this.gfx.moveTo(px, py);
            else this.gfx.lineTo(px, py);
          }
          this.gfx.strokePath();

          // Portal center vortex
          for (let i = 0; i < 4; i++) {
            const spiralAngle = this.portalAngle * 2 + (i / 4) * Math.PI * 2;
            this.gfx.lineStyle(1, 0xc4b5fd, 0.2);
            this.gfx.beginPath();
            for (let j = 0; j < 30; j++) {
              const t = j / 30;
              const sa = spiralAngle + t * Math.PI * 2;
              const sr = t * (portalRadius - 15);
              const px = cx + Math.cos(sa) * sr;
              const py = cy + Math.sin(sa) * sr;
              if (j === 0) this.gfx.moveTo(px, py);
              else this.gfx.lineTo(px, py);
            }
            this.gfx.strokePath();
          }

          // Rune symbols orbiting
          for (let i = 0; i < this.runeAngles.length; i++) {
            this.runeAngles[i] += 0.008 * dt * (i % 2 === 0 ? 1 : -1);
            const ra = this.runeAngles[i];
            const rd = portalRadius + 25 + Math.sin(ra * 2) * 5;
            const rx = cx + Math.cos(ra) * rd;
            const ry = cy + Math.sin(ra) * rd;
            const runeAlpha = 0.3 + Math.sin(this.portalAngle * 2 + i) * 0.2;

            this.gfx.fillStyle(0xa78bfa, runeAlpha);
            this.gfx.beginPath();
            this.gfx.moveTo(rx, ry - 4);
            this.gfx.lineTo(rx + 3, ry);
            this.gfx.lineTo(rx, ry + 4);
            this.gfx.lineTo(rx - 3, ry);
            this.gfx.closePath();
            this.gfx.fillPath();
          }

          // Particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;

            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 20) {
              p.vx += (dx / dist) * 0.005 * dt;
              p.vy += (dy / dist) * 0.005 * dt;
            }

            const lifeRatio = p.life / p.maxLife;
            let alpha = p.alpha;
            if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
            else if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

            if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > w + 20) {
              this.particles.splice(i, 1);
              continue;
            }

            this.gfx.fillStyle(p.color, alpha);
            this.gfx.fillCircle(p.x, p.y, p.size);

            if (p.size > 2) {
              this.gfx.fillStyle(p.color, alpha * 0.2);
              this.gfx.fillCircle(p.x, p.y, p.size * 2.5);
            }
          }

          if (Math.random() < 0.3) this.spawnParticle();

          // Lightning
          this.lightningTimer += dt;
          if (this.lightningTimer > 80 + Math.random() * 120) {
            this.lightningTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const startR = portalRadius + 5;
            const endR = portalRadius + 40 + Math.random() * 60;
            this.lightnings.push({
              x1: cx + Math.cos(angle) * startR,
              y1: cy + Math.sin(angle) * startR,
              points: this.generateLightning(
                cx + Math.cos(angle) * startR,
                cy + Math.sin(angle) * startR,
                cx + Math.cos(angle) * endR,
                cy + Math.sin(angle) * endR,
              ),
              alpha: 0.8,
            });
          }

          for (let i = this.lightnings.length - 1; i >= 0; i--) {
            const l = this.lightnings[i];
            l.alpha -= 0.04 * dt;
            if (l.alpha <= 0) {
              this.lightnings.splice(i, 1);
              continue;
            }

            this.gfx.lineStyle(2, 0xc4b5fd, l.alpha);
            this.gfx.beginPath();
            this.gfx.moveTo(l.points[0].x, l.points[0].y);
            for (let j = 1; j < l.points.length; j++) {
              this.gfx.lineTo(l.points[j].x, l.points[j].y);
            }
            this.gfx.strokePath();

            this.gfx.lineStyle(6, 0x7c3aed, l.alpha * 0.2);
            this.gfx.beginPath();
            this.gfx.moveTo(l.points[0].x, l.points[0].y);
            for (let j = 1; j < l.points.length; j++) {
              this.gfx.lineTo(l.points[j].x, l.points[j].y);
            }
            this.gfx.strokePath();
          }

          // Ground fog
          for (let i = 0; i < 6; i++) {
            const fogX = (w / 6) * i + Math.sin(this.portalAngle * 0.3 + i) * 30;
            const fogY = h - 20 + Math.sin(this.portalAngle * 0.5 + i * 1.5) * 10;
            const fogAlpha = 0.03 + Math.sin(this.portalAngle + i) * 0.015;
            this.gfx.fillStyle(0x533483, fogAlpha);
            this.gfx.fillEllipse(fogX, fogY, 120 + Math.sin(i) * 40, 30);
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: container,
        width: container.clientWidth,
        height: container.clientHeight,
        transparent: true,
        scene: GateScene,
        fps: { target: 30, forceSetTimeOut: true },
        banner: false,
        audio: { noAudio: true },
        input: { mouse: false, touch: false, keyboard: false },
      });

      gameRef.current = game;

      const handleResize = () => {
        if (game && container) {
          game.scale.resize(container.clientWidth, container.clientHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup reference
      (gameRef as React.MutableRefObject<{ game: Phaser.Game; cleanup: () => void } | null>).current = {
        game,
        cleanup: () => {
          window.removeEventListener('resize', handleResize);
          game.destroy(true);
        },
      };
    })();

    return () => {
      destroyed = true;
      const ref = gameRef.current as { game: unknown; cleanup: () => void } | null;
      if (ref && typeof ref === 'object' && 'cleanup' in ref) {
        ref.cleanup();
      }
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Phaser canvas renders here via parent ref */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
