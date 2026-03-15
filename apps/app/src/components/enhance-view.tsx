'use client';

import React, { useCallback, useRef, useState } from 'react';
import { enhance } from '@gate-breaker/api-client';
import type { EnhanceInfo, EnhanceResult, InventoryItem } from '@gate-breaker/types';
import { Badge, Spinner } from '@gate-breaker/ui';
import { EnhanceEffect, type EnhanceEffectType } from '@/components/enhance-effect';
import { FullscreenOverlay } from '@/components/fullscreen-overlay';
import { getEnhanceColor } from '@/lib/enhance-color';
import { ENHANCE_STONES, getStoneConfig } from '@/lib/enhance-stone';

/** 강화 등급표 — enhance.defaults.ts 와 동기화 */
const ENHANCE_GRADE_TABLE: { level: number; successRate: number; maintainRate: number; downgradeRate: number; destroyRate: number }[] = [
  { level: 1,  successRate: 95,  maintainRate: 5,  downgradeRate: 0,  destroyRate: 0 },
  { level: 2,  successRate: 80,  maintainRate: 20, downgradeRate: 0,  destroyRate: 0 },
  { level: 3,  successRate: 70,  maintainRate: 30, downgradeRate: 0,  destroyRate: 0 },
  { level: 4,  successRate: 60,  maintainRate: 40, downgradeRate: 0,  destroyRate: 0 },
  { level: 5,  successRate: 50,  maintainRate: 50, downgradeRate: 0,  destroyRate: 0 },
  { level: 6,  successRate: 40,  maintainRate: 60, downgradeRate: 0,  destroyRate: 0 },
  { level: 7,  successRate: 30,  maintainRate: 70, downgradeRate: 0,  destroyRate: 0 },
  { level: 8,  successRate: 25,  maintainRate: 75, downgradeRate: 0,  destroyRate: 0 },
  { level: 9,  successRate: 20,  maintainRate: 80, downgradeRate: 0,  destroyRate: 0 },
  { level: 10, successRate: 15,  maintainRate: 85, downgradeRate: 0,  destroyRate: 0 },
  { level: 11, successRate: 20,  maintainRate: 50, downgradeRate: 30, destroyRate: 0 },
  { level: 12, successRate: 17,  maintainRate: 45, downgradeRate: 38, destroyRate: 0 },
  { level: 13, successRate: 14,  maintainRate: 40, downgradeRate: 46, destroyRate: 0 },
  { level: 14, successRate: 11,  maintainRate: 37, downgradeRate: 52, destroyRate: 0 },
  { level: 15, successRate: 9,   maintainRate: 33, downgradeRate: 58, destroyRate: 0 },
  { level: 16, successRate: 7,   maintainRate: 30, downgradeRate: 63, destroyRate: 0 },
  { level: 17, successRate: 5,   maintainRate: 25, downgradeRate: 70, destroyRate: 0 },
  { level: 18, successRate: 4,   maintainRate: 21, downgradeRate: 72, destroyRate: 3 },
  { level: 19, successRate: 3,   maintainRate: 17, downgradeRate: 76, destroyRate: 4 },
  { level: 20, successRate: 2,   maintainRate: 13, downgradeRate: 80, destroyRate: 5 },
];

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
  stones?: InventoryItem[];
  onClose: () => void;
  onComplete: (result: EnhanceResult, updatedInfo: EnhanceInfo | null) => void;
}

export function EnhanceView({ item, gold, stones = [], onClose, onComplete }: EnhanceViewProps) {
  const [enhanceInfo, setEnhanceInfo] = useState<EnhanceInfo | null>(null);
  const [enhanceItem, setEnhanceItem] = useState<InventoryItem>(item);
  const [enhancing, setEnhancing] = useState(false);
  const [effectType, setEffectType] = useState<EnhanceEffectType | null>(null);
  const [infoError, setInfoError] = useState(false);
  const pendingResultRef = useRef<EnhanceResult | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [effectCenterY, setEffectCenterY] = useState<number | undefined>(undefined);
  const [showGradeTable, setShowGradeTable] = useState(false);
  const [selectedStoneId, setSelectedStoneId] = useState<string | null>(null);

  const selectedStone = stones.find((s) => s.id === selectedStoneId) ?? null;
  const selectedStoneConfig = selectedStone ? getStoneConfig(selectedStone.item.name) : null;

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
    setEffectType('enhancing');
    try {
      const [result] = await Promise.all([
        enhance.enhance(enhanceItem.id, selectedStone?.id),
        new Promise((r) => setTimeout(r, 700)),
      ]);
      pendingResultRef.current = result;
      if (result.success) {
        setEffectType('success');
      } else if (result.destroyed) {
        setEffectType('destroy');
      } else if (result.enhanceLevel < enhanceItem.enhanceLevel) {
        setEffectType('downgrade');
      } else {
        setEffectType('maintain');
      }
    } catch {
      setEffectType(null);
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
    setSelectedStoneId(null);
    setEnhancing(false);
  };

  const { color: rarityColor, glow: rarityGlow } = getEnhanceColor(enhanceItem.enhanceLevel);

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
          ) : enhanceInfo.maxLevel ? (
            <div style={{
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                color: '#fbbf24',
                fontSize: 14,
                fontWeight: 700,
                padding: '8px 16px',
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: 8,
              }}>
                최대 강화 달성
              </div>
              <div style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                padding: '8px 14px',
              }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 600 }}>현재 능력치</div>
                {(() => {
                  const itm = enhanceItem.item;
                  const curLevel = enhanceInfo.currentLevel;
                  const stats = itm.type === 'WEAPON'
                    ? [{ label: 'ATK', color: '#e94560', value: itm.baseAttack + curLevel }]
                    : [
                        { label: 'ATK', color: '#e94560', value: itm.baseAttack + curLevel },
                        { label: 'DEF', color: '#4a9eff', value: itm.baseDefense + curLevel },
                        { label: 'HP', color: '#2ecc71', value: itm.baseHp + curLevel },
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
                      <span style={{ color: s.color, fontSize: 15, fontWeight: 800 }}>{s.value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
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
                {(() => {
                  const bonus = selectedStoneConfig?.bonusRate ?? 0;
                  const successRate = enhanceInfo.successRate ?? 0;
                  const adjustedSuccess = Math.min(100, successRate + bonus);
                  return [
                    { label: '성공', value: bonus > 0 ? `${successRate}+${bonus}%` : `${adjustedSuccess}%`, color: '#2ecc71' },
                    { label: '유지', value: enhanceInfo.maintainRate != null && enhanceInfo.maintainRate > 0 ? `${enhanceInfo.maintainRate}%` : '-', color: '#a78bfa' },
                    { label: '하락', value: enhanceInfo.downgradeRate != null && enhanceInfo.downgradeRate > 0 ? `${enhanceInfo.downgradeRate}%` : '-', color: '#ff8c00' },
                    { label: '파괴', value: enhanceInfo.destroyRate != null && enhanceInfo.destroyRate > 0 ? `${enhanceInfo.destroyRate}%` : '-', color: '#e94560' },
                  ];
                })().map((row, idx, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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

          {/* 강화석 선택 — 5개 정사각형 슬롯 */}
          {enhanceInfo && !enhanceInfo.maxLevel && (
            <div style={{
              width: '100%',
              maxWidth: 420,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600 }}>강화석</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {ENHANCE_STONES.map((cfg) => {
                  const owned = stones.find((s) => s.item.name === cfg.name);
                  const isSelected = owned ? selectedStoneId === owned.id : false;
                  const hasStone = !!owned && owned.quantity > 0;
                  return (
                    <button
                      key={cfg.grade}
                      onClick={() => {
                        if (!hasStone || enhancing) return;
                        setSelectedStoneId(isSelected ? null : owned!.id);
                      }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        border: isSelected
                          ? `2px solid ${cfg.color}`
                          : hasStone
                            ? `1px solid rgba(255,255,255,0.15)`
                            : '1px solid rgba(255,255,255,0.06)',
                        background: isSelected
                          ? `radial-gradient(circle, ${cfg.glow}, rgba(255,255,255,0.04))`
                          : hasStone
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(255,255,255,0.01)',
                        cursor: hasStone && !enhancing ? 'pointer' : 'default',
                        opacity: hasStone ? 1 : 0.3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        padding: 0,
                        position: 'relative',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? `0 0 12px ${cfg.glow}` : 'none',
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>💎</span>
                      <span style={{
                        fontSize: 9,
                        color: cfg.color,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}>
                        +{cfg.bonusRate}%
                      </span>
                      {hasStone && (
                        <span style={{
                          position: 'absolute',
                          top: 2,
                          right: 4,
                          fontSize: 9,
                          color: '#aaa',
                          fontWeight: 600,
                        }}>
                          {owned!.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedStoneConfig ? (
                <div style={{
                  textAlign: 'center',
                  marginTop: 6,
                  fontSize: 11,
                  color: selectedStoneConfig.color,
                  fontWeight: 700,
                }}>
                  {selectedStoneConfig.name} 적용중
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  marginTop: 6,
                  fontSize: 10,
                  color: '#555',
                }}>
                  던전에서 강화석을 획득하세요
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bottom CTA */}
        {enhanceInfo && !enhanceInfo.maxLevel && (
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
              {/* 강화 등급표 backdrop + floating panel */}
              {showGradeTable && (
                <div
                  onClick={() => setShowGradeTable(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                  }}
                />
              )}
              {showGradeTable && (
                <div style={{
                  position: 'absolute',
                  zIndex: 1,
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 8,
                  background: 'rgba(18, 16, 32, 0.97)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8, textAlign: 'center' }}>
                    강화 등급표
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '0.7fr 0.9fr 0.9fr 0.9fr 0.9fr 1.2fr',
                    gap: '2px 0',
                    fontSize: 11,
                    textAlign: 'center',
                  }}>
                    <span style={{ color: '#666', fontWeight: 600 }}>강화</span>
                    <span style={{ color: '#666', fontWeight: 600 }}>성공</span>
                    <span style={{ color: '#666', fontWeight: 600 }}>유지</span>
                    <span style={{ color: '#666', fontWeight: 600 }}>하락</span>
                    <span style={{ color: '#666', fontWeight: 600 }}>파괴</span>
                    <span style={{ color: '#666', fontWeight: 600 }}>비용</span>
                    {ENHANCE_GRADE_TABLE.map((row) => (
                      <React.Fragment key={row.level}>
                        <span style={{ color: row.level > 15 ? '#e94560' : row.level > 10 ? '#ff8c00' : '#ccc', fontWeight: 700 }}>
                          +{row.level}
                        </span>
                        <span style={{ color: '#2ecc71', fontWeight: 600 }}>
                          {row.successRate}%
                        </span>
                        <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                          {row.maintainRate}%
                        </span>
                        <span style={{ color: '#ff8c00', fontWeight: 600 }}>
                          {row.downgradeRate > 0 ? `${row.downgradeRate}%` : '-'}
                        </span>
                        <span style={{ color: '#e94560', fontWeight: 600 }}>
                          {row.destroyRate > 0 ? `${row.destroyRate}%` : '-'}
                        </span>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                          {Math.floor(100 * Math.pow(1.5, row.level - 1)).toLocaleString()}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* 강화 등급표 button + 필요 골드 row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <button
                  onClick={() => setShowGradeTable((v) => !v)}
                  style={{
                    background: showGradeTable ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: '#a78bfa',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  강화 등급표
                </button>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 600 }}>필요 골드</span>
                  <span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 800 }}>💰 {(enhanceInfo.cost ?? 0).toLocaleString()} G</span>
                </div>
              </div>

              <button
                className="btn-action primary"
                onClick={handleEnhance}
                disabled={enhancing || (gold !== undefined && gold < (enhanceInfo.cost ?? 0))}
                style={{
                  width: '100%',
                  padding: '18px 0',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  boxShadow: enhancing || (gold !== undefined && gold < (enhanceInfo.cost ?? 0))
                    ? 'none'
                    : '0 4px 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(167, 139, 250, 0.15)',
                }}
              >
                {gold !== undefined && gold < (enhanceInfo.cost ?? 0) ? '골드가 부족합니다' : '강화 시도'}
              </button>
            </div>
          </div>
        )}
      </div>
    </FullscreenOverlay>
  );
}
