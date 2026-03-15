'use client';

import { useEffect, useRef } from 'react';

export type EnhanceEffectType = 'success' | 'maintain' | 'downgrade' | 'destroy' | 'enhancing';

interface EnhanceEffectProps {
  type: EnhanceEffectType;
  onComplete?: () => void;
  /** Pixel Y position of the effect center (relative to the container). Defaults to 35% height. */
  centerY?: number;
}

export function EnhanceEffect({ type, onComplete, centerY }: EnhanceEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const container = containerRef.current;
    let destroyed = false;

    (async () => {
      const Phaser = await import('phaser');
      if (destroyed || !container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const effectCenterY = centerY ?? h * 0.35;

      interface Particle {
        x: number; y: number; vx: number; vy: number;
        size: number; alpha: number; color: number;
        life: number; maxLife: number; gravity: number;
      }
      interface ShockWave {
        x: number; y: number; radius: number; maxRadius: number;
        alpha: number; color: number; lineWidth: number;
      }
      interface Spark {
        x: number; y: number; angle: number; speed: number;
        length: number; alpha: number; color: number; decay: number;
      }
      interface CrackSegment {
        x1: number; y1: number; x2: number; y2: number; alpha: number;
      }

      class EnhanceSuccessScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private shockWaves: ShockWave[] = [];
        private sparks: Spark[] = [];
        private elapsed = 0;
        private phase = 0;
        private chargeRadius = 0;
        private flashAlpha = 0;

        constructor() { super({ key: 'EnhanceSuccessScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0;
          this.phase = 0;
          this.chargeRadius = 0;
          this.flashAlpha = 0;
          this.particles = [];
          this.shockWaves = [];
          this.sparks = [];
        }

        update(_time: number, delta: number) {
          const sw = this.scale.width;
          const sh = this.scale.height;
          const cx = sw / 2;
          const cy = effectCenterY;
          const dt = delta / 16.67;
          this.elapsed += delta;
          this.gfx.clear();

          if (this.phase === 0) {
            const t = Math.min(this.elapsed / 350, 1);
            this.chargeRadius = 60 * (1 - t * t);

            if (Math.random() < 0.7) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 80 + Math.random() * 60;
              this.particles.push({
                x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (5 + Math.random() * 3),
                vy: -Math.sin(angle) * (5 + Math.random() * 3),
                size: 1.5 + Math.random() * 2, alpha: 0.6 + Math.random() * 0.4,
                color: [0xfbbf24, 0xfde68a, 0xa78bfa, 0xffffff][Math.floor(Math.random() * 4)],
                life: 0, maxLife: 15 + Math.random() * 10, gravity: 0,
              });
            }

            const coreAlpha = t * 0.6;
            for (let r = this.chargeRadius + 20; r > 0; r -= 3) {
              this.gfx.fillStyle(0xfbbf24, (1 - r / (this.chargeRadius + 20)) * coreAlpha * 0.15);
              this.gfx.fillCircle(cx, cy, r);
            }

            this.gfx.lineStyle(2, 0xa78bfa, t * 0.8);
            this.gfx.beginPath();
            for (let i = 0; i <= 32; i++) {
              const a = (i / 32) * Math.PI * 2 + this.elapsed * 0.012;
              const wobble = Math.sin(a * 4) * 3 * t;
              const px = cx + Math.cos(a) * (this.chargeRadius + wobble);
              const py = cy + Math.sin(a) * (this.chargeRadius + wobble);
              if (i === 0) this.gfx.moveTo(px, py); else this.gfx.lineTo(px, py);
            }
            this.gfx.strokePath();

            if (t >= 1) {
              this.phase = 1;
              this.flashAlpha = 1;
              this.elapsed = 0;
              this.shockWaves.push(
                { x: cx, y: cy, radius: 0, maxRadius: Math.min(sw, sh) * 0.45, alpha: 0.9, color: 0xfbbf24, lineWidth: 4 },
                { x: cx, y: cy, radius: 0, maxRadius: Math.min(sw, sh) * 0.35, alpha: 0.6, color: 0xa78bfa, lineWidth: 2 },
              );
              for (let i = 0; i < 35; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 6;
                this.particles.push({
                  x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  size: 2 + Math.random() * 3, alpha: 0.8 + Math.random() * 0.2,
                  color: [0xfbbf24, 0xfde68a, 0xffffff, 0xa78bfa, 0x7c3aed][Math.floor(Math.random() * 5)],
                  life: 0, maxLife: 20 + Math.random() * 20, gravity: 0.03,
                });
              }
              for (let i = 0; i < 16; i++) {
                this.sparks.push({
                  x: cx, y: cy, angle: (i / 16) * Math.PI * 2 + Math.random() * 0.2,
                  speed: 5 + Math.random() * 5, length: 10 + Math.random() * 15,
                  alpha: 1, color: Math.random() > 0.5 ? 0xfbbf24 : 0xffffff,
                  decay: 0.04 + Math.random() * 0.02,
                });
              }
            }
          }

          if (this.phase >= 1) {
            if (this.flashAlpha > 0) {
              this.gfx.fillStyle(0xffffff, this.flashAlpha * 0.4);
              this.gfx.fillRect(0, 0, sw, sh);
              this.flashAlpha -= 0.08 * dt;
            }
            for (let i = this.shockWaves.length - 1; i >= 0; i--) {
              const s = this.shockWaves[i];
              s.radius += 5 * dt; s.alpha -= 0.035 * dt;
              if (s.alpha <= 0 || s.radius >= s.maxRadius) { this.shockWaves.splice(i, 1); continue; }
              this.gfx.lineStyle(s.lineWidth, s.color, s.alpha);
              this.gfx.strokeCircle(s.x, s.y, s.radius);
              this.gfx.lineStyle(s.lineWidth + 4, s.color, s.alpha * 0.15);
              this.gfx.strokeCircle(s.x, s.y, s.radius);
            }
            for (let i = this.sparks.length - 1; i >= 0; i--) {
              const s = this.sparks[i];
              s.x += Math.cos(s.angle) * s.speed * dt;
              s.y += Math.sin(s.angle) * s.speed * dt;
              s.alpha -= s.decay * dt; s.speed *= 0.96;
              if (s.alpha <= 0) { this.sparks.splice(i, 1); continue; }
              this.gfx.lineStyle(2, s.color, s.alpha);
              this.gfx.beginPath();
              this.gfx.moveTo(s.x, s.y);
              this.gfx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
              this.gfx.strokePath();
            }
            if (this.elapsed > 150) {
              const glowAlpha = (1 - Math.min((this.elapsed - 150) / 500, 1)) * 0.3;
              for (let r = 40; r > 0; r -= 4) {
                this.gfx.fillStyle(0xfbbf24, (1 - r / 40) * glowAlpha);
                this.gfx.fillCircle(cx, cy, r);
              }
            }
            if (this.elapsed > 100 && this.elapsed < 600 && Math.random() < 0.3) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * 60, y: cy + 20,
                vx: (Math.random() - 0.5) * 0.5, vy: -(1.5 + Math.random() * 2.5),
                size: 1 + Math.random() * 2, alpha: 0.8,
                color: [0xfbbf24, 0xfde68a][Math.floor(Math.random() * 2)],
                life: 0, maxLife: 20 + Math.random() * 15, gravity: -0.01,
              });
            }
          }

          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life += dt;
            const lr = p.life / p.maxLife;
            let a = p.alpha;
            if (lr < 0.1) a *= lr / 0.1; else if (lr > 0.6) a *= (1 - lr) / 0.4;
            if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
            this.gfx.fillStyle(p.color, Math.max(0, a));
            this.gfx.fillCircle(p.x, p.y, p.size);
            if (p.size > 1.5) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.2));
              this.gfx.fillCircle(p.x, p.y, p.size * 2.5);
            }
          }

          if (this.phase >= 1 && this.elapsed > 900 && this.particles.length === 0 && this.sparks.length === 0 && this.shockWaves.length === 0) {
            onCompleteRef.current?.();
          }
        }
      }

      // 유지: 방어막이 충격을 흡수 — 파란 육각 실드가 나타나며 반짝이고 사라짐
      class EnhanceMaintainScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private elapsed = 0;
        private phase = 0;
        private flashAlpha = 0;
        private shieldAlpha = 0;
        private shieldHitAngle = 0;
        private ripples: { radius: number; alpha: number }[] = [];

        constructor() { super({ key: 'EnhanceMaintainScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0; this.phase = 0; this.flashAlpha = 0;
          this.shieldAlpha = 0; this.shieldHitAngle = Math.random() * Math.PI * 2;
          this.particles = []; this.ripples = [];
        }

        private drawHexShield(cx: number, cy: number, radius: number, alpha: number) {
          // Draw hexagonal shield panels
          for (let i = 0; i < 6; i++) {
            const a1 = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 6;
            const angleDiff = Math.abs(((a1 + a2) / 2) - this.shieldHitAngle);
            const hitGlow = Math.max(0, 1 - angleDiff / 1.5);
            const panelAlpha = alpha * (0.15 + hitGlow * 0.4);

            // Fill panel
            this.gfx.fillStyle(0x4a9eff, panelAlpha);
            this.gfx.beginPath();
            this.gfx.moveTo(cx, cy);
            this.gfx.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
            this.gfx.lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius);
            this.gfx.closePath();
            this.gfx.fillPath();

            // Edge glow
            this.gfx.lineStyle(2, 0x93c5fd, alpha * (0.5 + hitGlow * 0.5));
            this.gfx.beginPath();
            this.gfx.moveTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
            this.gfx.lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius);
            this.gfx.strokePath();
          }
        }

        update(_time: number, delta: number) {
          const sw = this.scale.width;
          const sh = this.scale.height;
          const cx = sw / 2;
          const cy = effectCenterY;
          const dt = delta / 16.67;
          this.elapsed += delta;
          this.gfx.clear();

          if (this.phase === 0) {
            const t = Math.min(this.elapsed / 300, 1);
            // Energy converging toward center
            if (Math.random() < 0.6 * t) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 90 + Math.random() * 50;
              this.particles.push({
                x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (4 + Math.random() * 2),
                vy: -Math.sin(angle) * (4 + Math.random() * 2),
                size: 1 + Math.random() * 1.5, alpha: 0.5 + Math.random() * 0.3,
                color: [0x4a9eff, 0x60a5fa, 0x93c5fd][Math.floor(Math.random() * 3)],
                life: 0, maxLife: 12 + Math.random() * 8, gravity: 0,
              });
            }

            // Growing shield preview
            this.shieldAlpha = t * 0.3;
            this.drawHexShield(cx, cy, 55 * t, this.shieldAlpha);

            if (t >= 1) {
              this.phase = 1; this.elapsed = 0; this.flashAlpha = 0.6;
              this.shieldAlpha = 1;
              // Impact ripples
              this.ripples.push({ radius: 0, alpha: 0.8 }, { radius: 0, alpha: 0.5 });
              // Shield deflect particles burst outward from hit point
              for (let i = 0; i < 15; i++) {
                const spread = this.shieldHitAngle + (Math.random() - 0.5) * 1.2;
                const speed = 2 + Math.random() * 4;
                this.particles.push({
                  x: cx + Math.cos(this.shieldHitAngle) * 55,
                  y: cy + Math.sin(this.shieldHitAngle) * 55,
                  vx: Math.cos(spread) * speed, vy: Math.sin(spread) * speed,
                  size: 1.5 + Math.random() * 2, alpha: 0.8,
                  color: [0x4a9eff, 0x93c5fd, 0xffffff][Math.floor(Math.random() * 3)],
                  life: 0, maxLife: 15 + Math.random() * 10, gravity: 0,
                });
              }
            }
          }

          if (this.phase >= 1) {
            // Blue flash
            if (this.flashAlpha > 0) {
              this.gfx.fillStyle(0x4a9eff, this.flashAlpha * 0.15);
              this.gfx.fillRect(0, 0, sw, sh);
              this.flashAlpha -= 0.06 * dt;
            }
            // Fading shield
            this.shieldAlpha = Math.max(0, 1 - this.elapsed / 600);
            if (this.shieldAlpha > 0) {
              this.drawHexShield(cx, cy, 55, this.shieldAlpha);
            }
            // Ripple rings expanding
            for (let i = this.ripples.length - 1; i >= 0; i--) {
              const r = this.ripples[i];
              r.radius += 3 * dt; r.alpha -= 0.03 * dt;
              if (r.alpha <= 0) { this.ripples.splice(i, 1); continue; }
              this.gfx.lineStyle(2, 0x93c5fd, r.alpha);
              this.gfx.strokeCircle(cx, cy, 55 + r.radius);
            }
          }

          // Draw particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life += dt;
            const lr = p.life / p.maxLife;
            let a = p.alpha;
            if (lr < 0.1) a *= lr / 0.1; else if (lr > 0.6) a *= (1 - lr) / 0.4;
            if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
            this.gfx.fillStyle(p.color, Math.max(0, a));
            this.gfx.fillCircle(p.x, p.y, p.size);
            if (p.size > 1.5) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.15));
              this.gfx.fillCircle(p.x, p.y, p.size * 2.5);
            }
          }

          if (this.phase >= 1 && this.elapsed > 700 && this.particles.length === 0 && this.ripples.length === 0) {
            onCompleteRef.current?.();
          }
        }
      }

      // 하락: 균열 + 충격 + 파편 낙하 — 아이템이 타격받아 깨지는 부정적 느낌
      class EnhanceDowngradeScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private cracks: CrackSegment[] = [];
        private elapsed = 0;
        private phase = 0;
        private shakeOffset = { x: 0, y: 0 };
        private flashAlpha = 0;

        constructor() { super({ key: 'EnhanceDowngradeScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0; this.phase = 0; this.flashAlpha = 0;
          this.particles = []; this.cracks = [];
          this.shakeOffset = { x: 0, y: 0 };
        }

        private generateCracks(cx: number, cy: number) {
          // 4갈래 짧은 균열 (파괴보다 적고 짧음)
          for (let b = 0; b < 4; b++) {
            let x = cx, y = cy;
            const baseAngle = (b / 4) * Math.PI * 2 + Math.random() * 0.6;
            const segs = 2 + Math.floor(Math.random() * 3);
            for (let s = 0; s < segs; s++) {
              const angle = baseAngle + (Math.random() - 0.5) * 0.7;
              const len = 12 + Math.random() * 20;
              const nx = x + Math.cos(angle) * len;
              const ny = y + Math.sin(angle) * len;
              this.cracks.push({ x1: x, y1: y, x2: nx, y2: ny, alpha: 1 });
              x = nx; y = ny;
            }
          }
        }

        update(_time: number, delta: number) {
          const sw = this.scale.width;
          const sh = this.scale.height;
          const cx = sw / 2;
          const cy = effectCenterY;
          const dt = delta / 16.67;
          this.elapsed += delta;
          this.gfx.clear();

          if (this.phase === 0) {
            // Phase 0: 불안정한 주황 에너지가 모여듦
            const t = Math.min(this.elapsed / 300, 1);
            const pulseScale = 1 + Math.sin(this.elapsed * 0.03) * 0.25 * t;
            for (let r = 45 * pulseScale; r > 0; r -= 3) {
              this.gfx.fillStyle(0xff8c00, (1 - r / (45 * pulseScale)) * t * 0.18);
              this.gfx.fillCircle(cx, cy, r);
            }

            // 떨리는 링
            this.gfx.lineStyle(2, 0xff8c00, t * 0.6);
            this.gfx.beginPath();
            for (let i = 0; i <= 32; i++) {
              const a = (i / 32) * Math.PI * 2 + this.elapsed * 0.01;
              const jitter = (Math.random() - 0.5) * 6 * t;
              const px = cx + Math.cos(a) * (40 + jitter);
              const py = cy + Math.sin(a) * (40 + jitter);
              if (i === 0) this.gfx.moveTo(px, py); else this.gfx.lineTo(px, py);
            }
            this.gfx.strokePath();

            // 수렴 파티클
            if (Math.random() < 0.5 * t) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 70 + Math.random() * 40;
              this.particles.push({
                x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (3 + Math.random() * 2),
                vy: -Math.sin(angle) * (3 + Math.random() * 2),
                size: 1 + Math.random() * 1.5, alpha: 0.5 + Math.random() * 0.3,
                color: [0xff8c00, 0xffa500, 0xcc7000][Math.floor(Math.random() * 3)],
                life: 0, maxLife: 12 + Math.random() * 8, gravity: 0,
              });
            }

            if (t >= 1) {
              this.phase = 1; this.elapsed = 0; this.flashAlpha = 0.7;
              this.generateCracks(cx, cy);

              // 충격 파티클 — 사방으로 튀어나감
              for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 15, y: cy + (Math.random() - 0.5) * 15,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  size: 1.5 + Math.random() * 2, alpha: 0.7 + Math.random() * 0.3,
                  color: [0xff8c00, 0xffa500, 0x777777, 0x555555][Math.floor(Math.random() * 4)],
                  life: 0, maxLife: 22 + Math.random() * 18, gravity: 0.06,
                });
              }

              // 파편 낙하 — 중력을 받아 아래로 떨어짐
              for (let i = 0; i < 12; i++) {
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 60, y: cy + (Math.random() - 0.5) * 25,
                  vx: (Math.random() - 0.5) * 2.5, vy: 0.5 + Math.random() * 2,
                  size: 2 + Math.random() * 3, alpha: 0.6,
                  color: [0x444444, 0x555555, 0x666666][Math.floor(Math.random() * 3)],
                  life: 0, maxLife: 28 + Math.random() * 18, gravity: 0.12,
                });
              }
            }
          }

          if (this.phase >= 1) {
            // 화면 흔들림 (파괴보다 약함)
            const shakeI = Math.max(0, 1 - this.elapsed / 400);
            this.shakeOffset.x = (Math.random() - 0.5) * 5 * shakeI;
            this.shakeOffset.y = (Math.random() - 0.5) * 5 * shakeI;
            this.cameras.main.setScroll(-this.shakeOffset.x, -this.shakeOffset.y);

            // 주황색 플래시
            if (this.flashAlpha > 0) {
              this.gfx.fillStyle(0xff8c00, this.flashAlpha * 0.3);
              this.gfx.fillRect(-10, -10, sw + 20, sh + 20);
              this.flashAlpha -= 0.07 * dt;
            }

            // 균열 렌더링
            for (const crack of this.cracks) {
              if (crack.alpha <= 0) continue;
              this.gfx.lineStyle(2, 0xff8c00, crack.alpha * 0.8);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              this.gfx.lineStyle(6, 0xff8c00, crack.alpha * 0.15);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              crack.alpha -= 0.02 * dt;
            }

            // 잔여 연기
            if (this.elapsed > 150 && this.elapsed < 500 && Math.random() < 0.15) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * 35, y: cy + 8,
                vx: (Math.random() - 0.5) * 0.3, vy: -(0.4 + Math.random() * 0.6),
                size: 2.5 + Math.random() * 3, alpha: 0.12 + Math.random() * 0.08,
                color: 0x444444, life: 0, maxLife: 20 + Math.random() * 12, gravity: -0.01,
              });
            }
          }

          // 파티클 렌더링
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life += dt;
            const lr = p.life / p.maxLife;
            let a = p.alpha;
            if (lr < 0.1) a *= lr / 0.1; else if (lr > 0.6) a *= (1 - lr) / 0.4;
            if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
            this.gfx.fillStyle(p.color, Math.max(0, a));
            this.gfx.fillCircle(p.x, p.y, p.size);
            if (p.size > 2) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.12));
              this.gfx.fillCircle(p.x, p.y, p.size * 2);
            }
          }

          if (this.phase >= 1 && this.elapsed > 750 && this.particles.length === 0) {
            this.cameras.main.setScroll(0, 0);
            onCompleteRef.current?.();
          }
        }
      }

      // 파괴: 격렬한 폭발 — 빨간 충격파, 균열, 파편이 사방으로 흩어짐
      class EnhanceDestroyScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private cracks: CrackSegment[] = [];
        private sparks: Spark[] = [];
        private shockWaves: ShockWave[] = [];
        private elapsed = 0;
        private phase = 0;
        private shakeOffset = { x: 0, y: 0 };
        private flashAlpha = 0;

        constructor() { super({ key: 'EnhanceDestroyScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0; this.phase = 0; this.flashAlpha = 0;
          this.particles = []; this.cracks = []; this.sparks = []; this.shockWaves = [];
          this.shakeOffset = { x: 0, y: 0 };
        }

        private generateCracks(cx: number, cy: number, branches: number) {
          for (let b = 0; b < branches; b++) {
            let x = cx, y = cy;
            const baseAngle = (b / branches) * Math.PI * 2 + Math.random() * 0.3;
            const segs = 4 + Math.floor(Math.random() * 5);
            for (let s = 0; s < segs; s++) {
              const angle = baseAngle + (Math.random() - 0.5) * 0.6;
              const len = 20 + Math.random() * 35;
              const nx = x + Math.cos(angle) * len;
              const ny = y + Math.sin(angle) * len;
              this.cracks.push({ x1: x, y1: y, x2: nx, y2: ny, alpha: 1 });
              x = nx; y = ny;
            }
          }
        }

        update(_time: number, delta: number) {
          const sw = this.scale.width;
          const sh = this.scale.height;
          const cx = sw / 2;
          const cy = effectCenterY;
          const dt = delta / 16.67;
          this.elapsed += delta;
          this.gfx.clear();

          if (this.phase === 0) {
            // Phase 0: violent charge, item about to break
            const t = Math.min(this.elapsed / 400, 1);
            const pulseScale = 1 + Math.sin(this.elapsed * 0.04) * 0.4 * t;
            for (let r = 60 * pulseScale; r > 0; r -= 3) {
              this.gfx.fillStyle(0xe94560, (1 - r / (60 * pulseScale)) * t * 0.25);
              this.gfx.fillCircle(cx, cy, r);
            }

            // Jagged unstable ring
            this.gfx.lineStyle(3, 0xe94560, t * 0.8);
            this.gfx.beginPath();
            for (let i = 0; i <= 32; i++) {
              const a = (i / 32) * Math.PI * 2 + this.elapsed * 0.012;
              const jitter = (Math.random() - 0.5) * 14 * t;
              const px = cx + Math.cos(a) * (45 + jitter);
              const py = cy + Math.sin(a) * (45 + jitter);
              if (i === 0) this.gfx.moveTo(px, py); else this.gfx.lineTo(px, py);
            }
            this.gfx.strokePath();

            // Fast converging red particles
            if (Math.random() < 0.7 * t) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 90 + Math.random() * 60;
              this.particles.push({
                x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (4 + Math.random() * 3),
                vy: -Math.sin(angle) * (4 + Math.random() * 3),
                size: 1 + Math.random() * 2, alpha: 0.6 + Math.random() * 0.4,
                color: [0xe94560, 0xc23152, 0xff4444, 0xff0000][Math.floor(Math.random() * 4)],
                life: 0, maxLife: 12 + Math.random() * 8, gravity: 0,
              });
            }

            if (t >= 1) {
              this.phase = 1; this.elapsed = 0; this.flashAlpha = 1;
              this.generateCracks(cx, cy, 8);

              // Big shockwaves
              this.shockWaves.push(
                { x: cx, y: cy, radius: 0, maxRadius: Math.min(sw, sh) * 0.5, alpha: 0.9, color: 0xe94560, lineWidth: 5 },
                { x: cx, y: cy, radius: 0, maxRadius: Math.min(sw, sh) * 0.4, alpha: 0.7, color: 0xff0000, lineWidth: 3 },
              );

              // Massive explosion particles
              for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 7;
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 20, y: cy + (Math.random() - 0.5) * 20,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  size: 2 + Math.random() * 4, alpha: 0.8 + Math.random() * 0.2,
                  color: [0xe94560, 0xff0000, 0xc23152, 0x888888, 0x333333][Math.floor(Math.random() * 5)],
                  life: 0, maxLife: 30 + Math.random() * 25, gravity: 0.1,
                });
              }

              // Sparks flying outward
              for (let i = 0; i < 20; i++) {
                this.sparks.push({
                  x: cx, y: cy, angle: (i / 20) * Math.PI * 2 + Math.random() * 0.3,
                  speed: 6 + Math.random() * 6, length: 12 + Math.random() * 20,
                  alpha: 1, color: Math.random() > 0.5 ? 0xe94560 : 0xff4444,
                  decay: 0.035 + Math.random() * 0.02,
                });
              }

              // Heavy falling debris
              for (let i = 0; i < 20; i++) {
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 100, y: cy + (Math.random() - 0.5) * 40,
                  vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 3,
                  size: 2.5 + Math.random() * 4, alpha: 0.7,
                  color: [0x333333, 0x444444, 0x555555, 0x222222][Math.floor(Math.random() * 4)],
                  life: 0, maxLife: 35 + Math.random() * 25, gravity: 0.15,
                });
              }
            }
          }

          if (this.phase >= 1) {
            // Strong screen shake
            const shakeI = Math.max(0, 1 - this.elapsed / 700);
            this.shakeOffset.x = (Math.random() - 0.5) * 12 * shakeI;
            this.shakeOffset.y = (Math.random() - 0.5) * 12 * shakeI;
            this.cameras.main.setScroll(-this.shakeOffset.x, -this.shakeOffset.y);

            // Bright red flash
            if (this.flashAlpha > 0) {
              this.gfx.fillStyle(0xe94560, this.flashAlpha * 0.5);
              this.gfx.fillRect(-20, -20, sw + 40, sh + 40);
              this.flashAlpha -= 0.06 * dt;
            }

            // Cracks with red glow
            for (const crack of this.cracks) {
              if (crack.alpha <= 0) continue;
              this.gfx.lineStyle(3, 0xe94560, crack.alpha * 0.9);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              this.gfx.lineStyle(10, 0xe94560, crack.alpha * 0.2);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              crack.alpha -= 0.012 * dt;
            }

            // Shockwaves
            for (let i = this.shockWaves.length - 1; i >= 0; i--) {
              const s = this.shockWaves[i];
              s.radius += 5 * dt; s.alpha -= 0.03 * dt;
              if (s.alpha <= 0 || s.radius >= s.maxRadius) { this.shockWaves.splice(i, 1); continue; }
              this.gfx.lineStyle(s.lineWidth, s.color, s.alpha);
              this.gfx.strokeCircle(s.x, s.y, s.radius);
              this.gfx.lineStyle(s.lineWidth + 6, s.color, s.alpha * 0.15);
              this.gfx.strokeCircle(s.x, s.y, s.radius);
            }

            // Sparks
            for (let i = this.sparks.length - 1; i >= 0; i--) {
              const s = this.sparks[i];
              s.x += Math.cos(s.angle) * s.speed * dt;
              s.y += Math.sin(s.angle) * s.speed * dt;
              s.alpha -= s.decay * dt; s.speed *= 0.96;
              if (s.alpha <= 0) { this.sparks.splice(i, 1); continue; }
              this.gfx.lineStyle(2, s.color, s.alpha);
              this.gfx.beginPath();
              this.gfx.moveTo(s.x, s.y);
              this.gfx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
              this.gfx.strokePath();
            }

            // Thick dark smoke rising
            if (this.elapsed > 150 && this.elapsed < 800 && Math.random() < 0.4) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * 60, y: cy + 15,
                vx: (Math.random() - 0.5) * 0.5, vy: -(0.8 + Math.random() * 1.5),
                size: 4 + Math.random() * 6, alpha: 0.2 + Math.random() * 0.15,
                color: [0x333333, 0x444444, 0x222222][Math.floor(Math.random() * 3)],
                life: 0, maxLife: 30 + Math.random() * 20, gravity: -0.02,
              });
            }
          }

          // Draw particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life += dt;
            const lr = p.life / p.maxLife;
            let a = p.alpha;
            if (lr < 0.1) a *= lr / 0.1; else if (lr > 0.6) a *= (1 - lr) / 0.4;
            if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
            this.gfx.fillStyle(p.color, Math.max(0, a));
            this.gfx.fillCircle(p.x, p.y, p.size);
            if (p.size > 2) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.15));
              this.gfx.fillCircle(p.x, p.y, p.size * 2.5);
            }
          }

          if (this.phase >= 1 && this.elapsed > 1100 && this.particles.length === 0 && this.sparks.length === 0 && this.shockWaves.length === 0) {
            this.cameras.main.setScroll(0, 0);
            onCompleteRef.current?.();
          }
        }
      }

      class EnhanceEnhancingScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private elapsed = 0;
        private orbitAngle = 0;

        constructor() { super({ key: 'EnhanceEnhancingScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0;
          this.orbitAngle = 0;
          this.particles = [];
        }

        update(_time: number, delta: number) {
          const sw = this.scale.width;
          const cx = sw / 2;
          const cy = effectCenterY;
          const dt = delta / 16.67;
          this.elapsed += delta;
          this.orbitAngle += 0.04 * dt;
          this.gfx.clear();

          // Pulsing core glow
          const pulse = 0.5 + Math.sin(this.elapsed * 0.006) * 0.3;
          const coreRadius = 35 + Math.sin(this.elapsed * 0.008) * 8;
          for (let r = coreRadius + 25; r > 0; r -= 3) {
            this.gfx.fillStyle(0xa78bfa, (1 - r / (coreRadius + 25)) * pulse * 0.18);
            this.gfx.fillCircle(cx, cy, r);
          }

          // Rotating energy ring
          const ringRadius = 55 + Math.sin(this.elapsed * 0.005) * 5;
          this.gfx.lineStyle(2, 0xa78bfa, 0.5);
          this.gfx.beginPath();
          for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 2 + this.orbitAngle;
            const wobble = Math.sin(a * 6 + this.elapsed * 0.01) * 4;
            const px = cx + Math.cos(a) * (ringRadius + wobble);
            const py = cy + Math.sin(a) * (ringRadius + wobble);
            if (i === 0) this.gfx.moveTo(px, py); else this.gfx.lineTo(px, py);
          }
          this.gfx.strokePath();

          // Orbiting energy particles (3 orbs)
          for (let i = 0; i < 3; i++) {
            const orbAngle = this.orbitAngle * 1.5 + (i / 3) * Math.PI * 2;
            const orbX = cx + Math.cos(orbAngle) * ringRadius;
            const orbY = cy + Math.sin(orbAngle) * ringRadius;
            this.gfx.fillStyle(0xfbbf24, 0.9);
            this.gfx.fillCircle(orbX, orbY, 3);
            this.gfx.fillStyle(0xfbbf24, 0.15);
            this.gfx.fillCircle(orbX, orbY, 8);
          }

          // Converging particles from outside
          if (Math.random() < 0.6) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 60;
            this.particles.push({
              x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
              vx: -Math.cos(angle) * (2.5 + Math.random() * 2),
              vy: -Math.sin(angle) * (2.5 + Math.random() * 2),
              size: 1 + Math.random() * 1.5, alpha: 0.4 + Math.random() * 0.3,
              color: [0xa78bfa, 0x7c3aed, 0xfbbf24, 0xfde68a][Math.floor(Math.random() * 4)],
              life: 0, maxLife: 18 + Math.random() * 12, gravity: 0,
            });
          }

          // Rising sparkles
          if (Math.random() < 0.3) {
            this.particles.push({
              x: cx + (Math.random() - 0.5) * 50, y: cy + 30,
              vx: (Math.random() - 0.5) * 0.5, vy: -(1 + Math.random() * 1.5),
              size: 1 + Math.random() * 1, alpha: 0.5,
              color: [0xa78bfa, 0xfbbf24][Math.floor(Math.random() * 2)],
              life: 0, maxLife: 15 + Math.random() * 10, gravity: -0.01,
            });
          }

          // Draw particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life += dt;
            const lr = p.life / p.maxLife;
            let a = p.alpha;
            if (lr < 0.1) a *= lr / 0.1; else if (lr > 0.6) a *= (1 - lr) / 0.4;
            if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
            this.gfx.fillStyle(p.color, Math.max(0, a));
            this.gfx.fillCircle(p.x, p.y, p.size);
            if (p.size > 1.2) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.2));
              this.gfx.fillCircle(p.x, p.y, p.size * 2.5);
            }
          }
        }
      }

      const sceneMap = {
        success: { cls: EnhanceSuccessScene, key: 'EnhanceSuccessScene' },
        maintain: { cls: EnhanceMaintainScene, key: 'EnhanceMaintainScene' },
        downgrade: { cls: EnhanceDowngradeScene, key: 'EnhanceDowngradeScene' },
        destroy: { cls: EnhanceDestroyScene, key: 'EnhanceDestroyScene' },
        enhancing: { cls: EnhanceEnhancingScene, key: 'EnhanceEnhancingScene' },
      } as const;
      const SceneClass = sceneMap[type].cls;
      const sceneKey = sceneMap[type].key;

      const game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: container,
        width: w,
        height: h,
        transparent: true,
        scene: SceneClass,
        fps: { target: 60, forceSetTimeOut: true },
        banner: false,
        audio: { noAudio: true },
        input: { mouse: false, touch: false, keyboard: false },
      });

      game.scene.start(sceneKey);
      gameRef.current = game;
    })();

    return () => {
      destroyed = true;
      const game = gameRef.current as { destroy: (removeCanvas: boolean) => void } | null;
      if (game && typeof game === 'object' && 'destroy' in game) {
        game.destroy(true);
      }
      gameRef.current = null;
    };
  }, [type, centerY]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    />
  );
}
