'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Item, ItemRarity, ItemType } from '@gate-breaker/types';
import { Input, Spinner, useToast } from '@gate-breaker/ui';
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

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 600,
  color: '#aaa',
  borderBottom: '1px solid #333',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#eee',
  borderBottom: '1px solid #333',
};

export default function ShopPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingPrice, setEditingPrice] = useState(0);

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

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>상점 관리</h1>

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
                <AdminActionIconButton kind="edit" onClick={() => openEditModal(item)} />
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
              <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>현재 가격</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>
                  {(item.buyPrice || 0).toLocaleString()} G
                </p>
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
    </AdminLayout>
  );
}
