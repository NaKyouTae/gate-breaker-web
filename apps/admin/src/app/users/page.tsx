'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { admin } from '@gate-breaker/api-client';
import { Spinner } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { User, PaginatedResponse } from '@gate-breaker/types';

const LIMIT = 20;

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.users.list({ search: search || undefined, page, limit: LIMIT });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '유저 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
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
        유저 관리
      </h1>

      <form onSubmit={handleSearch} style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="닉네임 또는 이메일로 검색"
          style={{
            flex: 1,
            maxWidth: 400,
            backgroundColor: '#1a1a2e',
            border: '1px solid #2a2a4a',
            borderRadius: 6,
            padding: '10px 14px',
            color: '#eee',
            outline: 'none',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: '#6c5ce7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </form>

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
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>닉네임</th>
                  <th style={tableHeaderStyle}>이메일</th>
                  <th style={tableHeaderStyle}>레벨</th>
                  <th style={tableHeaderStyle}>골드</th>
                  <th style={tableHeaderStyle}>역할</th>
                  <th style={tableHeaderStyle}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/users/${user.id}`)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#252545';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                      {user.id.slice(0, 8)}...
                    </td>
                    <td style={tableCellStyle}>{user.nickname}</td>
                    <td style={{ ...tableCellStyle, color: '#aaa' }}>{user.email}</td>
                    <td style={tableCellStyle}>{user.level}</td>
                    <td style={tableCellStyle}>{user.gold.toLocaleString()}</td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: user.role === 'ADMIN' ? '#6c5ce730' : '#2a2a4a',
                          color: user.role === 'ADMIN' ? '#6c5ce7' : '#aaa',
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ ...tableCellStyle, color: '#aaa', fontSize: 13 }}>
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...tableCellStyle, textAlign: 'center', color: '#888', padding: 32 }}>
                      검색 결과가 없습니다.
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
