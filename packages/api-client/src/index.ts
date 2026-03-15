import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  User,
  UserStats,
  InventoryItem,
  Dungeon,
  BattleSession,
  BattleLogEntry,
  EnhanceInfo,
  EnhanceResult,
  ShopItem,
  Channel,
  ChatMessage,
  DashboardStats,
  PaginatedResponse,
  Monster,
  Item,
  DropTable,
  BattleLog,
  UserDetail,
  CodexItem,
  CodexItemDetail,
  CodexMonster,
  CodexMonsterDetail,
} from '@gate-breaker/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryRes = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
          });
          if (!retryRes.ok) {
            throw new ApiError(retryRes.status, await retryRes.text());
          }
          return retryRes.json();
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/';
        return undefined as T;
      }
    }
    // refreshToken 없는 경우에도 로그인 화면으로 이동
    localStorage.removeItem('accessToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/';
    return undefined as T;
  }

  if (!res.ok) {
    let msg: string;
    try {
      const body = await res.json();
      msg = body.message || JSON.stringify(body);
    } catch {
      msg = res.statusText;
    }
    throw new ApiError(res.status, msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ===== Auth =====
export const auth = {
  register: (dto: RegisterDto) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  login: (dto: LoginDto) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  withdraw: () => request<{ message: string }>('/auth/withdraw', { method: 'DELETE' }),
  kakaoUrl: () => `${API_BASE}/auth/kakao`,
};

// ===== User =====
export const user = {
  me: () => request<User>('/user/me'),
  updateMe: (dto: { nickname?: string }) =>
    request<User>('/user/me', { method: 'PATCH', body: JSON.stringify(dto) }),
  stats: () => request<UserStats>('/user/me/stats'),
  uploadProfileImage: (file: File) =>
    uploadFile<User>('/user/me/profile-image', file),
  deleteProfileImage: () =>
    request<User>('/user/me/profile-image', { method: 'DELETE' }),
};

// ===== Inventory =====
export const inventory = {
  list: () => request<InventoryItem[]>('/inventory'),
  equip: (inventoryId: string) =>
    request<InventoryItem>('/inventory/equip', {
      method: 'POST',
      body: JSON.stringify({ inventoryId }),
    }),
  unequip: (inventoryId: string) =>
    request<InventoryItem>('/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({ inventoryId }),
    }),
  sell: (inventoryId: string, quantity?: number) =>
    request<{ soldQuantity: number; goldEarned: number }>(
      '/inventory/sell',
      { method: 'POST', body: JSON.stringify({ inventoryId, quantity }) },
    ),
  discard: (id: string) =>
    request<{ message: string }>(`/inventory/${id}`, { method: 'DELETE' }),
  restore: (inventoryId: string) =>
    request<{ message: string; inventory: InventoryItem; goldCost: number }>(
      '/inventory/restore',
      { method: 'POST', body: JSON.stringify({ inventoryId }) },
    ),
};

// ===== Dungeon =====
export const dungeon = {
  list: () => request<Dungeon[]>('/dungeon'),
  get: (id: string) => request<Dungeon>(`/dungeon/${id}`),
  enter: (id: string, monsterIndex?: number, isBoss?: boolean) => {
    const params = new URLSearchParams();
    if (monsterIndex != null) params.set('monsterIndex', String(monsterIndex));
    if (isBoss) params.set('isBoss', 'true');
    const qs = params.toString();
    return request<BattleSession>(`/dungeon/${id}/enter${qs ? `?${qs}` : ''}`, { method: 'POST' });
  },
};

// ===== Battle =====
export const battle = {
  attack: () =>
    request<{
      status: string;
      playerHp: number;
      playerMaxHp: number;
      playerMp: number;
      playerMaxMp: number;
      enemyHp: number;
      enemyMaxHp: number;
      log: BattleLogEntry[];
      result?: string | null;
      rewards?: { exp: number; gold: number; items: unknown[] };
      penalty?: { previousExp: number; expLost: number; currentExp: number; goldLost: number } | null;
      expGained?: number;
      goldGained?: number;
    }>('/battle/attack', { method: 'POST' }),
  skill: () =>
    request<{
      status: string;
      playerHp: number;
      playerMaxHp: number;
      playerMp: number;
      playerMaxMp: number;
      enemyHp: number;
      enemyMaxHp: number;
      log: BattleLogEntry[];
      result?: string | null;
      rewards?: { exp: number; gold: number; items: unknown[] };
      penalty?: { previousExp: number; expLost: number; currentExp: number; goldLost: number } | null;
      expGained?: number;
      goldGained?: number;
    }>('/battle/skill', { method: 'POST' }),
  item: () =>
    request<BattleLogEntry>('/battle/item', { method: 'POST' }),
  escape: () =>
    request<{ result: string; rewards: unknown }>('/battle/escape', {
      method: 'POST',
    }),
  status: () => request<BattleSession>('/battle/status'),
  confirm: () =>
    request<{ message: string }>('/battle/confirm', { method: 'POST' }),
};

// ===== Enhance =====
export const enhance = {
  info: (inventoryId: string) =>
    request<EnhanceInfo>(`/enhance/info/${inventoryId}`),
  enhance: (inventoryId: string) =>
    request<EnhanceResult>('/enhance', {
      method: 'POST',
      body: JSON.stringify({ inventoryId }),
    }),
};

// ===== Shop =====
export const shop = {
  list: () => request<ShopItem[]>('/shop'),
  buy: (itemId: string, quantity?: number) =>
    request<{ message: string; totalCost: number; remainingGold: number }>(
      '/shop/buy',
      { method: 'POST', body: JSON.stringify({ itemId, quantity }) },
    ),
};

// ===== Channel =====
export const channel = {
  list: () => request<Channel[]>('/channel'),
  search: (name: string) => request<Channel[]>(`/channel/search?name=${encodeURIComponent(name)}`),
  me: () => request<Channel>('/channel/me'),
  get: (id: string) => request<Channel>(`/channel/${id}`),
  create: (name: string, maxMembers?: number) =>
    request<Channel>('/channel', {
      method: 'POST',
      body: JSON.stringify({ name, maxMembers }),
    }),
  join: (id: string) =>
    request<Channel>(`/channel/${id}/join`, { method: 'POST' }),
  leave: (id: string) =>
    request<{ message: string }>(`/channel/${id}/leave`, { method: 'POST' }),
  chat: (id: string) => request<ChatMessage[]>(`/channel/${id}/chat`),
};

// ===== Codex =====
export const codex = {
  items: () => request<CodexItem[]>('/codex/items'),
  itemDetail: (id: string) => request<CodexItemDetail>(`/codex/items/${id}`),
  monsters: () => request<CodexMonster[]>('/codex/monsters'),
  monsterDetail: (id: string) => request<CodexMonsterDetail>(`/codex/monsters/${id}`),
};

async function uploadFile<T>(
  path: string,
  file: File,
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let msg: string;
    try {
      const body = await res.json();
      msg = body.message || JSON.stringify(body);
    } catch {
      msg = res.statusText;
    }
    throw new ApiError(res.status, msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ===== Admin =====
export const admin = {
  dashboard: () => request<DashboardStats>('/admin/dashboard'),
  users: {
    list: async (params?: { search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const res = await request<User[] | PaginatedResponse<User>>(`/admin/users?${q}`);
      if (Array.isArray(res)) {
        return {
          data: res,
          total: res.length,
          page: params?.page ?? 1,
        } as PaginatedResponse<User>;
      }
      return res;
    },
    get: (id: string) => request<UserDetail>(`/admin/users/${id}`),
    update: (id: string, dto: Partial<Pick<User, 'level' | 'exp' | 'gold' | 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'attack' | 'defense'>>) =>
      request<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    ban: (id: string) =>
      request<{ message: string; userId: string }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  },
  logs: async (params?: { result?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.result) q.set('result', params.result);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const res = await request<BattleLog[] | PaginatedResponse<BattleLog>>(`/admin/logs?${q}`);
    if (Array.isArray(res)) {
      return {
        data: res,
        total: res.length,
        page: params?.page ?? 1,
      } as PaginatedResponse<BattleLog>;
    }
    return res;
  },
  dungeons: {
    list: () => request<Dungeon[]>('/admin/dungeons'),
    create: (dto: Partial<Dungeon>) =>
      request<Dungeon>('/admin/dungeons', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: Partial<Dungeon>) =>
      request<Dungeon>(`/admin/dungeons/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    delete: (id: string) =>
      request<{ message: string }>(`/admin/dungeons/${id}`, { method: 'DELETE' }),
  },
  monsters: {
    list: () => request<Monster[]>('/admin/monsters'),
    create: (dto: Partial<Monster>) =>
      request<Monster>('/admin/monsters', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: Partial<Monster>) =>
      request<Monster>(`/admin/monsters/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    delete: (id: string) =>
      request<{ message: string }>(`/admin/monsters/${id}`, { method: 'DELETE' }),
    uploadImage: (id: string, file: File) =>
      uploadFile<Monster>(`/admin/monsters/${id}/image`, file),
    deleteImage: (id: string) =>
      request<Monster>(`/admin/monsters/${id}/image`, { method: 'DELETE' }),
  },
  items: {
    list: () => request<Item[]>('/admin/items'),
    create: (dto: Partial<Item>) =>
      request<Item>('/admin/items', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: Partial<Item>) =>
      request<Item>(`/admin/items/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    delete: (id: string) =>
      request<{ message: string }>(`/admin/items/${id}`, { method: 'DELETE' }),
    uploadImage: (id: string, file: File) =>
      uploadFile<Item>(`/admin/items/${id}/image`, file),
    deleteImage: (id: string) =>
      request<Item>(`/admin/items/${id}/image`, { method: 'DELETE' }),
  },
  shop: {
    list: () => request<Item[]>('/admin/shop'),
    update: (id: string, dto: { buyPrice: number }) =>
      request<Item>(`/admin/shop/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    remove: (id: string) =>
      request<Item>(`/admin/shop/${id}`, { method: 'DELETE' }),
  },
  dropTables: {
    list: () => request<DropTable[]>('/admin/drop-tables'),
    create: (dto: Partial<DropTable>) =>
      request<DropTable>('/admin/drop-tables', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: Partial<DropTable>) =>
      request<DropTable>(`/admin/drop-tables/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    delete: (id: string) =>
      request<{ message: string }>(`/admin/drop-tables/${id}`, { method: 'DELETE' }),
  },
};

export { ApiError };
export type { AuthResponse, User, UserStats, InventoryItem, Dungeon, BattleSession, BattleLogEntry, EnhanceInfo, EnhanceResult, ShopItem, Channel, ChatMessage, DashboardStats, PaginatedResponse, Monster, Item, DropTable, BattleLog, UserDetail, CodexItem, CodexItemDetail, CodexMonster, CodexMonsterDetail };
