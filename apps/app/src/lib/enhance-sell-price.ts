const BASE_GOLD = 100;
const PER_LEVEL = 1.5;

/** 강화 확률 테이블 (%) — enhance-view.tsx ENHANCE_GRADE_TABLE과 동일 */
const RATES: { successRate: number; downgradeRate: number; destroyRate: number }[] = [
  { successRate: 100, downgradeRate: 0,  destroyRate: 0 }, // 0→1
  { successRate: 95,  downgradeRate: 0,  destroyRate: 0 }, // 1→2
  { successRate: 90,  downgradeRate: 0,  destroyRate: 0 }, // 2→3
  { successRate: 85,  downgradeRate: 0,  destroyRate: 0 }, // 3→4
  { successRate: 75,  downgradeRate: 0,  destroyRate: 0 }, // 4→5
  { successRate: 65,  downgradeRate: 0,  destroyRate: 0 }, // 5→6
  { successRate: 55,  downgradeRate: 0,  destroyRate: 0 }, // 6→7
  { successRate: 45,  downgradeRate: 0,  destroyRate: 0 }, // 7→8
  { successRate: 40,  downgradeRate: 0,  destroyRate: 0 }, // 8→9
  { successRate: 35,  downgradeRate: 0,  destroyRate: 0 }, // 9→10
  { successRate: 36,  downgradeRate: 24, destroyRate: 0 }, // 10→11
  { successRate: 31,  downgradeRate: 31, destroyRate: 0 }, // 11→12
  { successRate: 26,  downgradeRate: 39, destroyRate: 0 }, // 12→13
  { successRate: 23,  downgradeRate: 44, destroyRate: 0 }, // 13→14
  { successRate: 21,  downgradeRate: 49, destroyRate: 0 }, // 14→15
  { successRate: 19,  downgradeRate: 46, destroyRate: 1 }, // 15→16
  { successRate: 17,  downgradeRate: 51, destroyRate: 2 }, // 16→17
  { successRate: 14,  downgradeRate: 57, destroyRate: 3 }, // 17→18
  { successRate: 11,  downgradeRate: 61, destroyRate: 4 }, // 18→19
  { successRate: 9,   downgradeRate: 65, destroyRate: 5 }, // 19→20
];

/** 레벨별 누적 기대 비용 (캐시) */
let cachedCumulativeCosts: number[] | null = null;

function buildCumulativeCosts(): number[] {
  if (cachedCumulativeCosts) return cachedCumulativeCosts;

  const stepCosts: number[] = [];
  const cumulative: number[] = [0]; // C(0) = 0

  for (let n = 0; n < RATES.length; n++) {
    const cost = Math.floor(BASE_GOLD * Math.pow(PER_LEVEL, n));
    const { successRate, downgradeRate, destroyRate } = RATES[n];
    const s = successRate / 100;
    const d = downgradeRate / 100;
    const k = destroyRate / 100;

    const prevStep = n > 0 ? stepCosts[n - 1] : 0;
    // E(n) = (cost + d*E(n-1) + k*C(n)) / s
    const stepCost = (cost + d * prevStep + k * cumulative[n]) / s;

    stepCosts.push(stepCost);
    cumulative.push(cumulative[n] + stepCost);
  }

  cachedCumulativeCosts = cumulative;
  return cumulative;
}

/**
 * 강화 레벨에 따른 판매 가격 계산
 * 기대 강화 비용의 20% (10분의 2)
 */
export function getEnhanceSellPrice(enhanceLevel: number): number {
  if (enhanceLevel <= 0) return 0;
  const cumulative = buildCumulativeCosts();
  const idx = Math.min(enhanceLevel, cumulative.length - 1);
  return Math.floor(cumulative[idx] * 0.2);
}
