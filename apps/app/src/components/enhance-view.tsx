'use client';

import { useCallback, useRef, useState } from 'react';
import { enhance } from '@gate-breaker/api-client';
import type { EnhanceInfo, EnhanceResult, InventoryItem, ItemRarity } from '@gate-breaker/types';
import { Badge, Spinner } from '@gate-breaker/ui';
import { EnhanceEffect, type EnhanceEffectType } from '@/components/enhance-effect';
import { FullscreenOverlay } from '@/components/fullscreen-overlay';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};

const RARITY_GLOW: Record<ItemRarity, string> = {
  COMMON: 'rgba(136,136,136,0.3)',
  RARE: 'rgba(74,158,255,0.4)',
  EPIC: 'rgba(176,72,248,0.4)',
  LEGENDARY: 'rgba(255,140,0,0.5)',
  MYTHIC: 'rgba(255,45,85,0.5)',
};

function formatFailurePenalty(penalty: string, currentLevel: number): string {
  if (penalty === 'none') return `+${currentLevel}`;
  const match = penalty.match(/downgrade[_\s]*(\d+)/i);
  if (match) return `-${match[1]}`;
  if (penalty.toLowerCase() === 'destroy') return '파괴';
  return penalty;
}

interface EnhanceViewProps {
  item: InventoryItem;
  gold?: number;
  onClose: () => void;
  onComplete: (result: EnhanceResult, updatedInfo: EnhanceInfo | null) => void;
}

export function EnhanceView({ item, gold, onClose, onComplete }: EnhanceViewProps) {
  const [enhanceInfo, setEnhanceInfo] = useState<EnhanceInfo | null>(null);
  const [enhanceItem, setEnhanceItem] = useState<InventoryItem>(item);
  const [enhancing, setEnhancing] = useState(false);
  const [effectType, setEffectType] = useState<EnhanceEffectType | null>(null);
  const [infoError, setInfoError] = useState(false);
  const pendingResultRef = useRef<EnhanceResult | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [effectCenterY, setEffectCenterY] = useState<number | undefined>(undefined);

  const fetchInfo = useCallback(async (inventoryId: string) => {
    try {
      const data = await enhance.info(inventoryId);
      setEnhanceInfo(data);
      return data;
    } catch {
      setInfoError(true);
      return null;
    }
  }, []);

  // Fetch info on mount
  useState(() => {
    fetchInfo(item.id);
  });

  const handleEnhance = async () => {
    setEnhancing(true);
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setEffectCenterY(rect.top + rect.height / 2);
    }
    try {
      const result = await enhance.enhance(enhanceItem.id);
      pendingResultRef.current = result;
      setEffectType(result.success ? 'success' : 'failure');
    } catch {
      setEnhancing(false);
    }
  };

  const handleEffectComplete = async () => {
    const result = pendingResultRef.current;
    setEffectType(null);
    if (result) {
      pendingResultRef.current = null;
    }
    const updatedInfo = await fetchInfo(enhanceItem.id);
    if (updatedInfo) {
      setEnhanceItem((prev) => ({ ...prev, enhanceLevel: updatedInfo.currentLevel }));
    }
    if (result) {
      onComplete(result, updatedInfo);
    }
    setEnhancing(false);
  };

  const rarityColor = RARITY_COLORS[enhanceItem.item.rarity];
  const rarityGlow = RARITY_GLOW[enhanceItem.item.rarity];

  return (
    <FullscreenOverlay>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0a0a14 0%, #0e0e1a 30%, #12101f 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {effectType && (
          <EnhanceEffect type={effectType} onComplete={handleEffectComplete} centerY={effectCenterY} />
        )}

        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          flexShrink: 0,
          position: 'relative',
          zIndex: 101,
        }}>
          {gold !== undefined && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#fbbf24',
              fontSize: 14,
              fontWeight: 700,
            }}>
              💰 {gold.toLocaleString()} G
            </div>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => !enhancing && onClose()}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 22,
              cursor: enhancing ? 'default' : 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              opacity: enhancing ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 101,
          overflow: 'hidden',
          padding: '0 24px',
        }}>
          {/* Equipment icon + name + level */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <div
              ref={iconRef}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${rarityGlow} 0%, transparent 70%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${rarityColor}`,
                opacity: 0.3,
              }} />
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(15, 15, 23, 0.9)',
                border: `2px solid ${rarityColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 30px ${rarityGlow}, inset 0 0 20px rgba(0,0,0,0.5)`,
                overflow: 'hidden',
              }}>
                {enhanceItem.item.imageUrl ? (
                  <img
                    src={enhanceItem.item.imageUrl}
                    alt={enhanceItem.item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 10, color: '#667085' }}>IMG</span>
                )}
              </div>
            </div>

            <div style={{
              color: rarityColor,
              fontSize: '1.2rem',
              fontWeight: 800,
              marginTop: 12,
              letterSpacing: '0.5px',
              textShadow: `0 0 20px ${rarityGlow}`,
            }}>
              {enhanceItem.item.name}
            </div>
            <div style={{
              color: '#eee',
              fontSize: '1.6rem',
              fontWeight: 900,
              marginTop: 2,
              letterSpacing: '2px',
            }}>
              +{enhanceItem.enhanceLevel}
            </div>
            {enhanceItem.isEquipped && (
              <div style={{ marginTop: 4 }}>
                <Badge variant="success">장착중</Badge>
              </div>
            )}
          </div>

          {/* Enhancement info + stat changes */}
          {infoError ? (
            <div style={{ color: '#e94560', fontSize: 14 }}>강화 정보를 불러오지 못했습니다.</div>
          ) : !enhanceInfo ? (
            <Spinner />
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              gap: 10,
            }}>
              {/* Left: enhancement info */}
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                padding: '8px 14px',
              }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 600 }}>강화 정보</div>
                {[
                  { label: '확률', value: `${enhanceInfo.successRate}%`, color: '#a78bfa' },
                  { label: '성공', value: `+${enhanceInfo.nextLevel ?? enhanceInfo.currentLevel}`, color: '#2ecc71' },
                  { label: '실패', value: formatFailurePenalty(enhanceInfo.failurePenalty, enhanceInfo.currentLevel), color: '#e94560' },
                ].map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <span style={{ color: '#999', fontSize: 13 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 15, fontWeight: 800 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Right: stat changes */}
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                padding: '8px 14px',
              }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 600 }}>능력치 변화</div>
                {(() => {
                  const itm = enhanceItem.item;
                  const curLevel = enhanceInfo.currentLevel;
                  const nxtLevel = enhanceInfo.nextLevel ?? curLevel + 1;
                  const stats = itm.type === 'WEAPON'
                    ? [{ label: 'ATK', color: '#e94560', cur: itm.baseAttack + curLevel, nxt: itm.baseAttack + nxtLevel }]
                    : [
                        { label: 'ATK', color: '#e94560', cur: itm.baseAttack + curLevel, nxt: itm.baseAttack + nxtLevel },
                        { label: 'DEF', color: '#4a9eff', cur: itm.baseDefense + curLevel, nxt: itm.baseDefense + nxtLevel },
                        { label: 'HP', color: '#2ecc71', cur: itm.baseHp + curLevel, nxt: itm.baseHp + nxtLevel },
                      ];
                  return stats.map((s, idx) => (
                    <div
                      key={s.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: idx < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}
                    >
                      <span style={{ color: '#999', fontSize: 13 }}>{s.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>
                        <span style={{ color: s.color }}>{s.cur}</span>
                        <span style={{ color: '#666', margin: '0 4px', fontSize: 12 }}>→</span>
                        <span style={{ color: '#2ecc71' }}>{s.nxt}</span>
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* 필요 골드 */}
          {enhanceInfo && (
            <div style={{
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
            }}>
              <span style={{ color: '#999', fontSize: 12, fontWeight: 600 }}>필요 골드</span>
              <span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 800 }}>💰 {enhanceInfo.cost.toLocaleString()} G</span>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        {enhanceInfo && (
          <div style={{
            flexShrink: 0,
            padding: '16px 24px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            position: 'relative',
            zIndex: 101,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 400,
              margin: '0 auto',
            }}>
              <button
                className="btn-action primary"
                onClick={handleEnhance}
                disabled={enhancing}
                style={{
                  width: '100%',
                  padding: '18px 0',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  boxShadow: enhancing
                    ? 'none'
                    : '0 4px 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(167, 139, 250, 0.15)',
                }}
              >
                {enhancing ? '강화 중...' : '강화 시도'}
              </button>
            </div>
          </div>
        )}
      </div>
    </FullscreenOverlay>
  );
}
