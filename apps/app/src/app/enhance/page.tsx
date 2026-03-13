'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enhance, inventory } from '@gate-breaker/api-client';
import type { EnhanceInfo, EnhanceResult, InventoryItem, ItemRarity } from '@gate-breaker/types';
import { Badge, Button, Card, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
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

const ITEM_TYPE_ICON: Record<string, string> = {
  WEAPON: '\u2694\uFE0F',
  ARMOR: '\uD83D\uDEE1\uFE0F',
  GLOVE: '\uD83E\uDDE4',
  SHOE: '\uD83D\uDC62',
  RING: '\uD83D\uDC8D',
  NECKLACE: '\uD83D\uDCFF',
};

const ENHANCABLE_TYPES = new Set(['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE']);

function formatFailurePenalty(penalty: string, currentLevel: number): string {
  if (penalty === 'none') return `+${currentLevel}`;
  // e.g. "downgrade_1" -> "-1", "downgrade_2" -> "-2"
  const match = penalty.match(/downgrade[_\s]*(\d+)/i);
  if (match) return `-${match[1]}`;
  // e.g. "destroy" or other strings
  if (penalty.toLowerCase() === 'destroy') return '파괴';
  return penalty;
}

export default function EnhancePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [info, setInfo] = useState<EnhanceInfo | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [effectType, setEffectType] = useState<EnhanceEffectType | null>(null);

  const refreshInventory = useCallback(async () => {
    try {
      const allItems = await inventory.list();
      const filtered = allItems.filter((inv) => ENHANCABLE_TYPES.has(inv.item.type));
      setItems(filtered);
    } catch (err) {
      const message = err instanceof Error ? err.message : '강화 목록을 불러오지 못했습니다.';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      refreshInventory();
    }
  }, [authLoading, isAuthenticated, refreshInventory, router]);

  const openEnhance = async (inv: InventoryItem) => {
    setSelected(inv);
    setInfo(null);
    try {
      const data = await enhance.info(inv.id);
      setInfo(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '강화 정보를 불러오지 못했습니다.';
      addToast(message, 'error');
    }
  };

  const pendingResultRef = useRef<EnhanceResult | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [effectCenterY, setEffectCenterY] = useState<number | undefined>(undefined);

  const handleEnhance = async () => {
    if (!selected) return;
    setEnhancing(true);

    // Measure icon center position for the effect
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setEffectCenterY(rect.top + rect.height / 2);
    }

    try {
      const result = await enhance.enhance(selected.id);
      pendingResultRef.current = result;
      setEffectType(result.success ? 'success' : 'failure');
    } catch (err) {
      const message = err instanceof Error ? err.message : '강화에 실패했습니다.';
      addToast(message, 'error');
      setEnhancing(false);
    }
  };

  const handleEffectComplete = async () => {
    const result = pendingResultRef.current;
    setEffectType(null);
    if (result) {
      addToast(result.message, result.success ? 'success' : 'info');
      pendingResultRef.current = null;
    }
    const infoPromise = selected ? enhance.info(selected.id).catch(() => null) : Promise.resolve(null);
    const [, , updatedInfo] = await Promise.all([refreshInventory(), refreshUser(), infoPromise]);
    if (updatedInfo) {
      setInfo(updatedInfo);
      setSelected((prev) => {
        if (!prev) return prev;
        return { ...prev, enhanceLevel: updatedInfo.currentLevel };
      });
    }
    setEnhancing(false);
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.enhanceLevel - a.enhanceLevel),
    [items],
  );

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Full-screen enhance detail view
  if (selected) {
    const rarityColor = RARITY_COLORS[selected.item.rarity];
    const rarityGlow = RARITY_GLOW[selected.item.rarity];
    const icon = ITEM_TYPE_ICON[selected.item.type] ?? '\u2728';

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
          {/* Phaser effect overlay */}
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
            <button
              onClick={() => !enhancing && setSelected(null)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '8px 12px',
                cursor: enhancing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#aaa',
                fontSize: 14,
                opacity: enhancing ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              돌아가기
            </button>
          </div>

          {/* Scrollable content area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 101,
          }}>
            {/* Equipment icon area */}
            <div style={{
              marginTop: 16,
              marginBottom: 24,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {/* Glow behind icon */}
              <div
                ref={iconRef}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${rarityGlow} 0%, transparent 70%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Outer ring */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `2px solid ${rarityColor}`,
                  opacity: 0.3,
                }} />
                {/* Inner circle with icon */}
                <div style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background: 'rgba(15, 15, 23, 0.9)',
                  border: `2px solid ${rarityColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: selected.item.imageUrl ? 0 : 36,
                  boxShadow: `0 0 30px ${rarityGlow}, inset 0 0 20px rgba(0,0,0,0.5)`,
                  overflow: 'hidden',
                }}>
                  {selected.item.imageUrl ? (
                    <img
                      src={selected.item.imageUrl}
                      alt={selected.item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    icon
                  )}
                </div>
              </div>

              {/* Item name & level */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{
                  color: rarityColor,
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textShadow: `0 0 20px ${rarityGlow}`,
                }}>
                  {selected.item.name}
                </div>
                <div style={{
                  color: '#eee',
                  fontSize: '2rem',
                  fontWeight: 900,
                  marginTop: 4,
                  letterSpacing: '2px',
                }}>
                  +{selected.enhanceLevel}
                </div>
                {selected.isEquipped && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <Badge variant="success">장착중</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Enhancement info */}
            {!info ? (
              <div style={{ padding: '40px 0' }}>
                <Spinner />
              </div>
            ) : (
              <div style={{
                width: '100%',
                maxWidth: 400,
                padding: '0 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}>
                {[
                  {
                    label: '성공 시',
                    value: `+${info.nextLevel ?? info.currentLevel}`,
                    color: '#2ecc71',
                  },
                  {
                    label: '실패 시',
                    value: formatFailurePenalty(info.failurePenalty, info.currentLevel),
                    color: '#e94560',
                  },
                  {
                    label: '성공 확률',
                    value: `${info.successRate}%`,
                    color: '#a78bfa',
                  },
                  {
                    label: '강화 비용',
                    value: `${info.cost.toLocaleString()} G`,
                    color: '#fbbf24',
                  },
                ].map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{ color: '#666', fontSize: 15 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 17, fontWeight: 800 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          {info && (
            <div style={{
              flexShrink: 0,
              padding: '16px 24px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              position: 'relative',
              zIndex: 101,
            }}>
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                style={{
                  width: '100%',
                  maxWidth: 400,
                  margin: '0 auto',
                  display: 'block',
                  padding: '18px 0',
                  borderRadius: 14,
                  border: 'none',
                  cursor: enhancing ? 'default' : 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: '#fff',
                  background: enhancing
                    ? 'rgba(124, 58, 237, 0.3)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)',
                  backgroundSize: '200% 200%',
                  boxShadow: enhancing
                    ? 'none'
                    : '0 4px 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(167, 139, 250, 0.15)',
                  transition: 'all 0.2s',
                  opacity: enhancing ? 0.6 : 1,
                }}
              >
                {enhancing ? '강화 중...' : '강화 시도'}
              </button>
            </div>
          )}
        </div>
      </FullscreenOverlay>
    );
  }

  // Item list view
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {sortedItems.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '80px 0' }}>강화 가능한 장비가 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {sortedItems.map((inv) => (
            <Card key={inv.id} style={{ padding: '18px' }} onClick={() => openEnhance(inv)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 9,
                    overflow: 'hidden',
                    border: '1px solid #2f2f47',
                    background: '#101322',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {inv.item.imageUrl ? (
                    <img
                      src={inv.item.imageUrl}
                      alt={inv.item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    'NO IMG'
                  )}
                </div>
                <div>
                  <div style={{ color: RARITY_COLORS[inv.item.rarity], fontSize: '1.05rem', fontWeight: 700 }}>{inv.item.name}</div>
                  <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '3px' }}>+{inv.enhanceLevel}</div>
                </div>
              </div>

              {inv.isEquipped && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <Badge variant="success">장착중</Badge>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', fontSize: '0.82rem' }}>
                {inv.item.baseAttack > 0 && <span style={{ color: '#e94560' }}>ATK {inv.item.baseAttack}</span>}
                {inv.item.baseDefense > 0 && <span style={{ color: '#4a9eff' }}>DEF {inv.item.baseDefense}</span>}
                {inv.item.baseHp > 0 && <span style={{ color: '#2ecc71' }}>HP {inv.item.baseHp}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
