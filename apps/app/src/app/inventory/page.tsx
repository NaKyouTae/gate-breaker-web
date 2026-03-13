'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { inventory, enhance } from '@gate-breaker/api-client';
import { Badge, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { EnhanceEffect, type EnhanceEffectType } from '@/components/enhance-effect';
import type { InventoryItem, EquipSlot, ItemType, ItemRarity, EnhanceInfo, EnhanceResult } from '@gate-breaker/types';

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

const TYPE_LABELS: Record<ItemType, string> = {
  WEAPON: '무기',
  ARMOR: '갑옷',
  GLOVE: '장갑',
  SHOE: '신발',
  RING: '반지',
  NECKLACE: '목걸이',
  MATERIAL: '재료',
  CONSUMABLE: '소모품',
};

const ENHANCABLE_TYPES = new Set(['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE']);

function getItemDisplayName(inv: InventoryItem): string {
  const base = inv.item.name;
  return inv.enhanceLevel > 0 ? `${base} (+${inv.enhanceLevel})` : base;
}

function formatFailurePenalty(penalty: string, currentLevel: number): string {
  if (penalty === 'none') return `+${currentLevel}`;
  const match = penalty.match(/downgrade[_\s]*(\d+)/i);
  if (match) return `-${match[1]}`;
  if (penalty.toLowerCase() === 'destroy') return '파괴';
  return penalty;
}

export default function InventoryPage() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bagCategory, setBagCategory] = useState<'equip' | 'consume' | 'etc'>('equip');

  // Detail view state
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Enhance view state
  const [enhanceItem, setEnhanceItem] = useState<InventoryItem | null>(null);
  const [enhanceInfo, setEnhanceInfo] = useState<EnhanceInfo | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [effectType, setEffectType] = useState<EnhanceEffectType | null>(null);
  const pendingResultRef = useRef<EnhanceResult | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [effectCenterY, setEffectCenterY] = useState<number | undefined>(undefined);

  const fetchItems = useCallback(async () => {
    try {
      const data = await inventory.list();
      setItems(data);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '인벤토리를 불러올 수 없습니다.', 'error');
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
      fetchItems();
    }
  }, [authLoading, isAuthenticated, router, fetchItems]);

  const equippedItems = items.filter((i) => i.isEquipped);
  const bagItems = items.filter((i) => !i.isEquipped);

  const getEquippedBySlot = (slot: EquipSlot): InventoryItem | undefined =>
    equippedItems.find((i) => i.equippedSlot === slot);

  const handleEquip = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      await inventory.equip(item.id);
      addToast(`${item.item.name} 장착 완료`, 'success');
      setDetailItem(null);
      await fetchItems();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '장착에 실패했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnequip = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      await inventory.unequip(item.id);
      addToast(`${item.item.name} 해제 완료`, 'success');
      setDetailItem(null);
      await fetchItems();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '해제에 실패했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSell = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      const result = await inventory.sell(item.id, 1);
      addToast(`${item.item.name} 판매 완료 (+${result.goldEarned}G)`, 'success');
      setDetailItem(null);
      await fetchItems();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '판매에 실패했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      await inventory.discard(item.id);
      addToast(`${item.item.name} 버리기 완료`, 'success');
      setDetailItem(null);
      await fetchItems();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '버리기에 실패했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Enhance handlers
  const openEnhance = async (inv: InventoryItem) => {
    setEnhanceItem(inv);
    setEnhanceInfo(null);
    try {
      const data = await enhance.info(inv.id);
      setEnhanceInfo(data);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '강화 정보를 불러오지 못했습니다.', 'error');
    }
  };

  const handleEnhance = async () => {
    if (!enhanceItem) return;
    setEnhancing(true);
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setEffectCenterY(rect.top + rect.height / 2);
    }
    try {
      const result = await enhance.enhance(enhanceItem.id);
      pendingResultRef.current = result;
      setEffectType(result.success ? 'success' : 'failure');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '강화에 실패했습니다.', 'error');
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
    const infoPromise = enhanceItem ? enhance.info(enhanceItem.id).catch(() => null) : Promise.resolve(null);
    const [, , updatedInfo] = await Promise.all([fetchItems(), refreshUser(), infoPromise]);
    if (updatedInfo) {
      setEnhanceInfo(updatedInfo);
      setEnhanceItem((prev) => {
        if (!prev) return prev;
        return { ...prev, enhanceLevel: updatedInfo.currentLevel };
      });
      // Also update detail item if it matches
      setDetailItem((prev) => {
        if (!prev || prev.id !== enhanceItem?.id) return prev;
        return { ...prev, enhanceLevel: updatedInfo.currentLevel };
      });
    }
    setEnhancing(false);
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // ===== Full-screen Enhance View =====
  if (enhanceItem) {
    const rarityColor = RARITY_COLORS[enhanceItem.item.rarity];
    const rarityGlow = RARITY_GLOW[enhanceItem.item.rarity];

    return (
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
            onClick={() => !enhancing && setEnhanceItem(null)}
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

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 101,
        }}>
          <div style={{
            marginTop: 16,
            marginBottom: 24,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
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
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${rarityColor}`,
                opacity: 0.3,
              }} />
              <div style={{
                width: 88,
                height: 88,
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

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{
                color: rarityColor,
                fontSize: '1.3rem',
                fontWeight: 800,
                textShadow: `0 0 20px ${rarityGlow}`,
              }}>
                {enhanceItem.item.name}
              </div>
              <div style={{
                color: '#eee',
                fontSize: '2rem',
                fontWeight: 900,
                marginTop: 4,
                letterSpacing: '2px',
              }}>
                +{enhanceItem.enhanceLevel}
              </div>
            </div>
          </div>

          {!enhanceInfo ? (
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
            }}>
              {[
                { label: '성공 시', value: `+${enhanceInfo.nextLevel ?? enhanceInfo.currentLevel}`, color: '#2ecc71' },
                { label: '실패 시', value: formatFailurePenalty(enhanceInfo.failurePenalty, enhanceInfo.currentLevel), color: '#e94560' },
                { label: '성공 확률', value: `${enhanceInfo.successRate}%`, color: '#a78bfa' },
                { label: '강화 비용', value: `${enhanceInfo.cost.toLocaleString()} G`, color: '#fbbf24' },
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

        {enhanceInfo && (
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
    );
  }

  // ===== Full-screen Detail View =====
  if (detailItem) {
    const rarityColor = RARITY_COLORS[detailItem.item.rarity];
    const rarityGlow = RARITY_GLOW[detailItem.item.rarity];
    const isEquipType = ENHANCABLE_TYPES.has(detailItem.item.type);

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0a0a14 0%, #0e0e1a 30%, #12101f 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setDetailItem(null)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#aaa',
              fontSize: 14,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            돌아가기
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 24px',
        }}>
          {/* Item Image */}
          <div style={{
            marginTop: 16,
            marginBottom: 20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rarityGlow} 0%, transparent 70%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${rarityColor}`,
              opacity: 0.3,
            }} />
            <div style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'rgba(15, 15, 23, 0.9)',
              border: `2px solid ${rarityColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 30px ${rarityGlow}, inset 0 0 20px rgba(0,0,0,0.5)`,
              overflow: 'hidden',
            }}>
              {detailItem.item.imageUrl ? (
                <img
                  src={detailItem.item.imageUrl}
                  alt={detailItem.item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 10, color: '#667085' }}>IMG</span>
              )}
            </div>
          </div>

          {/* Item Name & Type */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{
              color: rarityColor,
              fontSize: '1.3rem',
              fontWeight: 800,
              textShadow: `0 0 20px ${rarityGlow}`,
            }}>
              {getItemDisplayName(detailItem)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>{TYPE_LABELS[detailItem.item.type]}</span>
              {detailItem.enhanceLevel > 0 && (
                <Badge variant="warning">+{detailItem.enhanceLevel} 강화</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {detailItem.item.description && (
            <p style={{ fontSize: '0.85rem', color: '#777', textAlign: 'center', marginBottom: 20, lineHeight: 1.6, maxWidth: 360 }}>
              {detailItem.item.description}
            </p>
          )}

          {/* Stats */}
          <div style={{
            width: '100%',
            maxWidth: 400,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            padding: '16px 0',
            marginBottom: 24,
          }}>
            {[
              { label: 'ATK', value: detailItem.item.baseAttack, color: '#e94560' },
              { label: 'DEF', value: detailItem.item.baseDefense, color: '#4a9eff' },
              { label: 'HP', value: detailItem.item.baseHp, color: '#2ecc71' },
            ].filter(s => s.value > 0).length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {[
                  { label: 'ATK', value: detailItem.item.baseAttack, color: '#e94560' },
                  { label: 'DEF', value: detailItem.item.baseDefense, color: '#4a9eff' },
                  { label: 'HP', value: detailItem.item.baseHp, color: '#2ecc71' },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>스탯 없음</div>
            )}
          </div>

          {/* Quantity */}
          {detailItem.quantity > 1 && (
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
              보유 수량: {detailItem.quantity}개
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{
          flexShrink: 0,
          padding: '16px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 440,
          margin: '0 auto',
          width: '100%',
        }}>
          {/* Primary actions row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {isEquipType && (
              detailItem.isEquipped ? (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUnequip(detailItem)}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    borderRadius: 12,
                    border: '1px solid #a78bfa40',
                    cursor: actionLoading ? 'default' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#a78bfa',
                    background: 'rgba(167, 139, 250, 0.08)',
                    opacity: actionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  해제
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={() => handleEquip(detailItem)}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    borderRadius: 12,
                    border: 'none',
                    cursor: actionLoading ? 'default' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
                    opacity: actionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  장착
                </button>
              )
            )}
            {isEquipType && (
              <button
                disabled={actionLoading}
                onClick={() => openEnhance(detailItem)}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  borderRadius: 12,
                  border: '1px solid #fbbf2440',
                  cursor: actionLoading ? 'default' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: 'rgba(251, 191, 36, 0.08)',
                  opacity: actionLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                강화하기
              </button>
            )}
          </div>
          {/* Secondary actions row - only for non-equipped items */}
          {!detailItem.isEquipped && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={actionLoading}
                onClick={() => handleSell(detailItem)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: '1px solid #333',
                  cursor: actionLoading ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#999',
                  background: 'rgba(255,255,255,0.03)',
                  opacity: actionLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                판매 ({detailItem.item.sellPrice}G)
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleDiscard(detailItem)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: '1px solid #e9456020',
                  cursor: actionLoading ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#e94560',
                  background: 'rgba(233, 69, 96, 0.06)',
                  opacity: actionLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                버리기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== Main Inventory View =====
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {/* 장착 중 - Character Equipment View */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', marginBottom: '12px' }}>
          장착 중
        </h2>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            background: '#0e0e1a',
            borderRadius: '12px',
            border: '1px solid #1a1a2e',
            overflow: 'hidden',
          }}
        >
          {/* Human Silhouette */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <svg width="120" height="280" viewBox="0 0 120 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="30" r="22" stroke="#2a2a4a" strokeWidth="2" fill="none" />
              <line x1="60" y1="52" x2="60" y2="65" stroke="#2a2a4a" strokeWidth="2" />
              <path d="M35 65 L85 65 L80 160 L40 160 Z" stroke="#2a2a4a" strokeWidth="2" fill="none" />
              <path d="M35 65 L10 120 L5 150" stroke="#2a2a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M85 65 L110 120 L115 150" stroke="#2a2a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M45 160 L35 230 L30 270" stroke="#2a2a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M75 160 L85 230 L90 270" stroke="#2a2a4a" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          {/* Equipment Slot Boxes */}
          {([
            { slot: 'WEAPON' as EquipSlot, label: '무기', top: '38%', left: '4%' },
            { slot: 'ARMOR' as EquipSlot, label: '갑옷', top: '28%', left: '50%', transform: 'translateX(-50%)' },
            { slot: 'GLOVE' as EquipSlot, label: '장갑', top: '38%', right: '4%' },
            { slot: 'NECKLACE' as EquipSlot, label: '목걸이', top: '8%', left: '50%', transform: 'translateX(-50%)' },
            { slot: 'RING' as EquipSlot, label: '반지', top: '60%', left: '4%' },
            { slot: 'SHOE' as EquipSlot, label: '신발', bottom: '6%', left: '50%', transform: 'translateX(-50%)' },
          ] as const).map(({ slot, label, ...pos }) => {
            const equipped = getEquippedBySlot(slot);
            const posStyle: React.CSSProperties = {};
            if ('top' in pos) posStyle.top = pos.top;
            if ('left' in pos) posStyle.left = pos.left;
            if ('right' in pos) posStyle.right = pos.right;
            if ('bottom' in pos) posStyle.bottom = pos.bottom;
            if ('transform' in pos) posStyle.transform = pos.transform;
            return (
              <div
                key={slot}
                onClick={() => equipped && setDetailItem(equipped)}
                style={{
                  position: 'absolute',
                  ...posStyle,
                  width: '56px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: equipped ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    border: equipped
                      ? `2px solid ${RARITY_COLORS[equipped.item.rarity]}`
                      : '2px dashed #333',
                    background: equipped ? '#1a1a2e' : '#111126',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: equipped
                      ? `0 0 12px ${RARITY_COLORS[equipped.item.rarity]}30`
                      : 'none',
                  }}
                >
                  {equipped ? (
                    equipped.item.imageUrl ? (
                      <img
                        src={equipped.item.imageUrl}
                        alt={equipped.item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '8px', color: '#667085' }}>IMG</span>
                    )
                  ) : (
                    <span style={{ fontSize: '16px', color: '#333' }}>+</span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.6rem',
                  color: equipped ? RARITY_COLORS[equipped.item.rarity] : '#555',
                  fontWeight: equipped ? 600 : 400,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  {equipped ? getItemDisplayName(equipped) : label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 가방 - Bag Items */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', marginBottom: '12px' }}>
          가방 <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 400 }}>({bagItems.length})</span>
        </h2>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {([
            { key: 'equip' as const, label: '장비' },
            { key: 'consume' as const, label: '소비' },
            { key: 'etc' as const, label: '기타' },
          ]).map(({ key, label }) => {
            const count = bagItems.filter((i) =>
              key === 'equip'
                ? !['MATERIAL', 'CONSUMABLE'].includes(i.item.type)
                : key === 'consume'
                  ? i.item.type === 'CONSUMABLE'
                  : i.item.type === 'MATERIAL'
            ).length;
            const active = bagCategory === key;
            return (
              <button
                key={key}
                onClick={() => setBagCategory(key)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '0.8rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#a78bfa' : '#666',
                  background: active ? '#1a1a2e' : 'transparent',
                  border: active ? '1px solid #a78bfa40' : '1px solid #222',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
        {(() => {
          const filtered = bagItems.filter((i) =>
            bagCategory === 'equip'
              ? !['MATERIAL', 'CONSUMABLE'].includes(i.item.type)
              : bagCategory === 'consume'
                ? i.item.type === 'CONSUMABLE'
                : i.item.type === 'MATERIAL'
          );
          return filtered.length === 0 ? (
            <div style={{ color: '#555', padding: '40px 0', textAlign: 'center' }}>
              아이템이 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setDetailItem(inv)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 10,
                      border: `1.5px solid ${RARITY_COLORS[inv.item.rarity]}40`,
                      background: '#111126',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {inv.item.imageUrl ? (
                      <img
                        src={inv.item.imageUrl}
                        alt={inv.item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 10, color: '#667085' }}>IMG</span>
                    )}
                    {inv.quantity > 1 && (
                      <span style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 4,
                        fontSize: '0.65rem',
                        color: '#ccc',
                        fontWeight: 600,
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: '0 3px',
                      }}>
                        x{inv.quantity}
                      </span>
                    )}
                    {inv.enhanceLevel > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: 2,
                        left: 4,
                        fontSize: '0.6rem',
                        color: '#fbbf24',
                        fontWeight: 700,
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        padding: '0 3px',
                      }}>
                        +{inv.enhanceLevel}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    color: RARITY_COLORS[inv.item.rarity],
                    fontWeight: 600,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}>
                    {inv.item.name}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

    </div>
  );
}
