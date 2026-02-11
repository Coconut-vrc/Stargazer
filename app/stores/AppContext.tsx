// app/stores/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserBean, CastBean } from '../common/types/entities';
import { STORAGE_KEYS } from '../common/config';
export type { UserBean, CastBean } from '../common/types/entities';

const VALID_PAGES: readonly string[] = ['import', 'db', 'cast', 'lotteryCondition', 'lottery', 'matching', 'guide'];

function getInitialSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const d = JSON.parse(raw) as unknown;
    if (!d || typeof d !== 'object') return null;
    const o = d as Record<string, unknown>;
    if (!Array.isArray(o.winners)) return null;
    if (typeof (o as { totalTables?: number }).totalTables !== 'number') return null;
    if (o.businessMode !== 'special' && o.businessMode !== 'normal') return null;
    if (o.matchingMode !== 'random' && o.matchingMode !== 'rotation') return null;
    const activePage = typeof o.activePage === 'string' && VALID_PAGES.includes(o.activePage)
      ? (o.activePage as PageType)
      : 'import';
    const userSheetUrl = o.userSheetUrl === null || (typeof o.userSheetUrl === 'string' && o.userSheetUrl.length > 0) ? (o.userSheetUrl as string | null) : null;
    const castSheetUrl = o.castSheetUrl === null || (typeof o.castSheetUrl === 'string' && o.castSheetUrl.length > 0) ? (o.castSheetUrl as string | null) : null;
    return {
      winners: o.winners as UserBean[],
      totalTables: (o as { totalTables: number }).totalTables,
      businessMode: o.businessMode as BusinessMode,
      matchingMode: o.matchingMode as MatchingMode,
      activePage,
      userSheetUrl: userSheetUrl ?? null,
      castSheetUrl: castSheetUrl ?? null,
    };
  } catch {
    return null;
  }
}

export type PageType = 'import' | 'db' | 'cast' | 'lotteryCondition' | 'lottery' | 'matching' | 'guide';

// マッチング方式
export type MatchingMode = 'rotation' | 'random';

// テーマ（ダーク / しょこめる）
export type ThemeMode = 'dark' | 'shokomel';

// 営業モード
export type BusinessMode = 'special' | 'normal';

/** LocalStorage に保存するセッションの形（当選者・設定・画面・URLを端末内で復元する用） */
export interface PersistedSession {
  winners: UserBean[];
  totalTables: number;
  businessMode: BusinessMode;
  matchingMode: MatchingMode;
  activePage: PageType;
  userSheetUrl: string | null;
  castSheetUrl: string | null;
}

export class Repository {
  private users: UserBean[] = [];
  private casts: CastBean[] = [];
  private userSheetUrl: string | null = null;
  private castSheetUrl: string | null = null;

  saveApplyUsers(users: UserBean[]) { this.users = users; }
  getAllApplyUsers(): UserBean[] { return this.users; }
  saveCasts(casts: CastBean[]) { this.casts = casts; }
  getAllCasts(): CastBean[] { return this.casts; }
  updateCastPresence(name: string, isPresent: boolean) {
    const cast = this.casts.find((c) => c.name === name);
    if (cast) cast.is_present = isPresent;
  }

  setUserSheetUrl(url: string | null) {
    this.userSheetUrl = url;
  }
  getUserSheetUrl(): string | null {
    return this.userSheetUrl;
  }

  setCastSheetUrl(url: string | null) {
    this.castSheetUrl = url;
  }
  getCastSheetUrl(): string | null {
    return this.castSheetUrl;
  }

  /** ログアウトやセッションリセット時にメモリ上の状態を全クリアする */
  resetAll() {
    this.users = [];
    this.casts = [];
    this.userSheetUrl = null;
    this.castSheetUrl = null;
  }
}

interface AppContextType {
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  repository: Repository;
  currentWinners: UserBean[];
  setCurrentWinners: (winners: UserBean[]) => void;
  matchingMode: MatchingMode;
  setMatchingMode: (mode: MatchingMode) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  businessMode: BusinessMode;
  setBusinessMode: (mode: BusinessMode) => void;
  /** 通常営業時の総テーブル数（空テーブル含む・マッチングで使用） */
  totalTables: number;
  setTotalTables: (n: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const repositoryInstance = new Repository();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialSession = useState(() => getInitialSession())[0];

  const [activePage, setActivePage] = useState<PageType>(initialSession?.activePage ?? 'import');
  const [currentWinners, setCurrentWinners] = useState<UserBean[]>(initialSession?.winners ?? []);
  const [matchingMode, setMatchingMode] = useState<MatchingMode>(initialSession?.matchingMode ?? 'random');
  const [themeMode, setThemeMode] = useState<ThemeMode>('shokomel');
  const [businessMode, setBusinessMode] = useState<BusinessMode>(initialSession?.businessMode ?? 'special');
  const [totalTables, setTotalTables] = useState<number>(initialSession?.totalTables ?? 15);

  // 初回マウント時：復元したセッションにシートURLがあれば Repository に反映（インポート画面の入力や他画面で参照される）
  useEffect(() => {
    if (initialSession?.userSheetUrl) repositoryInstance.setUserSheetUrl(initialSession.userSheetUrl);
    if (initialSession?.castSheetUrl) repositoryInstance.setCastSheetUrl(initialSession.castSheetUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- 初回のみ実行

  // 当選者・総テーブル数・営業モード・マッチング方式・表示中画面・シートURLを端末内（LocalStorage）に保存（リロード後も復元可能）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const session: PersistedSession = {
      winners: currentWinners,
      totalTables,
      businessMode,
      matchingMode,
      activePage,
      userSheetUrl: repositoryInstance.getUserSheetUrl(),
      castSheetUrl: repositoryInstance.getCastSheetUrl(),
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }, [currentWinners, totalTables, businessMode, matchingMode, activePage]);

  return (
    <AppContext.Provider value={{
      activePage,
      setActivePage,
      repository: repositoryInstance,
      currentWinners,
      setCurrentWinners,
      matchingMode,
      setMatchingMode,
      themeMode,
      setThemeMode,
      businessMode,
      setBusinessMode,
      totalTables,
      setTotalTables,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};