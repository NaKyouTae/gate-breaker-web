'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { DropTable, Item, Monster } from '@gate-breaker/types';
import { Button, Input, Spinner, useToast } from '@gate-breaker/ui';
import { AdminActionIconButton } from '@/components/admin-action-icon-button';
import { AdminLayout } from '@/components/admin-layout';
import { AdminCrudModalForm, AdminFormField } from '@/components/admin-crud-modal-form';

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
  width: '100%',
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

export default function DropTablesPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<DropTable[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<DropForm>(EMPTY_FORM);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DropForm>(EMPTY_FORM);

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

  const openCreateModal = () => {
    if (!creating.monsterId && monsters.length > 0) {
      setCreating((prev) => ({ ...prev, monsterId: monsters[0].id }));
    }
    if (!creating.itemId && items.length > 0) {
      setCreating((prev) => ({ ...prev, itemId: items[0].id }));
    }
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreating((prev) => ({ ...EMPTY_FORM, monsterId: prev.monsterId, itemId: prev.itemId }));
  };

  const createRow = async () => {
    setSaving(true);
    try {
      await admin.dropTables.create(creating);
      addToast('드롭 테이블을 생성했습니다.', 'success');
      closeCreateModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '드롭 테이블 생성에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (row: DropTable) => {
    setEditingId(row.id);
    setEditing({
      monsterId: row.monsterId,
      itemId: row.itemId,
      dropRate: row.dropRate,
    });
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditing(EMPTY_FORM);
  };

  const updateRow = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await admin.dropTables.update(editingId, editing);
      addToast('드롭 테이블을 수정했습니다.', 'success');
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

  const renderForm = (
    form: DropForm,
    setter: (updater: (prev: DropForm) => DropForm) => void,
  ) => (
    <>
      <AdminFormField label="몬스터">
        <select
          value={form.monsterId}
          onChange={(e) => setter((p) => ({ ...p, monsterId: e.target.value }))}
          style={selectStyle}
        >
          {monsters.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="아이템">
        <select
          value={form.itemId}
          onChange={(e) => setter((p) => ({ ...p, itemId: e.target.value }))}
          style={selectStyle}
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="드롭 확률 (0 ~ 1)">
        <Input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={String(form.dropRate)}
          onChange={(e) => setter((p) => ({ ...p, dropRate: Number(e.target.value || 0) }))}
        />
      </AdminFormField>
    </>
  );

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>드롭 테이블</h1>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button onClick={openCreateModal}>생성</Button>
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
              <th style={thStyle}>몬스터</th>
              <th style={thStyle}>아이템</th>
              <th style={thStyle}>드롭 확률</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{ ...tdStyle, color: '#666', textAlign: 'center' }}
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
                  <td style={tdStyle}>
                    {row.monster?.name || row.monsterId}
                  </td>
                  <td style={tdStyle}>
                    {row.item?.name || row.itemId}
                  </td>
                  <td style={tdStyle}>
                    {row.dropRate}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <AdminActionIconButton kind="edit" onClick={() => openEditModal(row)} />
                      <AdminActionIconButton kind="delete" onClick={() => remove(row.id)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <AdminCrudModalForm
        isOpen={createOpen}
        onClose={closeCreateModal}
        onSubmit={createRow}
        title="드롭 테이블 생성"
        submitLabel="생성"
        loading={saving}
      >
        {renderForm(creating, setCreating)}
      </AdminCrudModalForm>

      <AdminCrudModalForm
        isOpen={!!editingId}
        onClose={closeEditModal}
        onSubmit={updateRow}
        title="드롭 테이블 수정"
        submitLabel="저장"
        loading={saving}
      >
        {renderForm(editing, setEditing)}
      </AdminCrudModalForm>
    </AdminLayout>
  );
}
