'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { admin } from '@gate-breaker/api-client';
import { Spinner } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { BattleLog, BattleResult, PaginatedResponse } from '@gate-breaker/types';

const LIMIT = 20;

const RESULT_FILTERS: { label: string; value: string }[] = [
  { label: '전체', value: '' },
  { label: '승리', value: 'VICTORY' },
  { label: '패배', value: 'DEFEAT' },
  { label: '도주', value: 'ESCAPE' },
];

const RESULT_BADGE_STYLES: Record<BattleResult, { bg: string; color: string; label: string }> = {
  VICTORY: { bg: '#2ecc7130', color: '#2ecc71', label: '승리' },
  DEFEAT: { bg: '#e9456030', color: '#e94560', label: '패배' },
  ESCAPE: { bg: '#f1c40f30', color: '#f1c40f', label: '도주' },
};

export default function LogsPage() {
  const [data, setData] = useState<PaginatedResponse<BattleLog> | null>(null);
  const [resultFilter, setResultFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.logs({
        result: resultFilter || undefined,
        page,
        limit: LIMIT,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '전투 로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [resultFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (value: string) => {
    setResultFilter(value);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const tableHeaderStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: '#aaa',
    borderBottom: '1px solid #333',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 14,
    color: '#eee',
    borderBottom: '1px solid #333',
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#eee' }}>
        전투 로그
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {RESULT_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            style={{
              backgroundColor: resultFilter === filter.value ? '#6c5ce7' : '#1a1a2e',
              color: resultFilter === filter.value ? '#fff' : '#aaa',
              border: '1px solid #2a2a4a',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: resultFilter === filter.value ? 600 : 400,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: '#e94560', textAlign: 'center', padding: 32 }}>{error}</p>
      )}

      {!loading && !error && data && (
        <>
          <div style={{ overflowX: 'auto' }}>
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
                  <th style={tableHeaderStyle}>유저</th>
                  <th style={tableHeaderStyle}>던전</th>
                  <th style={tableHeaderStyle}>결과</th>
                  <th style={tableHeaderStyle}>골드</th>
                  <th style={tableHeaderStyle}>경험치</th>
                  <th style={tableHeaderStyle}>일시</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => {
                  const badge = RESULT_BADGE_STYLES[log.result];
                  return (
                    <tr
                      key={log.id}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#252545';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {log.player?.nickname || log.userId?.slice(0, 8) || '-'}
                      </td>
                      <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {log.dungeon?.name || log.dungeonId?.slice(0, 8) || '-'}
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{(log.goldEarned ?? log.earnedGold ?? 0).toLocaleString()}</td>
                      <td style={tableCellStyle}>{(log.expEarned ?? log.earnedExp ?? 0).toLocaleString()}</td>
                      <td style={{ ...tableCellStyle, color: '#aaa', fontSize: 13 }}>
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  );
                })}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', color: '#888', padding: 32 }}>
                      전투 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 24,
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                backgroundColor: page <= 1 ? '#1a1a2e' : '#6c5ce7',
                color: page <= 1 ? '#555' : '#fff',
                border: '1px solid #2a2a4a',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 14,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              이전
            </button>
            <span style={{ color: '#aaa', fontSize: 14 }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                backgroundColor: page >= totalPages ? '#1a1a2e' : '#6c5ce7',
                color: page >= totalPages ? '#555' : '#fff',
                border: '1px solid #2a2a4a',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 14,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              다음
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
