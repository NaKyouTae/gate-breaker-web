/** 강화석 설정 */
export interface EnhanceStoneConfig {
  grade: number;
  name: string;
  bonusRate: number;
  color: string;
  glow: string;
}

export const ENHANCE_STONES: EnhanceStoneConfig[] = [
  { grade: 1, name: '균열의 강화석', bonusRate: 1, color: '#94a3b8', glow: 'rgba(148,163,184,0.3)' },
  { grade: 2, name: '빛나는 강화석', bonusRate: 2, color: '#4a9eff', glow: 'rgba(74,158,255,0.3)' },
  { grade: 3, name: '고대의 강화석', bonusRate: 3, color: '#b048f8', glow: 'rgba(176,72,248,0.3)' },
  { grade: 4, name: '심연의 강화석', bonusRate: 4, color: '#ff8c00', glow: 'rgba(255,140,0,0.3)' },
  { grade: 5, name: '용의 강화석',   bonusRate: 5, color: '#ff2d55', glow: 'rgba(255,45,85,0.3)' },
];

/** 아이템 이름으로 강화석 설정 찾기 */
export function getStoneConfig(itemName: string): EnhanceStoneConfig | undefined {
  return ENHANCE_STONES.find((s) => s.name === itemName);
}

/** 아이템이 강화석인지 판별 */
export function isEnhanceStone(itemName: string): boolean {
  return ENHANCE_STONES.some((s) => s.name === itemName);
}

/** 던전 인덱스(0-based)에 해당하는 강화석 */
export function getStoneForDungeonIndex(index: number): EnhanceStoneConfig | undefined {
  return ENHANCE_STONES[index];
}
