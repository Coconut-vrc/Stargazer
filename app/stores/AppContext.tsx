// app/stores/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { UserBean, CastBean } from '../common/types/entities';
export type { UserBean, CastBean } from '../common/types/entities';

export type PageType = 'import' | 'db' | 'cast' | 'lotteryCondition' | 'lottery' | 'matching' | 'guide';

// マッチング方式
export type MatchingMode = 'rotation' | 'random';

// テーマ（ダーク / しょこめる）
export type ThemeMode = 'dark' | 'shokomel';

// 営業モード
export type BusinessMode = 'special' | 'normal';

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
  const [activePage, setActivePage] = useState<PageType>('import');
  const [currentWinners, setCurrentWinners] = useState<UserBean[]>([]);
  // デフォルトは「ランダムマッチング」（希望重視モード）
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('random');
  // デフォルトはしょこめるテーマ
  const [themeMode, setThemeMode] = useState<ThemeMode>('shokomel');
  // デフォルトは特別営業
  const [businessMode, setBusinessMode] = useState<BusinessMode>('special');
  const [totalTables, setTotalTables] = useState<number>(15);

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