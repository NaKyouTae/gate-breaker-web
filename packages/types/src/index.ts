// ===== Enums =====
export type Role = 'USER' | 'ADMIN';
export type ItemType = 'WEAPON' | 'ARMOR' | 'GLOVE' | 'SHOE' | 'RING' | 'NECKLACE' | 'MATERIAL' | 'CONSUMABLE';
export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
export type EquipSlot = 'WEAPON';
/** @deprecated 무기 슬롯만 사용 */
export type LegacyEquipSlot = 'WEAPON' | 'ARMOR' | 'GLOVE' | 'SHOE' | 'RING' | 'NECKLACE';
export type BattleResult = 'VICTORY' | 'DEFEAT' | 'ESCAPE';
export type ChannelStatus = 'WAITING' | 'IN_DUNGEON';
export type ChannelMemberRole = 'HOST' | 'MEMBER';

// ===== User =====
export interface User {
  id: string;
  loginId: string;
  email: string;
  nickname: string;
  level: number;
  exp: number;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  criticalRate: number;
  profileImageUrl?: string | null;
  role: Role;
  kakaoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  base: { hp: number; mp: number; attack: number; defense: number; criticalRate: number };
  bonuses: { hp: number; mp: number; attack: number; defense: number; criticalRate: number };
  total: { hp: number; mp: number; attack: number; defense: number; criticalRate: number };
}

// ===== Auth =====
export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'nickname' | 'level'>;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDto {
  loginId: string;
  email: string;
  password: string;
  nickname: string;
}

export interface LoginDto {
  loginId: string;
  password: string;
}

// ===== Item =====
export interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  baseAttack: number;
  baseDefense: number;
  baseHp: number;
  healHp: number;
  imageUrl?: string | null;
  sellPrice: number;
  buyPrice?: number;
}

// ===== Inventory =====
export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  item: Item;
  enhanceLevel: number;
  isEquipped: boolean;
  equippedSlot?: EquipSlot;
  quantity: number;
  isDestroyed: boolean;
}

// ===== Dungeon =====
export interface Dungeon {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  rewardGoldMin: number;
  rewardGoldMax: number;
  rewardExp: number;
  monsters?: Monster[];
}

// ===== Monster =====
export interface Monster {
  id: string;
  name: string;
  dungeonId: string;
  hp: number;
  attack: number;
  defense: number;
  expReward: number;
  goldReward: number;
  isBoss: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  dropTables?: DropTable[];
}

// ===== DropTable =====
export interface DropTable {
  id: string;
  monsterId: string;
  itemId: string;
  item?: Item;
  monster?: Monster;
  dropRate: number;
}

// ===== Battle =====
export interface BattleSession {
  id: string;
  userId: string;
  dungeonId: string;
  monster: { name: string; imageUrl?: string | null; hp: number; attack: number; defense: number };
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  playerAttack: number;
  playerDefense: number;
  playerCriticalRate: number;
  enemyHp: number;
  enemyMaxHp: number;
  isPlayerTurn: boolean;
  log: BattleLogEntry[];
  result: BattleResult | null;
  rewards?: { exp: number; gold: number; items: Item[] };
  penalty?: { previousExp: number; expLost: number; currentExp: number; goldLost: number } | null;
}

export interface BattleLogEntry {
  message: string;
  type: string;
  damage?: number;
  timestamp: string;
}

// ===== BattleLog (history) =====
export interface BattleLog {
  id: string;
  result: BattleResult;
  goldEarned?: number;
  expEarned?: number;
  earnedGold?: number;
  earnedExp?: number;
  userId?: string;
  dungeonId?: string;
  player?: { id: string; nickname: string };
  dungeon?: { id: string; name: string };
  createdAt: string;
}

// ===== Channel =====
export interface Channel {
  id: string;
  name: string;
  maxMembers: number;
  status: ChannelStatus;
  dungeonId?: string;
  members: ChannelMember[];
  dungeon?: Dungeon;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  user?: Pick<User, 'id' | 'nickname' | 'level' | 'profileImageUrl'>;
  role: ChannelMemberRole;
  joinedAt: string;
}

export interface ChatMessage {
  userId: string;
  nickname: string;
  message: string;
  timestamp: number | string;
  type?: 'enhance' | 'dungeon-invite' | 'dungeon-start' | 'join';
  data?: Record<string, unknown>;
}

// ===== Enhance =====
export interface EnhanceInfo {
  item: Item;
  currentLevel: number;
  nextLevel?: number;
  successRate: number;
  failurePenalty: string;
  maintainRate?: number;
  downgradeRate?: number;
  destroyRate?: number;
  cost: number;
}

export interface EnhanceResult {
  success: boolean;
  newLevel?: number;
  message: string;
}

// ===== Shop =====
export interface ShopItem extends Item {
  buyPrice: number;
}

// ===== GameConfig =====
export interface GameConfig {
  id: string;
  category: string;
  key: string;
  value: unknown;
  description?: string;
}

// ===== Codex =====
export interface CodexItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  imageUrl?: string | null;
  discovered: boolean;
}

export interface CodexItemDetail extends Item {
  discovered: boolean;
  dropSources: {
    monsterId: string;
    monsterName: string;
    dungeonName: string;
    dropRate: number;
  }[];
  shopAvailable: boolean;
}

export interface CodexMonster {
  id: string;
  name: string;
  imageUrl?: string | null;
  dungeonName: string;
  encountered: boolean;
}

export interface CodexMonsterDetail extends Monster {
  encountered: boolean;
  dungeon: { id: string; name: string; minLevel: number; maxLevel: number };
  description?: string;
  drops: {
    itemId: string;
    itemName: string;
    itemRarity: ItemRarity;
    itemImageUrl?: string | null;
    dropRate: number;
  }[];
}

// ===== Admin =====
export interface DashboardStats {
  totalUsers: number;
  activeUsers?: number;
  activeToday?: number;
  totalBattles?: number;
  battlesToday?: number;
  totalItems?: number;
  stats?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
}

export interface UserDetail extends User {
  inventory: InventoryItem[];
  battleLogs: BattleLog[];
}
