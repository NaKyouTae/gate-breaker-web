'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inventory } from '@gate-breaker/api-client';
import type { InventoryItem, ItemRarity } from '@gate-breaker/types';
import { Badge, Card, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { EnhanceView } from '@/components/enhance-view';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};

const ENHANCABLE_TYPES = new Set(['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE']);

export default function EnhancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

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

  if (selected) {
    return (
      <EnhanceView
        item={selected}
        gold={user?.gold}
        onClose={() => setSelected(null)}
        onComplete={async () => {
          await Promise.all([refreshInventory(), refreshUser()]);
        }}
      />
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
            <Card key={inv.id} style={{ padding: '18px' }} onClick={() => setSelected(inv)}>
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
                {(() => {
                  const bonus = inv.enhanceLevel;
                  return <>
                    <span style={{ color: '#e94560' }}>ATK {inv.item.baseAttack + bonus}{bonus > 0 && <span style={{ color: '#2ecc71', fontSize: '0.75rem' }}> (+{bonus})</span>}</span>
                    <span style={{ color: '#4a9eff' }}>DEF {inv.item.baseDefense + bonus}{bonus > 0 && <span style={{ color: '#2ecc71', fontSize: '0.75rem' }}> (+{bonus})</span>}</span>
                    <span style={{ color: '#2ecc71' }}>HP {inv.item.baseHp + bonus}{bonus > 0 && <span style={{ fontSize: '0.75rem' }}> (+{bonus})</span>}</span>
                  </>;
                })()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
