// app/pages/AppContainer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react'; 
import { ImportPage } from './ImportPage';
import { DBViewPage } from './DBViewPage';
import { CastManagementPage } from './CastManagementPage';
import { LotteryPage } from './LotteryPage';
import { LotteryResultPage } from './LotteryResultPage';
import { MatchingPage } from './MatchingPage';
import { LoginPage } from './LoginPage';
import { GuidePage } from './GuidePage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ConfirmModal } from '../components/ConfirmModal';
import { ImportFlowModal } from '../components/ImportFlowModal';
import { useAppContext, type PageType } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { USER_SHEET_MIN_COLUMNS, SHEET_RANGES, RESULT_SHEET_PREFIX } from '../common/sheetColumns';
import { mapRowToUserBean, parseCastSheetRows } from '../common/sheetParsers';
import { BUSINESS_MODE_SPECIAL, BUSINESS_MODE_NORMAL, NAV, ALERT, APP_NAME } from '../common/copy';
import type { ImportFlowStep } from '../features/importFlow';
import { STORAGE_KEYS } from '../common/config';
import '../css/layout.css';
import '../common.css';

export const AppContainer: React.FC = () => {
  const {
    activePage,
    setActivePage,
    repository,
    currentWinners,
    matchingMode,
    setMatchingMode,
    setCurrentWinners,
    themeMode,
    setThemeMode,
    businessMode,
    setBusinessMode,
    totalTables,
    setTotalTables,
  } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // --- 認証状態管理 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isChecking, setIsChecking] = useState(true); 
  
  const sheetService = new SheetService();

  // --- インポートフロー（3択 + 保存結果読み取り）---
  const [showImportFlowModal, setShowImportFlowModal] = useState(false);
  const [importFlowStep, setImportFlowStep] = useState<ImportFlowStep>('choice');
  const [pendingUserUrl, setPendingUserUrl] = useState<string | null>(null);
  const [pendingCastUrl, setPendingCastUrl] = useState<string | null>(null);
  const [resultSheets, setResultSheets] = useState<string[]>([]);
  const [selectedResultSheet, setSelectedResultSheet] = useState('');
  const [importModalMatchingMode, setImportModalMatchingMode] = useState<'random' | 'rotation'>('random');
  const [isImportingResult, setIsImportingResult] = useState(false);

  const closeImportFlowModal = () => {
    setShowImportFlowModal(false);
    setImportFlowStep('choice');
    setResultSheets([]);
  };

  /** 取り込み時の列数チェックエラー（設定時はカスタムモーダル表示） */
  const [columnCheckError, setColumnCheckError] = useState<string | null>(null);
  /** 汎用アラート（ブラウザ alert の代わりにカスタムモーダル表示） */
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // --- 【重要】起動時にCookieがあるか確認し、ログイン状態を復元する ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  /** セッション・リポジトリをクリア（新規抽選／保存結果読み取り前。ログアウト時はこのあとデフォルト値を設定） */
  const clearSessionData = () => {
    repository.resetAll();
    setCurrentWinners([]);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  useEffect(() => {
    if (isChecking) return;
    if (!isLoggedIn) {
      clearSessionData();
      setMatchingMode('random');
      setTotalTables(15);
    }
  }, [isLoggedIn, isChecking, repository, setCurrentWinners, setMatchingMode, setTotalTables]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        clearSessionData();
        setMatchingMode('random');
        setTotalTables(15);
        setActivePage('import');
        setIsLoggedIn(false);
      }
    } catch (err) {
      setAlertMessage(ALERT.LOGOUT_FAILED);
    }
  };

  const loadData = async (
    userUrl: string,
    castUrl: string,
    options?: { resetBefore?: boolean }
  ) => {
    if (options?.resetBefore) clearSessionData();

    try {
      const userValues = await sheetService.fetchSheetData(userUrl, SHEET_RANGES.USER);
      const requiredCols = businessMode === 'normal' ? USER_SHEET_MIN_COLUMNS.normal : USER_SHEET_MIN_COLUMNS.special;
      const shortRows = userValues
        .map((row, i) => ({ sheetRow: i + 2, len: Array.isArray(row) ? row.length : 0 }))
        .filter(({ len }) => len > 0 && len < requiredCols);
      if (shortRows.length > 0) {
        const sample = shortRows.length > 5
          ? `行 ${shortRows.slice(0, 5).map((r) => r.sheetRow).join(', ')} 他${shortRows.length}行`
          : `行 ${shortRows.map((r) => r.sheetRow).join(', ')}`;
        setColumnCheckError(
          `選択した営業モードと列数が一致しません。\n` +
          `${businessMode === 'normal' ? BUSINESS_MODE_NORMAL : BUSINESS_MODE_SPECIAL}では${requiredCols}列以上必要です。\n不足している行: ${sample}`
        );
        return;
      }

      const importedUsers = userValues.map((row: unknown[]) => mapRowToUserBean(row, businessMode));
      const castValues = await sheetService.fetchSheetData(castUrl, SHEET_RANGES.CAST);
      const importedCasts = parseCastSheetRows(castValues as unknown[][]);

      repository.setUserSheetUrl(userUrl);
      repository.setCastSheetUrl(castUrl);
      repository.saveApplyUsers(importedUsers);
      repository.saveCasts(importedCasts);
      setActivePage('db');
    } catch (error) {
      console.error('Data Load Error:', error);
      setAlertMessage(ALERT.LOAD_FAILED);
    }
  };

  const sidebarButtons: { text: string; page: PageType }[] = [
    { text: NAV.GUIDE, page: 'guide' },
    { text: NAV.IMPORT, page: 'import' },
    { text: NAV.DB, page: 'db' },
    { text: NAV.LOTTERY_CONDITION, page: 'lotteryCondition' },
    { text: NAV.LOTTERY, page: 'lottery' },
    { text: NAV.MATCHING, page: 'matching' },
    { text: NAV.CAST, page: 'cast' },
  ];

  /** キャストシートのみ再読み込み（続きから） */
  const reloadCastOnly = async (userUrl: string, castUrl: string) => {
    try {
      const castValues = await sheetService.fetchSheetData(castUrl, SHEET_RANGES.CAST);
      const importedCasts = parseCastSheetRows(castValues as unknown[][]);
      repository.setUserSheetUrl(userUrl);
      repository.setCastSheetUrl(castUrl);
      repository.saveCasts(importedCasts);
      setActivePage('db');
    } catch (error) {
      console.error('Cast-only Load Error:', error);
      setAlertMessage(ALERT.LOAD_FAILED);
    }
  };

  /** インポート画面「データを取り込む」: セッションなしなら即フル読込、ありなら3択モーダル表示 */
  const handleImportRequest = (userUrl: string, castUrl: string, hasSession: boolean) => {
    if (!hasSession) {
      loadData(userUrl, castUrl, { resetBefore: true });
      return;
    }
    setPendingUserUrl(userUrl);
    setPendingCastUrl(castUrl);
    setImportFlowStep('choice');
    setShowImportFlowModal(true);
  };

  /** 3択OK時: pending URL を検証してから action を実行 */
  const runImportFlowAction = (action: 'continue' | 'new' | 'loadSaved') => {
    if (!pendingUserUrl || !pendingCastUrl) {
      closeImportFlowModal();
      setAlertMessage(ALERT.LOAD_FAILED);
      return;
    }
    if (action === 'continue') {
      closeImportFlowModal();
      reloadCastOnly(pendingUserUrl, pendingCastUrl);
      return;
    }
    if (action === 'new') {
      closeImportFlowModal();
      loadData(pendingUserUrl, pendingCastUrl, { resetBefore: true });
      return;
    }
    // action === 'loadSaved'
    setImportFlowStep('loading');
    (async () => {
      try {
        await loadData(pendingUserUrl!, pendingCastUrl!, { resetBefore: true });
        const sheets = await sheetService.listSheets(pendingUserUrl!);
        const filtered = sheets.filter((name) => name.startsWith(RESULT_SHEET_PREFIX));
        if (filtered.length > 0) {
          setResultSheets(filtered);
          setSelectedResultSheet(filtered[0]);
          setImportModalMatchingMode('random');
          setImportFlowStep('result');
        } else {
          setResultSheets([]);
          setImportFlowStep('noResult');
        }
      } catch (e) {
        console.error('既存抽選結果シート確認エラー:', e);
        setAlertMessage(ALERT.LOAD_FAILED);
        closeImportFlowModal();
      }
    })();
  };

  const handleImportExistingResult = async () => {
    if (!selectedResultSheet) {
      setAlertMessage(ALERT.SELECT_RESULT_SHEET);
      return;
    }
    const userSheetUrl = repository.getUserSheetUrl();
    if (!userSheetUrl) {
      setAlertMessage(ALERT.NO_USER_SHEET_URL);
      return;
    }

    setIsImportingResult(true);
    try {
      const range = `${selectedResultSheet}!${SHEET_RANGES.USER}`;
      const rows = await sheetService.fetchSheetData(userSheetUrl, range);
      if (!rows || rows.length === 0) {
        setAlertMessage(ALERT.NO_DATA_IN_SHEET);
        return;
      }

      const winners = (rows as unknown[][]).map((row) => mapRowToUserBean(row, businessMode));
      setCurrentWinners(winners);
      setMatchingMode(importModalMatchingMode);
      if (businessMode === 'normal' && winners.length > 0) {
        setTotalTables(Math.max(totalTables, winners.length));
      }
      closeImportFlowModal();
      setActivePage('lottery');
    } catch (e) {
      console.error('既存抽選結果取り込みエラー:', e);
      setAlertMessage(ALERT.IMPORT_RESULT_FAILED);
    } finally {
      setIsImportingResult(false);
    }
  };

  const renderPage = () => {
    // 認証チェック中は何も表示しない（ログイン画面が一瞬出るのを防ぐ）
    if (isChecking) return null; 

    // 未ログインなら、他の画面を一切見せずにログイン画面を出す
    if (!isLoggedIn) {
      return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
    }

    switch (activePage) {
      case 'guide':
        return <GuidePage />;
      case 'import':
        return <ImportPage onImportRequest={handleImportRequest} />;
      case 'db':
        return <DBViewPage />;
      case 'cast':
        return <CastManagementPage repository={repository} />;
      case 'lotteryCondition':
        return <LotteryPage />;
      case 'lottery':
        return <LotteryResultPage />;
      case 'matching':
        return (
          <MatchingPage
            winners={currentWinners}
            repository={repository}
            matchingMode={matchingMode}
            businessMode={businessMode}
            totalTables={totalTables}
          />
        );
      default:
        return <ImportPage onImportRequest={handleImportRequest} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className={`app-container theme-${themeMode}`}>
        {/* スマホヘッダー */}
        <div className="mobile-header">
          <div className="logo">{APP_NAME}</div>
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* サイドバー */}
        <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-inner">
            <div className="sidebar-title"></div>
            {sidebarButtons.map((button, index) => (
              <button
                key={index}
                className={`sidebar-button ${activePage === button.page ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(button.page);
                  setIsMenuOpen(false);
                }}
              >
                {button.text}
              </button>
            ))}

            {/* テーマ切り替え */}
            <div className="sidebar-block">
              <div className="sidebar-theme-label">テーマ</div>
              <div className="sidebar-theme-pills">
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`sidebar-theme-pill ${themeMode === 'dark' ? 'active' : ''}`}
                >
                  ダーク
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('shokomel')}
                  className={`sidebar-theme-pill ${themeMode === 'shokomel' ? 'active' : ''}`}
                >
                  しょこめる
                </button>
              </div>
            </div>

            {/* ログアウトボタン */}
            <div className="sidebar-block sidebar-block--push">
              <button
                onClick={handleLogout}
                className="sidebar-button logout"
              >
                <LogOut size={18} />
                ログアウト
              </button>
            </div>
          </div>
        </aside>

        {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)} />}

        {columnCheckError !== null && (
          <ConfirmModal
            type="alert"
            message={columnCheckError}
            onConfirm={() => setColumnCheckError(null)}
            confirmLabel="OK"
          />
        )}
        {alertMessage !== null && (
          <ConfirmModal
            type="alert"
            message={alertMessage}
            onConfirm={() => setAlertMessage(null)}
            confirmLabel="OK"
          />
        )}

        <main className="main-content">
          {renderPage()}
        </main>

        <ImportFlowModal
          show={showImportFlowModal}
          step={importFlowStep}
          canContinue={currentWinners.length > 0}
          onClose={closeImportFlowModal}
          onConfirmChoice={runImportFlowAction}
          resultSheets={resultSheets}
          selectedResultSheet={selectedResultSheet}
          onSelectSheet={setSelectedResultSheet}
          matchingMode={importModalMatchingMode}
          onMatchingModeChange={setImportModalMatchingMode}
          onConfirmImportResult={handleImportExistingResult}
          onSkipImportResult={closeImportFlowModal}
          onConfirmNoResult={closeImportFlowModal}
          isImportingResult={isImportingResult}
        />
      </div>
    </ErrorBoundary>
  );
};