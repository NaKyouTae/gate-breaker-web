'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { DropTable, Item, Monster } from '@gate-breaker/types';
import { Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';

type DropForm = {
  monsterId: string;
  itemId: string;
  dropRate: number;
};

const EMPTY_FORM: DropForm = {
  monsterId: '',
  itemId: '',
  dropRate: 0.1,
};

const selectStyle: React.CSSProperties = {
  background: '#0a0a0f',
  border: '1px solid #333',
  color: '#eee',
  borderRadius: 6,
  height: 38,
  padding: '0 10px',
};

export default function DropTablesPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<DropTable[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<DropForm>(EMPTY_FORM);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState(0);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const [dropRows, monsterRows, itemRows] = await Promise.all([
        admin.dropTables.list(),
        admin.monsters.list(),
        admin.items.list(),
      ]);
      setRows(dropRows);
      setMonsters(monsterRows);
      setItems(itemRows);

      if (!creating.monsterId && monsterRows.length > 0) {
        setCreating((prev) => ({ ...prev, monsterId: monsterRows[0].id }));
      }
      if (!creating.itemId && itemRows.length > 0) {
        setCreating((prev) => ({ ...prev, itemId: itemRows[0].id }));
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '드롭 테이블을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, creating.itemId, creating.monsterId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const createRow = async () => {
    setSaving(true);
    try {
      await admin.dropTables.create(creating);
      addToast('드롭 테이블을 생성했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '드롭 테이블 생성에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (row: DropTable) => {
    setEditingId(row.id);
    setEditingRate(row.dropRate);
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditingRate(0);
  };

  const updateRate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await admin.dropTables.update(editingId, { dropRate: editingRate });
      addToast('드롭 확률을 수정했습니다.', 'success');
      closeEditModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '수정에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await admin.dropTables.delete(id);
      addToast('드롭 테이블을 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '삭제에 실패했습니다.', 'error');
    }
  };

  const editingRow = rows.find((row) => row.id === editingId) || null;

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>드롭 테이블 CRUD</h1>

      <div
        style={{
          backgroundColor: '#16162a',
          border: '1px solid #2a2a4a',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#eee', marginBottom: 14 }}>드롭 테이블 생성</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={creating.monsterId}
            onChange={(e) => setCreating((p) => ({ ...p, monsterId: e.target.value }))}
            style={selectStyle}
          >
            {monsters.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select
            value={creating.itemId}
            onChange={(e) => setCreating((p) => ({ ...p, itemId: e.target.value }))}
            style={selectStyle}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={String(creating.dropRate)}
            onChange={(e) => setCreating((p) => ({ ...p, dropRate: Number(e.target.value || 0) }))}
          />
          <Button loading={saving} onClick={createRow}>생성</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#1a1a2e',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <thead style={{ backgroundColor: '#16213e' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>몬스터</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>아이템</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>드롭 확률</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{ padding: '12px 16px', fontSize: 14, color: '#666', borderBottom: '1px solid #333', textAlign: 'center' }}
                >
                  드롭 테이블이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ backgroundColor: hoveredRow === row.id ? '#252545' : 'transparent' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>
                    {row.monster?.name || row.monsterId}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>
                    {row.item?.name || row.itemId}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>
                    {row.dropRate}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#eee', borderBottom: '1px solid #333' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>수정</Button>
                      <Button size="sm" variant="danger" onClick={() => remove(row.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Modal isOpen={!!editingId} onClose={closeEditModal} title="드롭 확률 수정">
        {editingRow && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: '#999', fontSize: 13 }}>
              {editingRow.monster?.name || editingRow.monsterId} / {editingRow.item?.name || editingRow.itemId}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={String(editingRate)}
              onChange={(e) => setEditingRate(Number(e.target.value || 0))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={closeEditModal}>취소</Button>
              <Button loading={saving} onClick={updateRate}>저장</Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
