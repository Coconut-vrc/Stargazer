// F:\DEVELOPFOLDER\dev-core\app\stores\AppContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface UserBean {
  timestamp: string;
  name: string;
  x_id: string;
  first_flag: string;
  casts: string[];
  note: string;
  is_pair_ticket: boolean;
  raw_extra: any[];
}

export interface CastBean {
  name: string;
  is_present: boolean;
  ng_users: string[]; 
}

export type PageType = 'import' | 'db' | 'cast' | 'lottery' | 'matching';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const repositoryInstance = new Repository();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageType>('import');
  const [currentWinners, setCurrentWinners] = useState<UserBean[]>([]);

  return (
    <AppContext.Provider value={{
      activePage, setActivePage, repository: repositoryInstance,
      currentWinners, setCurrentWinners
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