'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Dungeon } from '@gate-breaker/types';
import { Button, Input, Spinner, useToast } from '@gate-breaker/ui';
import { AdminActionIconButton } from '@/components/admin-action-icon-button';
import { AdminLayout } from '@/components/admin-layout';
import { AdminCrudModalForm, AdminFormField } from '@/components/admin-crud-modal-form';

type DungeonForm = {
  name: string;
  minLevel: number;
  maxLevel: number;
  rewardGoldMin: number;
  rewardGoldMax: number;
  rewardExp: number;
};

const EMPTY_FORM: DungeonForm = {
  name: '',
  minLevel: 1,
  maxLevel: 1,
  rewardGoldMin: 0,
  rewardGoldMax: 0,
  rewardExp: 0,
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

export default function DungeonsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<Dungeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<DungeonForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DungeonForm>(EMPTY_FORM);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await admin.dungeons.list();
      setRows(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '던전 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fillForm = (d: Dungeon): DungeonForm => ({
    name: d.name,
    minLevel: d.minLevel,
    maxLevel: d.maxLevel,
    rewardGoldMin: d.rewardGoldMin,
    rewardGoldMax: d.rewardGoldMax,
    rewardExp: d.rewardExp,
  });

  const openEditModal = (dungeon: Dungeon) => {
    setEditingId(dungeon.id);
    setEditing(fillForm(dungeon));
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditing(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreating(EMPTY_FORM);
  };

  const saveCreate = async () => {
    setSaving(true);
    try {
      await admin.dungeons.create(creating);
      addToast('던전을 생성했습니다.', 'success');
      closeCreateModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '던전 생성에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await admin.dungeons.update(editingId, editing);
      addToast('던전을 수정했습니다.', 'success');
      closeEditModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '던전 수정에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await admin.dungeons.delete(id);
      addToast('던전을 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '던전 삭제에 실패했습니다.', 'error');
    }
  };

  const changeNumber = (
    setter: (updater: (prev: DungeonForm) => DungeonForm) => void,
    key: keyof DungeonForm,
    value: string,
  ) => {
    const parsed = Number(value || 0);
    setter((prev) => ({ ...prev, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const renderForm = (
    form: DungeonForm,
    setter: (updater: (prev: DungeonForm) => DungeonForm) => void,
  ) => (
    <>
      <AdminFormField label="이름">
        <Input value={form.name} onChange={(e) => setter((p) => ({ ...p, name: e.target.value }))} />
      </AdminFormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <AdminFormField label="최소 레벨">
          <Input type="number" value={String(form.minLevel)} onChange={(e) => changeNumber(setter, 'minLevel', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="최대 레벨">
          <Input type="number" value={String(form.maxLevel)} onChange={(e) => changeNumber(setter, 'maxLevel', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="골드 최소">
          <Input type="number" value={String(form.rewardGoldMin)} onChange={(e) => changeNumber(setter, 'rewardGoldMin', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="골드 최대">
          <Input type="number" value={String(form.rewardGoldMax)} onChange={(e) => changeNumber(setter, 'rewardGoldMax', e.target.value)} />
        </AdminFormField>
      </div>
      <AdminFormField label="경험치">
        <Input type="number" value={String(form.rewardExp)} onChange={(e) => changeNumber(setter, 'rewardExp', e.target.value)} />
      </AdminFormField>
    </>
  );

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>던전 관리</h1>

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
              <th style={thStyle}>이름</th>
              <th style={thStyle}>최소레벨</th>
              <th style={thStyle}>최대레벨</th>
              <th style={thStyle}>골드(최소)</th>
              <th style={thStyle}>골드(최대)</th>
              <th style={thStyle}>경험치</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                style={{ backgroundColor: hoveredRow === d.id ? '#252545' : 'transparent' }}
                onMouseEnter={() => setHoveredRow(d.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.minLevel}</td>
                <td style={tdStyle}>{d.maxLevel}</td>
                <td style={tdStyle}>{d.rewardGoldMin}</td>
                <td style={tdStyle}>{d.rewardGoldMax}</td>
                <td style={tdStyle}>{d.rewardExp}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <AdminActionIconButton kind="edit" onClick={() => openEditModal(d)} />
                    <AdminActionIconButton kind="delete" onClick={() => remove(d.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AdminCrudModalForm
        isOpen={createOpen}
        onClose={closeCreateModal}
        onSubmit={saveCreate}
        title="던전 생성"
        submitLabel="생성"
        loading={saving}
      >
        {renderForm(creating, setCreating)}
      </AdminCrudModalForm>

      <AdminCrudModalForm
        isOpen={!!editingId}
        onClose={closeEditModal}
        onSubmit={saveEdit}
        title="던전 수정"
        submitLabel="저장"
        loading={saving}
      >
        {renderForm(editing, setEditing)}
      </AdminCrudModalForm>
    </AdminLayout>
  );
}
