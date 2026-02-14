import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserBean, CastBean } from '@/common/types/entities';
import { STORAGE_KEYS, type LaunchBehavior } from '@/common/config';
import { DEFAULT_THEME_ID, THEME_IDS, type ThemeId } from '@/common/themes';
import {
  getInitialMatchingSettings,
  persistMatchingSettings,
  type MatchingSettingsState,
} from '@/features/matching/stores/matching-settings-store';
import { MATCHING_TYPE_CODES, type MatchingTypeCode } from '@/features/matching/types/matching-type-codes';
import { DEFAULT_ROTATION_COUNT } from '@/common/copy';
export type { UserBean, CastBean } from '@/common/types/entities';

const VALID_PAGES: readonly string[] = ['home', 'guide', 'dataManagement', 'castNgManagement', 'settings', 'debug', 'import', 'db', 'cast', 'ngManagement', 'lotteryCondition', 'lottery', 'matching'];

const VALID_MATCHING_CODES: readonly string[] = [...MATCHING_TYPE_CODES];

function getInitialSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const d = JSON.parse(raw) as unknown;
    if (!d || typeof d !== 'object') return null;
    const o = d as Record<string, unknown>;
    if (!Array.isArray(o.winners)) return null;
    const totalTables = typeof (o as { totalTables?: number }).totalTables === 'number' ? (o as { totalTables: number }).totalTables : 15;
    let matchingTypeCode: MatchingTypeCode = 'NONE';
    if (typeof o.matchingTypeCode === 'string' && VALID_MATCHING_CODES.includes(o.matchingTypeCode)) {
      matchingTypeCode = o.matchingTypeCode as MatchingTypeCode;
    }
    const rotationCount = typeof (o as { rotationCount?: number }).rotationCount === 'number' && (o as { rotationCount: number }).rotationCount >= 1
      ? (o as { rotationCount: number }).rotationCount
      : DEFAULT_ROTATION_COUNT;
    const activePage = typeof o.activePage === 'string' && VALID_PAGES.includes(o.activePage)
      ? (o.activePage as PageType)
      : 'home';
    const groupCount = typeof (o as { groupCount?: number }).groupCount === 'number' && (o as { groupCount: number }).groupCount >= 1
      ? (o as { groupCount: number }).groupCount
      : 1;
    const usersPerGroup = typeof (o as { usersPerGroup?: number }).usersPerGroup === 'number' && (o as { usersPerGroup: number }).usersPerGroup >= 1
      ? (o as { usersPerGroup: number }).usersPerGroup
      : 1;
    const usersPerTable = typeof (o as { usersPerTable?: number }).usersPerTable === 'number' && (o as { usersPerTable: number }).usersPerTable >= 1
      ? (o as { usersPerTable: number }).usersPerTable
      : 1;
    const castsPerRotation = typeof (o as { castsPerRotation?: number }).castsPerRotation === 'number' && (o as { castsPerRotation: number }).castsPerRotation >= 1
      ? (o as { castsPerRotation: number }).castsPerRotation
      : 1;
    return {
      winners: o.winners as UserBean[],
      totalTables,
      matchingTypeCode,
      rotationCount,
      groupCount,
      usersPerGroup,
      usersPerTable,
      castsPerRotation,
      activePage,
    };
  } catch {
    return null;
  }
}

export type PageType = 'home' | 'guide' | 'dataManagement' | 'castNgManagement' | 'settings' | 'debug' | 'import' | 'db' | 'cast' | 'ngManagement' | 'lotteryCondition' | 'lottery' | 'matching';
export type { MatchingTypeCode } from '@/features/matching/types/matching-type-codes';
export type { ThemeId } from '@/common/themes';

function getInitialLaunchBehavior(): LaunchBehavior {
  if (typeof window === 'undefined') return 'top';
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAUNCH_BEHAVIOR);
    if (!raw) return 'top';
    return raw === 'last' ? 'last' : 'top';
  } catch {
    return 'top';
  }
}

function getInitialThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (!raw) return DEFAULT_THEME_ID;
    const id = raw.trim();
    return THEME_IDS.includes(id as ThemeId) ? (id as ThemeId) : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export interface PersistedSession {
  winners: UserBean[];
  totalTables: number;
  matchingTypeCode: MatchingTypeCode;
  rotationCount: number;
  /** M005用: グループ数 */
  groupCount: number;
  /** M005用: 1グループあたりの人数 */
  usersPerGroup: number;
  /** M006用: 1テーブルあたりのユーザー数 */
  usersPerTable: number;
  /** M006用: 1ローテあたりのキャスト数 */
  castsPerRotation: number;
  activePage: PageType;
}

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
  resetAll() {
    this.users = [];
    this.casts = [];
  }
}

interface AppContextType {
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  launchBehavior: LaunchBehavior;
  setLaunchBehavior: (v: LaunchBehavior) => void;
  repository: Repository;
  currentWinners: UserBean[];
  setCurrentWinners: (winners: UserBean[]) => void;
  matchingTypeCode: MatchingTypeCode;
  setMatchingTypeCode: (code: MatchingTypeCode) => void;
  rotationCount: number;
  setRotationCount: (n: number) => void;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  totalTables: number;
  setTotalTables: (n: number) => void;
  groupCount: number;
  setGroupCount: (n: number) => void;
  usersPerGroup: number;
  setUsersPerGroup: (n: number) => void;
  usersPerTable: number;
  setUsersPerTable: (n: number) => void;
  castsPerRotation: number;
  setCastsPerRotation: (n: number) => void;
  matchingSettings: MatchingSettingsState;
  setMatchingSettings: (state: MatchingSettingsState | ((prev: MatchingSettingsState) => MatchingSettingsState)) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const repositoryInstance = new Repository();

function getInitialActivePage(): PageType {
  const launchBehavior = getInitialLaunchBehavior();
  if (launchBehavior === 'top') return 'home';
  const session = getInitialSession();
  const lastPage = session?.activePage;
  return lastPage && lastPage !== 'home' ? lastPage : 'home';
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialSession = useState(() => getInitialSession())[0];
  const [activePage, setActivePage] = useState<PageType>(getInitialActivePage);
  const [launchBehavior, setLaunchBehaviorState] = useState<LaunchBehavior>(getInitialLaunchBehavior);
  const [currentWinners, setCurrentWinners] = useState<UserBean[]>(initialSession?.winners ?? []);
  const [matchingTypeCode, setMatchingTypeCode] = useState<MatchingTypeCode>(initialSession?.matchingTypeCode ?? 'NONE');
  const [rotationCount, setRotationCount] = useState<number>(initialSession?.rotationCount ?? DEFAULT_ROTATION_COUNT);
  const [themeId, setThemeId] = useState<ThemeId>(() => getInitialThemeId());
  const [totalTables, setTotalTables] = useState<number>(initialSession?.totalTables ?? 15);
  const [groupCount, setGroupCount] = useState<number>(initialSession?.groupCount ?? 1);
  const [usersPerGroup, setUsersPerGroup] = useState<number>(initialSession?.usersPerGroup ?? 1);
  const [usersPerTable, setUsersPerTable] = useState<number>(initialSession?.usersPerTable ?? 1);
  const [castsPerRotation, setCastsPerRotation] = useState<number>(initialSession?.castsPerRotation ?? 1);
  const [matchingSettings, setMatchingSettingsState] = useState<MatchingSettingsState>(() => getInitialMatchingSettings());

  const setMatchingSettings = (stateOrUpdater: MatchingSettingsState | ((prev: MatchingSettingsState) => MatchingSettingsState)) => {
    setMatchingSettingsState((prev) => {
      const next = typeof stateOrUpdater === 'function' ? stateOrUpdater(prev) : stateOrUpdater;
      persistMatchingSettings(next);
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const session: PersistedSession = {
      winners: currentWinners,
      totalTables,
      matchingTypeCode,
      rotationCount,
      groupCount,
      usersPerGroup,
      usersPerTable,
      castsPerRotation,
      activePage,
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }, [currentWinners, totalTables, matchingTypeCode, rotationCount, groupCount, usersPerGroup, usersPerTable, castsPerRotation, activePage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.THEME, themeId);
  }, [themeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LAUNCH_BEHAVIOR, launchBehavior);
  }, [launchBehavior]);

  const setLaunchBehavior = (v: LaunchBehavior) => setLaunchBehaviorState(v);

  return (
    <AppContext.Provider value={{
      activePage,
      setActivePage,
      launchBehavior,
      setLaunchBehavior,
      repository: repositoryInstance,
      currentWinners,
      setCurrentWinners,
      matchingTypeCode,
      setMatchingTypeCode,
      rotationCount,
      setRotationCount,
      themeId,
      setThemeId,
      totalTables,
      setTotalTables,
      groupCount,
      setGroupCount,
      usersPerGroup,
      setUsersPerGroup,
      usersPerTable,
      setUsersPerTable,
      castsPerRotation,
      setCastsPerRotation,
      matchingSettings,
      setMatchingSettings,
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
