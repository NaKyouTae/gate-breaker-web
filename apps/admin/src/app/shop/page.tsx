'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Item, ItemRarity, ItemType } from '@gate-breaker/types';
import { Button, Input, Spinner, useToast } from '@gate-breaker/ui';
import { AdminActionIconButton } from '@/components/admin-action-icon-button';
import { AdminLayout } from '@/components/admin-layout';
import { AdminCrudModalForm, AdminFormField } from '@/components/admin-crud-modal-form';

const TYPE_LABELS: Record<ItemType, string> = {
  WEAPON: '무기',
  ARMOR: '방어구',
  GLOVE: '장갑',
  SHOE: '신발',
  RING: '반지',
  NECKLACE: '목걸이',
  MATERIAL: '재료',
  CONSUMABLE: '소모품',
};

const RARITY_LABELS: Record<ItemRarity, string> = {
  COMMON: '일반',
  RARE: '희귀',
  EPIC: '영웅',
  LEGENDARY: '전설',
  MYTHIC: '신화',
};

export default function ShopPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingPrice, setEditingPrice] = useState(0);

  // 등록 모달 상태
  const [registerOpen, setRegisterOpen] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allItemsLoading, setAllItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [registerPrice, setRegisterPrice] = useState(0);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSearch, setRegisterSearch] = useState('');

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await admin.shop.list();
      setItems(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '상점 아이템을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setEditingPrice(item.buyPrice || 0);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditingPrice(0);
  };

  const save = async () => {
    if (!editingItem) return;
    setUpdatingId(editingItem.id);
    try {
      await admin.shop.update(editingItem.id, { buyPrice: editingPrice });
      addToast('상점 가격을 수정했습니다.', 'success');
      closeEditModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '가격 수정에 실패했습니다.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeFromShop = async (id: string, name: string) => {
    if (!confirm(`"${name}" 아이템을 상점에서 해제하시겠습니까?`)) return;
    try {
      await admin.shop.remove(id);
      addToast('상점에서 해제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '상점 해제에 실패했습니다.', 'error');
    }
  };

  // 등록 모달
  const openRegisterModal = async () => {
    setRegisterOpen(true);
    setSelectedItemId('');
    setRegisterPrice(0);
    setRegisterSearch('');
    setAllItemsLoading(true);
    try {
      const data = await admin.items.list();
      setAllItems(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '아이템 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setAllItemsLoading(false);
    }
  };

  const closeRegisterModal = () => {
    setRegisterOpen(false);
    setSelectedItemId('');
    setRegisterPrice(0);
    setRegisterSearch('');
  };

  const shopItemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const availableItems = useMemo(() => {
    const unregistered = allItems.filter((i) => !shopItemIds.has(i.id));
    if (!registerSearch.trim()) return unregistered;
    const q = registerSearch.trim().toLowerCase();
    return unregistered.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        TYPE_LABELS[i.type].includes(q),
    );
  }, [allItems, shopItemIds, registerSearch]);

  const selectedItem = useMemo(
    () => allItems.find((i) => i.id === selectedItemId) ?? null,
    [allItems, selectedItemId],
  );

  const register = async () => {
    if (!selectedItemId || registerPrice < 0) return;
    setRegisterLoading(true);
    try {
      await admin.shop.update(selectedItemId, { buyPrice: registerPrice });
      addToast('상점에 아이템을 등록했습니다.', 'success');
      closeRegisterModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '상점 등록에 실패했습니다.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#eee' }}>상점 관리</h1>
        <Button size="sm" onClick={openRegisterModal}>+ 아이템 등록</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>상점 등록 아이템이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                backgroundColor: hoveredRow === item.id ? '#252545' : '#1a1a2e',
                borderRadius: 12,
                border: '1px solid #2a2a4a',
                padding: '16px 20px',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#eee' }}>{item.name}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <AdminActionIconButton kind="edit" onClick={() => openEditModal(item)} />
                  <AdminActionIconButton kind="delete" onClick={() => removeFromShop(item.id, item.name)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#12122a', color: '#aaa' }}>
                  {item.category}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#12122a', color: '#aaa' }}>
                  {TYPE_LABELS[item.type]}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#12122a', color: '#a78bfa' }}>
                  {RARITY_LABELS[item.rarity]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                  <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>현재 가격</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>
                    {(item.buyPrice || 0).toLocaleString()} G
                  </p>
                </div>
                {item.type === 'CONSUMABLE' && (item.healHp ?? 0) > 0 && (
                  <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                    <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>회복력</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
                      +{item.healHp} HP
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminCrudModalForm
        isOpen={!!editingItem}
        onClose={closeEditModal}
        onSubmit={save}
        title="상점 가격 수정"
        submitLabel="저장"
        loading={updatingId === editingItem?.id}
      >
        {editingItem && (
          <>
            <AdminFormField label="아이템">
              <div style={{ color: '#eee', fontWeight: 600, minHeight: 38, display: 'flex', alignItems: 'center' }}>{editingItem.name}</div>
            </AdminFormField>
            <AdminFormField label="현재 가격">
              <div style={{ color: '#999', fontSize: 13, minHeight: 38, display: 'flex', alignItems: 'center' }}>
                {(editingItem.buyPrice || 0).toLocaleString()} G
              </div>
            </AdminFormField>
            <AdminFormField label="변경 가격">
              <Input
                type="number"
                value={String(editingPrice)}
                onChange={(e) => {
                  const value = Number(e.target.value || 0);
                  setEditingPrice(Number.isFinite(value) ? value : 0);
                }}
              />
            </AdminFormField>
          </>
        )}
      </AdminCrudModalForm>

      {/* 등록 모달 */}
      <AdminCrudModalForm
        isOpen={registerOpen}
        onClose={closeRegisterModal}
        onSubmit={register}
        title="상점 아이템 등록"
        submitLabel="등록"
        loading={registerLoading}
      >
        {allItemsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner /></div>
        ) : (
          <>
            <AdminFormField label="아이템 검색">
              <Input
                placeholder="이름, 카테고리, 타입으로 검색..."
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
              />
            </AdminFormField>

            <AdminFormField label="아이템 선택">
              {availableItems.length === 0 ? (
                <p style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>
                  {registerSearch ? '검색 결과가 없습니다.' : '등록 가능한 아이템이 없습니다.'}
                </p>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gap: 4 }}>
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        backgroundColor: selectedItemId === item.id ? '#3a2d6e' : '#12122a',
                        border: selectedItemId === item.id ? '1px solid #6c5ce7' : '1px solid transparent',
                        transition: 'all 0.1s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </p>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: '#888' }}>{TYPE_LABELS[item.type]}</span>
                          <span style={{ fontSize: 10, color: '#a78bfa' }}>{RARITY_LABELS[item.rarity]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminFormField>

            {selectedItem && (
              <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#eee' }}>{selectedItem.name}</p>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#aaa' }}>
                  <span>{selectedItem.category}</span>
                  <span>{TYPE_LABELS[selectedItem.type]}</span>
                  <span style={{ color: '#a78bfa' }}>{RARITY_LABELS[selectedItem.rarity]}</span>
                </div>
                {(selectedItem.baseAttack > 0 || selectedItem.baseDefense > 0 || selectedItem.baseHp > 0) && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 2 }}>
                    {selectedItem.baseAttack > 0 && <span style={{ color: '#ef4444' }}>ATK {selectedItem.baseAttack}</span>}
                    {selectedItem.baseDefense > 0 && <span style={{ color: '#3b82f6' }}>DEF {selectedItem.baseDefense}</span>}
                    {selectedItem.baseHp > 0 && <span style={{ color: '#22c55e' }}>HP {selectedItem.baseHp}</span>}
                  </div>
                )}
              </div>
            )}

            <AdminFormField label="판매 가격 (G)">
              <Input
                type="number"
                placeholder="0"
                value={String(registerPrice || '')}
                onChange={(e) => {
                  const value = Number(e.target.value || 0);
                  setRegisterPrice(Number.isFinite(value) ? value : 0);
                }}
              />
            </AdminFormField>
          </>
        )}
      </AdminCrudModalForm>
    </AdminLayout>
  );
}
