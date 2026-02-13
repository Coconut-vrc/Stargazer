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
import { useAppContext, type PageType } from '../stores/AppContext';
import { USER_SHEET_MIN_COLUMNS } from '../common/sheetColumns';
import { mapRowToUserBean, parseCastSheetRows } from '../common/sheetParsers';
import { BUSINESS_MODE_NORMAL, BUSINESS_MODE_SPECIAL, NAV, ALERT, APP_NAME } from '../common/copy';
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

  /** ファイル選択で取り込んだ応募データ行を保存して DB 画面へ */
  const handleImportUserRows = (rows: string[][]) => {
    const requiredCols = businessMode === 'normal' ? USER_SHEET_MIN_COLUMNS.normal : USER_SHEET_MIN_COLUMNS.special;
    const normalizedRows: unknown[][] = rows.map((row) => {
      if (businessMode === 'normal' && row.length >= 9) {
        return [row[0], row[1], row[2], row[3], row[4], row[6], row[8]];
      }
      return row;
    });
    const shortRows = normalizedRows
      .map((row, i) => ({ sheetRow: i + 1, len: Array.isArray(row) ? row.length : 0 }))
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
    const users = normalizedRows.map((row) => mapRowToUserBean(row as unknown[], businessMode));
    repository.saveApplyUsers(users);
    setActivePage('db');
  };

  /** キャストCSVのデータ行をパースして保存し、DB 画面へ */
  const handleImportCastRows = (rows: string[][]) => {
    const casts = parseCastSheetRows(rows as unknown[][]);
    repository.saveCasts(casts);
    setActivePage('db');
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
        return (
          <ImportPage
            onImportUserRows={handleImportUserRows}
            onImportCastRows={handleImportCastRows}
          />
        );
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
        return (
          <ImportPage
            onImportUserRows={handleImportUserRows}
            onImportCastRows={handleImportCastRows}
          />
        );
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

      </div>
    </ErrorBoundary>
  );
};