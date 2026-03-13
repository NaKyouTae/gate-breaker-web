'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { shop, user as userApi } from '@gate-breaker/api-client';
import { Card, Button, Modal, Spinner, useToast, Input } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import type { ShopItem, ItemType, ItemRarity } from '@gate-breaker/types';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
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

type ShopCategory = 'ALL' | '장비' | '소비' | '기타';
const SHOP_CATEGORIES: ShopCategory[] = ['ALL', '장비', '소비', '기타'];

function getItemCategory(item: Pick<ShopItem, 'type'>): Exclude<ShopCategory, 'ALL'> {
  if (item.type === 'CONSUMABLE') return '소비';
  if (item.type === 'MATERIAL') return '기타';
  return '장비';
}

export default function ShopPage() {
  const { isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [gold, setGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('ALL');
  const [quantity, setQuantity] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shopItems, me] = await Promise.all([shop.list(), userApi.me()]);
      setItems(shopItems);
      setGold(me.gold);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '상점 정보를 불러올 수 없습니다.', 'error');
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
      fetchData();
    }
  }, [authLoading, isAuthenticated, router, fetchData]);

  const canSelectQuantity = (item: Pick<ShopItem, 'type'>) =>
    getItemCategory(item) === '소비' || getItemCategory(item) === '기타';

  const filteredItems = useMemo(
    () => items.filter((item) => selectedCategory === 'ALL' || getItemCategory(item) === selectedCategory),
    [items, selectedCategory],
  );

  const openBuyModal = (item: ShopItem) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  const handleBuy = async () => {
    if (!selectedItem) return;
    const purchaseQuantity = canSelectQuantity(selectedItem) ? Math.max(1, quantity) : 1;
    setBuyLoading(true);
    try {
      const result = await shop.buy(selectedItem.id, purchaseQuantity);
      addToast(`${selectedItem.name} x${purchaseQuantity} 구매 완료 (-${result.totalCost}G)`, 'success');
      setGold(result.remainingGold);
      setSelectedItem(null);
      await refreshUser();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '구매에 실패했습니다.', 'error');
    } finally {
      setBuyLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '8px',
            marginBottom: '18px',
          }}
        >
          {SHOP_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: isActive ? '1px solid #fbbf24' : '1px solid #2a2a4a',
                  background: isActive ? 'rgba(251, 191, 36, 0.15)' : '#12122a',
                  color: isActive ? '#fbbf24' : '#b6b6c7',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {category === 'ALL' ? '전체' : category}
              </button>
            );
          })}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div style={{ color: '#555', padding: '60px 0', textAlign: 'center' }}>
          선택한 카테고리에 판매 중인 아이템이 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '12px',
          }}
        >
          {filteredItems.map((item) => {
            return (
              <Card
                key={item.id}
                style={{ padding: '0', cursor: 'pointer', background: 'transparent', border: 'none', boxShadow: 'none' }}
                onClick={() => openBuyModal(item)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '16px',
                      border: '1px solid #2f2f47',
                      overflow: 'hidden',
                      background: '#111233',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      'NO IMG'
                    )}
                  </div>
                  <div style={{ width: '100%', paddingTop: '8px', textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: RARITY_COLORS[item.rarity],
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>
                      {item.buyPrice.toLocaleString()} G
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Item Detail Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="아이템 상세"
      >
        {selectedItem && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: '10px',
                  border: '1px solid #2f2f47',
                  overflow: 'hidden',
                  background: '#0f1020',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  'NO IMG'
                )}
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: RARITY_COLORS[selectedItem.rarity],
                  marginBottom: '8px',
                }}
              >
                {selectedItem.name}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '0.8rem', color: '#666' }}>
                <span>{TYPE_LABELS[selectedItem.type]}</span>
                <span>{selectedItem.category}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', marginBottom: '8px' }}>
                {selectedItem.baseAttack > 0 && <span style={{ color: '#e94560' }}>ATK {selectedItem.baseAttack}</span>}
                {selectedItem.baseDefense > 0 && <span style={{ color: '#4a9eff' }}>DEF {selectedItem.baseDefense}</span>}
                {selectedItem.baseHp > 0 && <span style={{ color: '#2ecc71' }}>HP {selectedItem.baseHp}</span>}
              </div>
            </div>

            {/* Quantity Selector */}
            {canSelectQuantity(selectedItem) && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: '#999', marginBottom: '8px', display: 'block' }}>
                  수량
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Input
                    value={String(quantity)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                      const next = Number(digitsOnly);
                      setQuantity(Number.isNaN(next) ? 1 : Math.max(1, next));
                    }}
                    onBlur={() => setQuantity((q) => Math.max(1, q))}
                    style={{ width: '90px', textAlign: 'center' }}
                  />
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: '#0e0e1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#eee',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Total Cost */}
            <div
              style={{
                background: '#0e0e1a',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: '#999', fontSize: '0.9rem' }}>총 비용</span>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: gold >= selectedItem.buyPrice * (canSelectQuantity(selectedItem) ? quantity : 1) ? '#fbbf24' : '#e94560',
                }}
              >
                {(selectedItem.buyPrice * (canSelectQuantity(selectedItem) ? quantity : 1)).toLocaleString()} G
              </span>
            </div>

            {gold < selectedItem.buyPrice * (canSelectQuantity(selectedItem) ? quantity : 1) && (
              <div style={{ fontSize: '0.85rem', color: '#e94560', marginBottom: '12px' }}>
                골드가 부족합니다. (보유: {gold.toLocaleString()} G)
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={buyLoading}
                disabled={gold < selectedItem.buyPrice * (canSelectQuantity(selectedItem) ? quantity : 1)}
                onClick={handleBuy}
              >
                구매하기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
