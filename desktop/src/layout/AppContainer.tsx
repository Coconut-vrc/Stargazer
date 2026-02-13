import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Menu, X, LogOut, Settings, UserX, Bug } from 'lucide-react';
import { invoke } from '@/tauri';
import { ImportPage } from '@/features/import/ImportPage';
import { DBViewPage } from '@/features/db/DBViewPage';
import { CastManagementPage } from '@/features/cast/CastManagementPage';
import { NGUserManagementPage } from '@/features/ng-user/NGUserManagementPage';
import { LotteryPage } from '@/features/lottery/LotteryPage';
import { LotteryResultPage } from '@/features/lottery/LotteryResultPage';
import { MatchingPage } from '@/features/matching/MatchingPage';
import { GuidePage } from '@/features/guide/GuidePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useAppContext, type PageType } from '@/stores/AppContext';
import { mapRowToUserBeanWithMapping } from '@/common/sheetParsers';
import { isTauri } from '@/tauri';
import { NAV, DEFAULT_ROTATION_COUNT } from '@/common/copy';
import { STORAGE_KEYS } from '@/common/config';
import '@/css/layout.css';
import '@/common.css';

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

  const [columnCheckError, setColumnCheckError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
        const normalized = casts.map((c) => ({
          name: String(c.name ?? ''),
          is_present: Boolean(c.is_present),
          ng_users: Array.isArray(c.ng_users) ? (c.ng_users as string[]) : [],
          ng_entries: Array.isArray(c.ng_entries) ? c.ng_entries : undefined,
        }));
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

  const handleClearSession = () => {
    clearSessionData();
    setMatchingTypeCode('M001');
    setRotationCount(DEFAULT_ROTATION_COUNT);
    setTotalTables(15);
    setActivePage('import');
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
    { text: NAV.GUIDE, page: 'guide' },
    { text: NAV.IMPORT, page: 'import' },
    { text: NAV.DB, page: 'db' },
    { text: NAV.LOTTERY_CONDITION, page: 'lotteryCondition' },
    { text: NAV.LOTTERY, page: 'lottery' },
    { text: NAV.MATCHING, page: 'matching' },
    { text: NAV.CAST, page: 'cast' },
    { text: NAV.NG_MANAGEMENT, page: 'ngManagement', icon: <UserX size={18} /> },
    ...(isDev ? [{ text: NAV.DEBUG, page: 'debug' as PageType, icon: <Bug size={18} /> }] : []),
    { text: NAV.SETTINGS, page: 'settings', icon: <Settings size={18} /> },
  ];

  const renderPage = () => {
    switch (activePage) {
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
        return <ImportPage onImportUserRows={handleImportUserRows} />;
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
        <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-inner">
            <div className="sidebar-title">
              <HeaderLogo />
            </div>
            {sidebarButtons.map((button, index) => (
              <button
                key={index}
                className={`sidebar-button ${activePage === button.page ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(button.page);
                  setIsMenuOpen(false);
                }}
              >
                {button.icon != null ? (
                  <>
                    {button.icon}
                    <span className="sidebar-button-label">{button.text}</span>
                  </>
                ) : (
                  button.text
                )}
              </button>
            ))}
            <div className="sidebar-block sidebar-block--push">
              <button onClick={handleClearSession} className="sidebar-button logout">
                <LogOut size={18} />
                セッションをクリア
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
        <main className="main-content">{renderPage()}</main>
      </div>
    </ErrorBoundary>
  );
};
