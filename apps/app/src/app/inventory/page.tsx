'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { inventory } from '@gate-breaker/api-client';
import { Badge, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { EnhanceView } from '@/components/enhance-view';
import { FullscreenOverlay } from '@/components/fullscreen-overlay';
import { getEnhanceColor } from '@/lib/enhance-color';
import type { InventoryItem, ItemType } from '@gate-breaker/types';

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

function getItemDisplayName(inv: InventoryItem): string {
  if (inv.isDestroyed) return `${inv.item.name} (파괴)`;
  const base = inv.item.name;
  return inv.enhanceLevel > 0 ? `${base} (+${inv.enhanceLevel})` : base;
}

function InventoryContent() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bagCategory, setBagCategory] = useState<'weapon' | 'consume' | 'etc'>('weapon');

  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [enhanceItem, setEnhanceItem] = useState<InventoryItem | null>(null);

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
    if (isAuthenticated) fetchItems();
  }, [authLoading, isAuthenticated, router, fetchItems]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'weapon') setBagCategory('weapon');
  }, [searchParams]);

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

  const handleRestore = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      const result = await inventory.restore(item.id);
      addToast(result.message, 'success');
      setDetailItem(null);
      await Promise.all([fetchItems(), refreshUser()]);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '복원에 실패했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (enhanceItem) {
    return (
      <EnhanceView
        item={enhanceItem}
        gold={user?.gold}
        onClose={() => setEnhanceItem(null)}
        onComplete={async (_result, updatedInfo) => {
          await Promise.all([fetchItems(), refreshUser()]);
          if (updatedInfo) {
            setDetailItem((prev) => {
              if (!prev || prev.id !== enhanceItem.id) return prev;
              return { ...prev, enhanceLevel: updatedInfo.currentLevel };
            });
          }
        }}
      />
    );
  }

  // ===== Full-screen Detail View =====
  if (detailItem) {
    const { color: rarityColor, glow: rarityGlow } = getEnhanceColor(detailItem.enhanceLevel);
    const isWeapon = detailItem.item.type === 'WEAPON';

    return (
      <FullscreenOverlay>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(180deg, #0a0a14 0%, #0e0e1a 30%, #12101f 100%)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))', flexShrink: 0,
          }}>
            <button onClick={() => setDetailItem(null)} style={{
              background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            }}>&#x2715;</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px' }}>
            {/* Item Image */}
            <div style={{
              marginTop: 16, marginBottom: 20, width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${rarityGlow} 0%, transparent 70%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${rarityColor}`, opacity: 0.3 }} />
              <div style={{
                width: 88, height: 88, borderRadius: '50%', background: 'rgba(15, 15, 23, 0.9)',
                border: `2px solid ${rarityColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 30px ${rarityGlow}, inset 0 0 20px rgba(0,0,0,0.5)`, overflow: 'hidden',
              }}>
                {detailItem.item.imageUrl ? (
                  <img src={detailItem.item.imageUrl} alt={detailItem.item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 10, color: '#667085' }}>IMG</span>
                )}
              </div>
            </div>

            {/* Name & Type */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ color: rarityColor, fontSize: '1.3rem', fontWeight: 800, textShadow: `0 0 20px ${rarityGlow}` }}>
                {getItemDisplayName(detailItem)}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>{TYPE_LABELS[detailItem.item.type]}</span>
                {detailItem.isDestroyed ? (
                  <Badge variant="danger">파괴됨</Badge>
                ) : detailItem.enhanceLevel > 0 ? (
                  <Badge variant="warning">+{detailItem.enhanceLevel} 강화</Badge>
                ) : null}
              </div>
            </div>

            {detailItem.item.description && (
              <p style={{ fontSize: '0.85rem', color: '#777', textAlign: 'center', marginBottom: 20, lineHeight: 1.6, maxWidth: 360 }}>
                {detailItem.item.description}
              </p>
            )}

            {/* Stats - Weapon: ATK only */}
            {isWeapon && (() => {
              const enhLevel = detailItem.enhanceLevel;
              const baseAtk = detailItem.item.baseAttack;
              return (
                <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 0', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 4 }}>ATK</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e94560' }}>{baseAtk + enhLevel}</div>
                      {enhLevel > 0 && (
                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 2 }}>
                          기본 {baseAtk} <span style={{ color: '#2ecc71' }}>+{enhLevel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Non-weapon stats */}
            {!isWeapon && (detailItem.item.baseAttack > 0 || detailItem.item.baseDefense > 0 || detailItem.item.baseHp > 0) && (
              <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 0', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  {[
                    { label: 'ATK', base: detailItem.item.baseAttack, color: '#e94560' },
                    { label: 'DEF', base: detailItem.item.baseDefense, color: '#4a9eff' },
                    { label: 'HP', base: detailItem.item.baseHp, color: '#2ecc71' },
                  ].filter(s => s.base > 0).map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.base}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailItem.quantity > 1 && (
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>보유 수량: {detailItem.quantity}개</div>
            )}
          </div>

          {/* Bottom Actions */}
          <div style={{
            flexShrink: 0, padding: '16px 24px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440, margin: '0 auto', width: '100%',
          }}>
            {detailItem.isDestroyed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn-action primary" disabled={actionLoading} onClick={() => handleRestore(detailItem)}
                  style={{ width: '100%', padding: '16px 0', fontSize: '1rem', fontWeight: 800 }}>
                  복원하기 (5,000G)
                </button>
                <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center' }}>
                  동일한 무기 +10 강화 상태로 복원됩니다
                </div>
                <button className="btn-action danger" disabled={actionLoading} onClick={() => handleDiscard(detailItem)}
                  style={{ padding: '12px 0', fontSize: '0.85rem' }}>
                  버리기
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10 }}>
                  {isWeapon && (
                    detailItem.isEquipped ? (
                      <button className="btn-action secondary" disabled={actionLoading} onClick={() => handleUnequip(detailItem)}>해제</button>
                    ) : (
                      <button className="btn-action primary" disabled={actionLoading} onClick={() => handleEquip(detailItem)}>장착</button>
                    )
                  )}
                  {isWeapon && (
                    <button className="btn-action warning" disabled={actionLoading} onClick={() => setEnhanceItem(detailItem)}>강화하기</button>
                  )}
                </div>
                {!detailItem.isEquipped && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-action ghost" disabled={actionLoading} onClick={() => handleSell(detailItem)} style={{ padding: '12px 0', fontSize: '0.85rem' }}>
                      판매 ({detailItem.item.sellPrice}G)
                    </button>
                    <button className="btn-action danger" disabled={actionLoading} onClick={() => handleDiscard(detailItem)} style={{ padding: '12px 0', fontSize: '0.85rem' }}>
                      버리기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </FullscreenOverlay>
    );
  }

  // ===== Main Inventory View =====
  const getFilteredItems = () => {
    if (bagCategory === 'weapon') {
      return items.filter((i) => i.item.type === 'WEAPON').sort((a, b) => {
        if (a.isDestroyed && !b.isDestroyed) return 1;
        if (!a.isDestroyed && b.isDestroyed) return -1;
        if (a.isEquipped && !b.isEquipped) return -1;
        if (!a.isEquipped && b.isEquipped) return 1;
        return 0;
      });
    }
    if (bagCategory === 'consume') return items.filter((i) => i.item.type === 'CONSUMABLE');
    return items.filter((i) => i.item.type === 'MATERIAL');
  };

  const filtered = getFilteredItems();

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {([
          { key: 'weapon' as const, label: '무기' },
          { key: 'consume' as const, label: '소비' },
          { key: 'etc' as const, label: '기타' },
        ]).map(({ key, label }) => {
          const count = key === 'weapon'
            ? items.filter((i) => i.item.type === 'WEAPON').length
            : key === 'consume'
              ? items.filter((i) => i.item.type === 'CONSUMABLE').length
              : items.filter((i) => i.item.type === 'MATERIAL').length;
          const active = bagCategory === key;
          return (
            <button
              key={key}
              className={`category-pill${active ? ' active' : ''}`}
              onClick={() => setBagCategory(key)}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: '#555', padding: '40px 0', textAlign: 'center' }}>아이템이 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {filtered.map((inv) => (
            <div key={inv.id} onClick={() => setDetailItem(inv)} style={{
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div
                className="item-box"
                style={{
                  borderColor: inv.isDestroyed
                    ? '#e9456040'
                    : inv.isEquipped ? getEnhanceColor(inv.enhanceLevel).color : `${getEnhanceColor(inv.enhanceLevel).color}25`,
                  borderWidth: inv.isEquipped ? '2px' : '1.5px',
                  boxShadow: inv.isDestroyed
                    ? '0 0 8px rgba(233,69,96,0.2)'
                    : inv.isEquipped ? `0 0 12px ${getEnhanceColor(inv.enhanceLevel).glow}` : 'none',
                  borderRadius: '8px',
                  opacity: inv.isDestroyed ? 0.5 : 1,
                  position: 'relative',
                }}
              >
                {inv.item.imageUrl ? (
                  <img src={inv.item.imageUrl} alt={inv.item.name} style={inv.isDestroyed ? { filter: 'grayscale(100%)' } : undefined} />
                ) : (
                  <span>IMG</span>
                )}
                {inv.quantity > 1 && (
                  <span className="qty-badge">x{inv.quantity}</span>
                )}
                {inv.isDestroyed ? (
                  <span className="enhance-badge" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)', fontSize: '0.5rem' }}>파괴</span>
                ) : inv.enhanceLevel > 0 ? (
                  <span className="enhance-badge">+{inv.enhanceLevel}</span>
                ) : null}
                {inv.isEquipped && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
                    <div style={{
                      position: 'absolute', top: 8, right: -22, width: 80, textAlign: 'center',
                      transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                      color: '#fff', fontSize: '0.5rem', fontWeight: 800, padding: '1px 0',
                      letterSpacing: '0.5px', boxShadow: '0 1px 4px rgba(124,58,237,0.4)',
                    }}>장착중</div>
                  </div>
                )}
              </div>
              <span className="item-name" style={{ color: inv.isDestroyed ? '#e94560' : getEnhanceColor(inv.enhanceLevel).color, fontSize: '0.6rem' }}>
                {inv.item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
