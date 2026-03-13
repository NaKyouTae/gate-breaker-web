'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Dungeon } from '@gate-breaker/types';
import { Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';

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

  const saveCreate = async () => {
    setSaving(true);
    try {
      await admin.dungeons.create(creating);
      addToast('던전을 생성했습니다.', 'success');
      setCreating(EMPTY_FORM);
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

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>던전 CRUD</h1>

      <div
        style={{
          backgroundColor: '#16162a',
          border: '1px solid #2a2a4a',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ccc', marginTop: 0, marginBottom: 14 }}>
          던전 생성
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: 8 }}>
          <Input
            value={creating.name}
            placeholder="이름"
            onChange={(e) => setCreating((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            type="number"
            value={String(creating.minLevel)}
            placeholder="최소레벨"
            onChange={(e) => changeNumber(setCreating, 'minLevel', e.target.value)}
          />
          <Input
            type="number"
            value={String(creating.maxLevel)}
            placeholder="최대레벨"
            onChange={(e) => changeNumber(setCreating, 'maxLevel', e.target.value)}
          />
          <Input
            type="number"
            value={String(creating.rewardGoldMin)}
            placeholder="골드(최소)"
            onChange={(e) => changeNumber(setCreating, 'rewardGoldMin', e.target.value)}
          />
          <Input
            type="number"
            value={String(creating.rewardGoldMax)}
            placeholder="골드(최대)"
            onChange={(e) => changeNumber(setCreating, 'rewardGoldMax', e.target.value)}
          />
          <Input
            type="number"
            value={String(creating.rewardExp)}
            placeholder="경험치"
            onChange={(e) => changeNumber(setCreating, 'rewardExp', e.target.value)}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Button loading={saving} onClick={saveCreate}>생성</Button>
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
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(d)}>수정</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(d.id)}>삭제</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={!!editingId} onClose={closeEditModal} title="던전 수정">
        <div style={{ display: 'grid', gap: 10 }}>
          <Input
            value={editing.name}
            placeholder="이름"
            onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input
              type="number"
              value={String(editing.minLevel)}
              placeholder="최소레벨"
              onChange={(e) => changeNumber(setEditing, 'minLevel', e.target.value)}
            />
            <Input
              type="number"
              value={String(editing.maxLevel)}
              placeholder="최대레벨"
              onChange={(e) => changeNumber(setEditing, 'maxLevel', e.target.value)}
            />
            <Input
              type="number"
              value={String(editing.rewardGoldMin)}
              placeholder="골드(최소)"
              onChange={(e) => changeNumber(setEditing, 'rewardGoldMin', e.target.value)}
            />
            <Input
              type="number"
              value={String(editing.rewardGoldMax)}
              placeholder="골드(최대)"
              onChange={(e) => changeNumber(setEditing, 'rewardGoldMax', e.target.value)}
            />
            <Input
              type="number"
              value={String(editing.rewardExp)}
              placeholder="경험치"
              onChange={(e) => changeNumber(setEditing, 'rewardExp', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button variant="ghost" onClick={closeEditModal}>취소</Button>
            <Button loading={saving} onClick={saveEdit}>저장</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
