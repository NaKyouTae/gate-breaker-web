'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Item } from '@gate-breaker/types';
import { Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';

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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>상점 가격 관리</h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1a2e', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#16213e' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>아이템</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>카테고리</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>타입</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>등급</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>현재 가격</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '60px 16px', fontSize: 14, color: '#666', textAlign: 'center', borderBottom: '1px solid #333' }}>
                  상점 등록 아이템이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{ backgroundColor: hoveredRow === item.id ? '#252545' : 'transparent' }}
                  onMouseEnter={() => setHoveredRow(item.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>{item.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>{item.category}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>{item.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>{item.rarity}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>{(item.buyPrice || 0).toLocaleString()} G</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(item)}>수정</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Modal isOpen={!!editingItem} onClose={closeEditModal} title="상점 가격 수정">
        {editingItem && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: '#eee', fontWeight: 600 }}>{editingItem.name}</div>
            <div style={{ color: '#999', fontSize: 13 }}>현재 가격: {(editingItem.buyPrice || 0).toLocaleString()} G</div>
            <Input
              type="number"
              value={String(editingPrice)}
              onChange={(e) => {
                const value = Number(e.target.value || 0);
                setEditingPrice(Number.isFinite(value) ? value : 0);
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={closeEditModal}>취소</Button>
              <Button loading={updatingId === editingItem.id} onClick={save}>저장</Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
