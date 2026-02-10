// F:\DEVELOPFOLDER\dev-core\app\stores\AppContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { UserBean, CastBean } from '../common/types/entities';
export type { UserBean, CastBean } from '../common/types/entities';

export type PageType = 'import' | 'db' | 'cast' | 'lotteryCondition' | 'lottery' | 'matching';

// マッチング方式
export type MatchingMode = 'rotation' | 'random';

export class Repository {
  private users: UserBean[] = [];
  private casts: CastBean[] = [];

  saveApplyUsers(users: UserBean[]) { this.users = users; }
  getAllApplyUsers(): UserBean[] { return this.users; }
  saveCasts(casts: CastBean[]) { this.casts = casts; }
  getAllCasts(): CastBean[] { return this.casts; }
  updateCastPresence(name: string, isPresent: boolean) {
    const cast = this.casts.find((c) => c.name === name);
    if (cast) cast.is_present = isPresent;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const repositoryInstance = new Repository();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageType>('import');
  const [currentWinners, setCurrentWinners] = useState<UserBean[]>([]);
   // デフォルトは「ランダムマッチング」（希望重視モード）
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('random');

  return (
    <AppContext.Provider value={{
      activePage,
      setActivePage,
      repository: repositoryInstance,
      currentWinners,
      setCurrentWinners,
      matchingMode,
      setMatchingMode,
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