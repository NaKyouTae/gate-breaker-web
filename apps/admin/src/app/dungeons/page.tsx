'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Dungeon, Monster } from '@gate-breaker/types';
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
  const [monsterMap, setMonsterMap] = useState<Record<string, Monster[]>>({});
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
      const [dungeons, monsters] = await Promise.all([
        admin.dungeons.list(),
        admin.monsters.list(),
      ]);
      setRows(dungeons);
      // 던전 ID별 몬스터 목록 맵핑
      const map: Record<string, Monster[]> = {};
      for (const m of monsters) {
        if (!map[m.dungeonId]) map[m.dungeonId] = [];
        map[m.dungeonId].push(m);
      }
      setMonsterMap(map);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
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
      ) : rows.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>던전이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rows.map((d) => (
            <div
              key={d.id}
              style={{
                backgroundColor: hoveredRow === d.id ? '#252545' : '#1a1a2e',
                borderRadius: 12,
                border: '1px solid #2a2a4a',
                padding: '16px 20px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={() => setHoveredRow(d.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#eee' }}>{d.name}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <AdminActionIconButton kind="edit" onClick={() => openEditModal(d)} />
                  <AdminActionIconButton kind="delete" onClick={() => remove(d.id)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>레벨 범위</p>
                  <p style={{ fontSize: 13, color: '#eee', fontWeight: 600 }}>{d.minLevel}~{d.maxLevel}</p>
                </div>
                <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>골드</p>
                  <p style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>{d.rewardGoldMin}~{d.rewardGoldMax}</p>
                </div>
                <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>경험치</p>
                  <p style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{d.rewardExp}</p>
                </div>
              </div>
              {/* 등장 몬스터 */}
              <div style={{ borderTop: '1px solid #2a2a4a', paddingTop: 10 }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>등장 몬스터</p>
                {(monsterMap[d.id] ?? []).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#555' }}>없음</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(monsterMap[d.id] ?? []).map((m) => (
                      <div
                        key={m.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#12122a', borderRadius: 6, padding: '4px 8px' }}
                      >
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt={m.name} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 12 }}>👹</span>
                        )}
                        <span style={{ fontSize: 12, color: '#ccc' }}>{m.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
