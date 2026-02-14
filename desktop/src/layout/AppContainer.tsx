import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Menu, X, LogOut, Settings, UserX, Bug, HelpCircle, FileText, Database, Sliders, Ticket, LayoutGrid, Users, Home, PanelLeftClose, PanelLeft } from 'lucide-react';
import { invoke } from '@/tauri';
import { ImportPage } from '@/features/import/ImportPage';
import { DBViewPage } from '@/features/db/DBViewPage';
import { CastManagementPage } from '@/features/cast/CastManagementPage';
import { NGUserManagementPage } from '@/features/ng-user/NGUserManagementPage';
import { LotteryPage } from '@/features/lottery/LotteryPage';
import { LotteryResultPage } from '@/features/lottery/LotteryResultPage';
import { MatchingPage } from '@/features/matching/MatchingPage';
import { GuidePage } from '@/features/guide/GuidePage';
import { TopPage } from '@/features/home/TopPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useAppContext, type PageType } from '@/stores/AppContext';
import { mapRowToUserBeanWithMapping } from '@/common/sheetParsers';
import { isTauri } from '@/tauri';
import { NAV, DEFAULT_ROTATION_COUNT, RESET_APPLICATION } from '@/common/copy';
import { STORAGE_KEYS } from '@/common/config';
import '@/common.css';
import '@/css/layout.css';

const isDev = import.meta.env.DEV;
const LazyDebugPage = isDev ? lazy(() => import('@/debug').then((m) => ({ default: m.DebugPage }))) : null;

export const AppContainer: React.FC = () => {
  const {
    activePage,
    setActivePage,
    repository,
    currentWinners,
    matchingTypeCode,
    setMatchingTypeCode,
    rotationCount,
    setRotationCount,
    setCurrentWinners,
    totalTables,
    setTotalTables,
    groupCount,
    usersPerGroup,
    usersPerTable,
    castsPerRotation,
    themeId,
    matchingSettings,
  } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [columnCheckError, setColumnCheckError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /** キャスト一覧を LocalAppData/CosmoArtsStore/cast/db.json（JSON ローカルDB）に保存する（Tauri 内のみ） */
  const persistCastData = async (casts: import('@/common/types/entities').CastBean[]) => {
    if (!isTauri()) return;
    try {
      const content = JSON.stringify({ casts });
      await invoke('write_cast_db_json', { content });
    } catch (e) {
      console.error('キャストデータの保存に失敗しました', e);
    }
  };

  /** 起動時に Tauri 内なら LocalAppData の JSON DB（cast/db.json）からキャストを読み込む */
  useEffect(() => {
    if (!isTauri()) return;
    const loadCastFromLocal = async () => {
      try {
        await invoke('ensure_app_dirs');
        const content = await invoke<string>('read_cast_db_json');
        const data = JSON.parse(content) as { casts?: Record<string, unknown>[] };
        const casts = Array.isArray(data.casts) ? data.casts : [];
        const normalized = casts.map((c) => {
          const rawEntries = Array.isArray(c.ng_entries) ? c.ng_entries : [];
          const ng_entries = rawEntries.map((e) => {
            if (!e || typeof e !== 'object') return null;
            const o = e as Record<string, unknown>;
            const username = typeof o.username === 'string' ? o.username.trim() || undefined : undefined;
            const accountId = typeof o.accountId === 'string' ? o.accountId.trim() || undefined : undefined;
            const vrc_profile_url = typeof o.vrc_profile_url === 'string' ? o.vrc_profile_url.trim() || undefined : undefined;
            if (!username && !accountId) return null;
            return { username, accountId, vrc_profile_url };
          }).filter(Boolean) as import('@/common/types/entities').NGUserEntry[];
          return {
            name: String(c.name ?? ''),
            is_present: Boolean(c.is_present),
            ng_users: Array.isArray(c.ng_users) ? (c.ng_users as string[]) : [],
            ng_entries: ng_entries.length > 0 ? ng_entries : undefined,
            x_id: typeof c.x_id === 'string' ? c.x_id.trim() || undefined : undefined,
            vrc_profile_url: typeof c.vrc_profile_url === 'string' ? c.vrc_profile_url.trim() || undefined : undefined,
          };
        });
        repository.saveCasts(normalized as import('@/common/types/entities').CastBean[]);
      } catch (e) {
        console.warn('キャストデータの読み込みをスキップしました:', e);
      }
    };
    loadCastFromLocal();
  }, [repository]);

  const clearSessionData = () => {
    repository.resetAll();
    setCurrentWinners([]);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  const handleResetApplication = () => {
    clearSessionData();
    setMatchingTypeCode('M001');
    setRotationCount(DEFAULT_ROTATION_COUNT);
    setTotalTables(15);
    setActivePage('home');
    setShowResetConfirm(false);
  };

  /** ファイル選択で取り込んだ応募データ行とカラムマッピングで保存して DB 画面へ */
  const handleImportUserRows = (
    rows: string[][],
    mapping: import('@/common/importFormat').ColumnMapping,
    options?: import('@/common/sheetParsers').MapRowOptions
  ) => {
    const users = rows
      .map((row) =>
        mapRowToUserBeanWithMapping(row as unknown[], mapping, options)
      )
      .filter(
        (u) => u.name.trim() !== '' || u.x_id.trim() !== ''
      );
    repository.saveApplyUsers(users);
    setActivePage('db');
  };

  const sidebarButtons: { text: string; page: PageType; icon?: React.ReactNode }[] = [
    { text: NAV.HOME, page: 'home', icon: <Home size={18} /> },
    { text: NAV.GUIDE, page: 'guide', icon: <HelpCircle size={18} /> },
    { text: NAV.IMPORT, page: 'import', icon: <FileText size={18} /> },
    { text: NAV.DB, page: 'db', icon: <Database size={18} /> },
    { text: NAV.LOTTERY_CONDITION, page: 'lotteryCondition', icon: <Sliders size={18} /> },
    { text: NAV.LOTTERY, page: 'lottery', icon: <Ticket size={18} /> },
    { text: NAV.MATCHING, page: 'matching', icon: <LayoutGrid size={18} /> },
    { text: NAV.CAST, page: 'cast', icon: <Users size={18} /> },
    { text: NAV.NG_MANAGEMENT, page: 'ngManagement', icon: <UserX size={18} /> },
    ...(isDev ? [{ text: NAV.DEBUG, page: 'debug' as PageType, icon: <Bug size={18} /> }] : []),
    { text: NAV.SETTINGS, page: 'settings', icon: <Settings size={18} /> },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <TopPage />;
      case 'guide':
        return <GuidePage />;
      case 'import':
        return <ImportPage onImportUserRows={handleImportUserRows} />;
      case 'db':
        return <DBViewPage />;
      case 'cast':
        return <CastManagementPage repository={repository} onPersistCasts={persistCastData} />;
      case 'ngManagement':
        return <NGUserManagementPage repository={repository} onPersistCasts={persistCastData} />;
      case 'lotteryCondition':
        return <LotteryPage />;
      case 'lottery':
        return <LotteryResultPage />;
      case 'matching':
        return (
          <MatchingPage
            winners={currentWinners}
            repository={repository}
            matchingTypeCode={matchingTypeCode}
            rotationCount={rotationCount}
            totalTables={totalTables}
            groupCount={groupCount}
            usersPerGroup={usersPerGroup}
            usersPerTable={usersPerTable}
            castsPerRotation={castsPerRotation}
            matchingSettings={matchingSettings}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'debug':
        return isDev && LazyDebugPage ? (
          <Suspense fallback={<div className="page-wrapper">Loading...</div>}>
            <LazyDebugPage />
          </Suspense>
        ) : null;
      default:
        return <TopPage />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="app-container" data-theme={themeId}>
        <div className="mobile-header">
          <HeaderLogo />
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <aside className={`sidebar ${isMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
          <div className="sidebar-inner">
            <div className="sidebar-title">
              {!isSidebarCollapsed && <HeaderLogo />}
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={() => setIsSidebarCollapsed((v) => !v)}
                title={isSidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
                aria-label={isSidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
              >
                {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
              </button>
            </div>
            {sidebarButtons.map((button, index) => (
              <button
                key={index}
                className={`sidebar-button ${activePage === button.page ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(button.page);
                  setIsMenuOpen(false);
                }}
                title={button.text}
              >
                {button.icon != null ? (
                  <>
                    {button.icon}
                    {!isSidebarCollapsed && <span className="sidebar-button-label">{button.text}</span>}
                  </>
                ) : (
                  !isSidebarCollapsed && button.text
                )}
              </button>
            ))}
            <div className="sidebar-block sidebar-block--push">
              <button onClick={() => setShowResetConfirm(true)} className="sidebar-button logout" title={RESET_APPLICATION.BUTTON_LABEL}>
                <LogOut size={18} />
                {!isSidebarCollapsed && <span className="sidebar-button-label">{RESET_APPLICATION.BUTTON_LABEL}</span>}
              </button>
            </div>
          </div>
        </aside>
        {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)} />}
        {columnCheckError !== null && (
          <ConfirmModal type="alert" message={columnCheckError} onConfirm={() => setColumnCheckError(null)} confirmLabel="OK" />
        )}
        {alertMessage !== null && (
          <ConfirmModal type="alert" message={alertMessage} onConfirm={() => setAlertMessage(null)} confirmLabel="OK" />
        )}
        {showResetConfirm && (
          <ConfirmModal
            type="confirm"
            title={RESET_APPLICATION.MODAL_TITLE}
            message={RESET_APPLICATION.MODAL_MESSAGE}
            confirmLabel={RESET_APPLICATION.CONFIRM_LABEL}
            cancelLabel={RESET_APPLICATION.CANCEL_LABEL}
            onConfirm={handleResetApplication}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}
        <main className="main-content">{renderPage()}</main>
        <div id="modal-root" />
      </div>
    </ErrorBoundary>
  );
};
