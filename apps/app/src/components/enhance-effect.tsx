'use client';

import { useEffect, useRef } from 'react';

export type EnhanceEffectType = 'success' | 'failure' | 'enhancing';

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

      class EnhanceFailureScene extends Phaser.Scene {
        private gfx!: Phaser.GameObjects.Graphics;
        private particles: Particle[] = [];
        private cracks: CrackSegment[] = [];
        private elapsed = 0;
        private phase = 0;
        private shakeOffset = { x: 0, y: 0 };
        private flashAlpha = 0;

        constructor() { super({ key: 'EnhanceFailureScene' }); }

        create() {
          this.gfx = this.add.graphics();
          this.elapsed = 0; this.phase = 0; this.flashAlpha = 0;
          this.particles = []; this.cracks = [];
          this.shakeOffset = { x: 0, y: 0 };
        }

        private generateCracks(cx: number, cy: number, branches: number) {
          for (let b = 0; b < branches; b++) {
            let x = cx, y = cy;
            const baseAngle = (b / branches) * Math.PI * 2 + Math.random() * 0.5;
            const segs = 3 + Math.floor(Math.random() * 4);
            for (let s = 0; s < segs; s++) {
              const angle = baseAngle + (Math.random() - 0.5) * 0.8;
              const len = 15 + Math.random() * 25;
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
            const t = Math.min(this.elapsed / 300, 1);
            const pulseScale = 1 + Math.sin(this.elapsed * 0.03) * 0.3 * t;
            for (let r = 50 * pulseScale; r > 0; r -= 3) {
              this.gfx.fillStyle(0xe94560, (1 - r / (50 * pulseScale)) * t * 0.2);
              this.gfx.fillCircle(cx, cy, r);
            }
            this.gfx.lineStyle(2, 0xe94560, t * 0.6);
            this.gfx.beginPath();
            for (let i = 0; i <= 32; i++) {
              const a = (i / 32) * Math.PI * 2 + this.elapsed * 0.009;
              const jitter = (Math.random() - 0.5) * 8 * t;
              const px = cx + Math.cos(a) * (40 + jitter);
              const py = cy + Math.sin(a) * (40 + jitter);
              if (i === 0) this.gfx.moveTo(px, py); else this.gfx.lineTo(px, py);
            }
            this.gfx.strokePath();

            if (Math.random() < 0.5 * t) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 70 + Math.random() * 50;
              this.particles.push({
                x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (3 + Math.random() * 2),
                vy: -Math.sin(angle) * (3 + Math.random() * 2),
                size: 1 + Math.random() * 1.5, alpha: 0.5 + Math.random() * 0.3,
                color: [0xe94560, 0xc23152, 0xff6b6b][Math.floor(Math.random() * 3)],
                life: 0, maxLife: 12 + Math.random() * 8, gravity: 0,
              });
            }

            if (t >= 1) {
              this.phase = 1; this.elapsed = 0; this.flashAlpha = 0.8;
              this.generateCracks(cx, cy, 5);
              for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 20, y: cy + (Math.random() - 0.5) * 20,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  size: 1.5 + Math.random() * 2.5, alpha: 0.7 + Math.random() * 0.3,
                  color: [0xe94560, 0xc23152, 0x888888, 0x555555][Math.floor(Math.random() * 4)],
                  life: 0, maxLife: 25 + Math.random() * 20, gravity: 0.08,
                });
              }
              for (let i = 0; i < 10; i++) {
                this.particles.push({
                  x: cx + (Math.random() - 0.5) * 80, y: cy + (Math.random() - 0.5) * 30,
                  vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random() * 2,
                  size: 2 + Math.random() * 3, alpha: 0.6,
                  color: [0x444444, 0x666666, 0x333333][Math.floor(Math.random() * 3)],
                  life: 0, maxLife: 30 + Math.random() * 20, gravity: 0.1,
                });
              }
            }
          }

          if (this.phase >= 1) {
            const shakeI = Math.max(0, 1 - this.elapsed / 500);
            this.shakeOffset.x = (Math.random() - 0.5) * 6 * shakeI;
            this.shakeOffset.y = (Math.random() - 0.5) * 6 * shakeI;
            this.cameras.main.setScroll(-this.shakeOffset.x, -this.shakeOffset.y);

            if (this.flashAlpha > 0) {
              this.gfx.fillStyle(0xe94560, this.flashAlpha * 0.3);
              this.gfx.fillRect(-10, -10, sw + 20, sh + 20);
              this.flashAlpha -= 0.07 * dt;
            }
            for (const crack of this.cracks) {
              if (crack.alpha <= 0) continue;
              this.gfx.lineStyle(2, 0xe94560, crack.alpha * 0.8);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              this.gfx.lineStyle(6, 0xe94560, crack.alpha * 0.15);
              this.gfx.beginPath(); this.gfx.moveTo(crack.x1, crack.y1); this.gfx.lineTo(crack.x2, crack.y2); this.gfx.strokePath();
              crack.alpha -= 0.015 * dt;
            }
            if (this.elapsed > 200 && this.elapsed < 600 && Math.random() < 0.2) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * 40, y: cy + 10,
                vx: (Math.random() - 0.5) * 0.3, vy: -(0.5 + Math.random() * 0.8),
                size: 3 + Math.random() * 4, alpha: 0.15 + Math.random() * 0.1,
                color: 0x444444, life: 0, maxLife: 25 + Math.random() * 15, gravity: -0.01,
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
            if (p.size > 2) {
              this.gfx.fillStyle(p.color, Math.max(0, a * 0.15));
              this.gfx.fillCircle(p.x, p.y, p.size * 2);
            }
          }

          if (this.phase >= 1 && this.elapsed > 800 && this.particles.length === 0) {
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
        failure: { cls: EnhanceFailureScene, key: 'EnhanceFailureScene' },
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
