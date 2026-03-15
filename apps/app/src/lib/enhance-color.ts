const ENHANCE_COLOR_TIERS = [
  { minLevel: 0, maxLevel: 4, color: '#ddd', glow: 'rgba(200,200,200,0.3)' },
  { minLevel: 5, maxLevel: 9, color: '#4a9eff', glow: 'rgba(74,158,255,0.4)' },
  { minLevel: 10, maxLevel: 14, color: '#b048f8', glow: 'rgba(176,72,248,0.4)' },
  { minLevel: 15, maxLevel: 19, color: '#ff8c00', glow: 'rgba(255,140,0,0.5)' },
  { minLevel: 20, maxLevel: 20, color: '#ff2d55', glow: 'rgba(255,45,85,0.5)' },
] as const;

const DEFAULT_TIER = ENHANCE_COLOR_TIERS[0];

export function getEnhanceColor(enhanceLevel: number): { color: string; glow: string } {
  return ENHANCE_COLOR_TIERS.find(
    (t) => enhanceLevel >= t.minLevel && enhanceLevel <= t.maxLevel,
  ) ?? DEFAULT_TIER;
}
