import React, { useState, useEffect } from 'react';
import { Menu, X, Bug, HelpCircle, Database, Users } from 'lucide-react';
import { invoke } from '@/tauri';
import { DataManagementPage } from '@/features/data-management/DataManagementPage';
import { CastNgManagementPage } from '@/features/cast-ng-management/CastNgManagementPage';
import { GuidePage } from '@/features/guide/GuidePage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useAppContext, type PageType } from '@/stores/AppContext';
import { mapRowToUserBeanWithMapping } from '@/common/sheetParsers';
import { isTauri } from '@/tauri';
import { NAV, DEFAULT_ROTATION_COUNT, RESET_APPLICATION, IMPORT_OVERWRITE } from '@/common/copy';
import { STORAGE_KEYS } from '@/common/config';
import '@/common.css';
import '@/css/layout.css';
import { ThemeSelector } from '@/components/ThemeSelector';

const isDev = import.meta.env.DEV;

export const AppContainer: React.FC = () => {
  const {
    activePage,
    setActivePage,
    repository,
    currentWinners,
    setMatchingTypeCode,
    setRotationCount,
    setCurrentWinners,
    themeId,
    setThemeId,
  } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [columnCheckError, setColumnCheckError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDirSetupConfirm, setShowDirSetupConfirm] = useState(false);
  /** CSV取り込みで既存応募データがあるときに確認用に保持する取り込み予定データ */
  const [pendingImport, setPendingImport] = useState<{
    rows: string[][];
    mapping: import('@/common/importFormat').ColumnMapping;
    options?: import('@/common/sheetParsers').MapRowOptions;
  } | null>(null);

  /** キャスト一覧を LocalAppData/CosmoArtsStore/cast/cast.json（JSON ローカルDB）に保存する（Tauri 内のみ） */
  const persistCastData = async (casts: import('@/common/types/entities').CastBean[]) => {
    if (!isTauri()) return;
    try {
      const content = JSON.stringify({ casts });
      await invoke('write_cast_db_json', { content });
    } catch (e) {
      console.error('キャストデータの保存に失敗しました', e);
    }
  };

  /** 起動時に Tauri 内なら LocalAppData の JSON DB（cast/cast.json）からキャストを読み込む */
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

  /** 起動時にフォルダ存在確認を行い、必要なら確認モーダルを表示 */
  useEffect(() => {
    if (!isTauri()) return;
    const checkDirs = async () => {
      try {
        const exists = await invoke<boolean>('check_app_dirs_exist');
        if (!exists) {
          setShowDirSetupConfirm(true);
        }
      } catch (e) {
        console.warn('フォルダ存在確認に失敗:', e);
      }
    };
    checkDirs();
  }, []);

  const clearSessionData = () => {
    repository.resetAll();
    setCurrentWinners([]);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  const handleResetApplication = () => {
    clearSessionData();
    setMatchingTypeCode('NONE');
    setRotationCount(DEFAULT_ROTATION_COUNT);
    setActivePage('dataManagement');
    setShowResetConfirm(false);
  };

  const handleDirSetupConfirm = async () => {
    try {
      await invoke('ensure_app_dirs');
      setShowDirSetupConfirm(false);
    } catch (e) {
      setAlertMessage(`フォルダの作成に失敗しました: ${e}`);
      setShowDirSetupConfirm(false);
    }
  };

  /** ファイル選択で取り込んだ応募データ行とカラムマッピングで保存して DB 画面へ。既存の応募データ or 当選結果がある場合は上書き確認モーダルを表示。 */
  const handleImportUserRows = (
    rows: string[][],
    mapping: import('@/common/importFormat').ColumnMapping,
    options?: import('@/common/sheetParsers').MapRowOptions
  ) => {
    const hasApplyUsers = repository.getAllApplyUsers().length > 0;
    const hasWinners = currentWinners.length > 0;
    if (hasApplyUsers || hasWinners) {
      setPendingImport({ rows, mapping, options });
      return;
    }
    applyImport(rows, mapping, options);
  };

  /** 実際に応募データを保存し DB 画面へ遷移（リセット＋取り込みまたはそのまま取り込み） */
  const applyImport = (
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
    setCurrentWinners([]);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.SESSION);
    setActivePage('db');
  };

  const handleConfirmImportOverwrite = () => {
    if (!pendingImport) return;
    clearSessionData();
    applyImport(pendingImport.rows, pendingImport.mapping, pendingImport.options);
    setPendingImport(null);
  };

  const sidebarButtons: { text: string; page: PageType; icon?: React.ReactNode }[] = [
    { text: NAV.DATA_MANAGEMENT, page: 'dataManagement', icon: <Database size={18} /> },
    { text: NAV.CAST_NG_MANAGEMENT, page: 'castNgManagement', icon: <Users size={18} /> },
    ...(isDev ? [{ text: NAV.DEBUG, page: 'debug' as PageType, icon: <Bug size={18} /> }] : []),
    { text: NAV.GUIDE, page: 'guide', icon: <HelpCircle size={18} /> },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'guide':
        return <GuidePage />;
      case 'dataManagement':
        return <DataManagementPage onImportUserRows={handleImportUserRows} />;
      case 'castNgManagement':
        return <CastNgManagementPage onPersistCasts={persistCastData} />;
      default:
        return <DataManagementPage onImportUserRows={handleImportUserRows} />;
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
                title={button.text}
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
              <ThemeSelector themeId={themeId} setThemeId={setThemeId!} />
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
        {showDirSetupConfirm && (
          <ConfirmModal
            type="confirm"
            title="初回セットアップ"
            message={`%localAppData%\\CosmoArtsStore に以下のフォルダを作成します。\n\n・import\n・app\n・backup\n・cast\n\nよろしいですか？`}
            confirmLabel="作成する"
            cancelLabel="キャンセル"
            onConfirm={handleDirSetupConfirm}
            onCancel={() => setShowDirSetupConfirm(false)}
          />
        )}
        {pendingImport !== null && (
          <ConfirmModal
            type="confirm"
            title={IMPORT_OVERWRITE.MODAL_TITLE}
            message={IMPORT_OVERWRITE.MODAL_MESSAGE}
            confirmLabel={IMPORT_OVERWRITE.CONFIRM_LABEL}
            cancelLabel={IMPORT_OVERWRITE.CANCEL_LABEL}
            onConfirm={handleConfirmImportOverwrite}
            onCancel={() => setPendingImport(null)}
          />
        )}
        <main className="main-content">{renderPage()}</main>
        <div id="modal-root" />
      </div>
    </ErrorBoundary>
  );
};
