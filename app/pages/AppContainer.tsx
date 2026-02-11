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
import { ResultImportModal } from '../components/ResultImportModal';
import { useAppContext, type PageType } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { USER_SHEET, USER_SHEET_MIN_COLUMNS, USER_SHEET_BY_MODE, CAST_SHEET, SHEET_RANGES, RESULT_SHEET_PREFIX } from '../common/sheetColumns';
import { BUSINESS_MODE_SPECIAL, BUSINESS_MODE_NORMAL, NAV, ALERT, APP_NAME } from '../common/copy';
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

  // 既存抽選結果取り込みモーダル用
  const [showResultImportModal, setShowResultImportModal] = useState(false);
  const [resultSheets, setResultSheets] = useState<string[]>([]);
  const [selectedResultSheet, setSelectedResultSheet] = useState('');
  const [importModalMatchingMode, setImportModalMatchingMode] =
    useState<'random' | 'rotation'>('random');
  const [isImportingResult, setIsImportingResult] = useState(false);
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

  // ログイン状態が false になったタイミングで、メモリ上のシートURLや読み込み済みデータを全て破棄する
  useEffect(() => {
    if (!isLoggedIn) {
      repository.resetAll();
      setCurrentWinners([]);
      setMatchingMode('random');
      setTotalTables(15);
    }
  }, [isLoggedIn, repository, setCurrentWinners, setMatchingMode, setTotalTables]);

  // --- ログアウト処理 ---
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        // ログアウト直後にメモリ上のシートURL・名簿・キャストを必ずクリアする
        repository.resetAll();
        setCurrentWinners([]);
        setMatchingMode('random');
        setTotalTables(15);
        setActivePage('import');
        setIsLoggedIn(false);
      }
    } catch (err) {
      setAlertMessage(ALERT.LOGOUT_FAILED);
    }
  };

  /**
   * 希望キャストをパースする（営業モードに応じて）
   * - 特別営業: E列、F列、G列からそれぞれ1つずつ読み込む
   * - 通常営業: E列にカンマ区切りで1~3名の希望が入っている
   * - 常に3要素の配列を返す（不足分は空文字列で埋める）
   */
  const parseCastsFromRow = (row: any[], mode: 'special' | 'normal'): string[] => {
    const { CAST_E, CAST_F, CAST_G } = USER_SHEET;
    let parsed: string[];
    if (mode === 'normal') {
      const eColumn = (row[CAST_E] || '').toString().trim();
      if (!eColumn) {
        parsed = [];
      } else {
        parsed = eColumn
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 3);
        parsed = Array.from(new Set(parsed));
      }
    } else {
      parsed = [row[CAST_E], row[CAST_F], row[CAST_G]]
        .map((val) => (val || '').toString().trim())
        .filter(Boolean);
    }
    
    // 常に3要素の配列にする（不足分は空文字列で埋める）
    while (parsed.length < 3) {
      parsed.push('');
    }
    
    return parsed.slice(0, 3);
  };

  const loadData = async (userUrl: string, castUrl: string) => {
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

      const { TIMESTAMP, NAME, X_ID, FIRST_FLAG } = USER_SHEET;
      const { NOTE, IS_PAIR_TICKET } = USER_SHEET_BY_MODE[businessMode];
      const importedUsers = userValues.map((row) => {
        const casts = parseCastsFromRow(row, businessMode);
        return {
          timestamp: row[TIMESTAMP] || '',
          name: row[NAME] || '',
          x_id: row[X_ID] || '',
          first_flag: row[FIRST_FLAG] || '',
          casts: casts,
          note: row[NOTE] || '',
          is_pair_ticket: row[IS_PAIR_TICKET] === '1',
          raw_extra: []
        };
      });

      const castValues = await sheetService.fetchSheetData(castUrl, SHEET_RANGES.CAST);
      const importedCasts = castValues
        .map((row) => ({
          name: row[CAST_SHEET.NAME] || '',
          is_present: row[CAST_SHEET.IS_PRESENT] === '1',
          ng_users: row[CAST_SHEET.NG_USERS] ? (row[CAST_SHEET.NG_USERS] as string).split(',').map((s: string) => s.trim()) : [],
        }))
        .filter(c => c.name); // 空行はスキップ

      repository.setUserSheetUrl(userUrl);
      repository.setCastSheetUrl(castUrl);
      repository.saveApplyUsers(importedUsers);
      repository.saveCasts(importedCasts);
      setActivePage('db');

      // 既存の抽選結果シートがあるか確認し、あればモーダル表示
      try {
        const sheets = await sheetService.listSheets(userUrl);
        const filtered = sheets.filter((name) => name.startsWith(RESULT_SHEET_PREFIX));
        if (filtered.length > 0) {
          setResultSheets(filtered);
          setSelectedResultSheet(filtered[0]);
          setImportModalMatchingMode('random');
          setShowResultImportModal(true);
        }
      } catch (e) {
        console.error('既存抽選結果シート確認エラー:', e);
      }
    } catch (error) {
      // エラーの詳細情報はサーバー側のログにのみ記録
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

      const { TIMESTAMP, NAME, X_ID, FIRST_FLAG } = USER_SHEET;
      const { NOTE, IS_PAIR_TICKET } = USER_SHEET_BY_MODE[businessMode];
      const winners = rows.map((row: any[]) => {
        const casts = parseCastsFromRow(row, businessMode);
        return {
          timestamp: row[TIMESTAMP] || '',
          name: row[NAME] || '',
          x_id: row[X_ID] || '',
          first_flag: row[FIRST_FLAG] || '',
          casts: casts,
          note: row[NOTE] || '',
          is_pair_ticket: row[IS_PAIR_TICKET] === '1',
          raw_extra: [],
        };
      });

      setCurrentWinners(winners);
      setMatchingMode(importModalMatchingMode);
      setShowResultImportModal(false);
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
        return <ImportPage onSuccess={loadData} />;
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
        return <ImportPage onSuccess={loadData} />;
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

        <ResultImportModal
          show={showResultImportModal}
          onClose={() => { setShowResultImportModal(false); setResultSheets([]); }}
          resultSheets={resultSheets}
          selectedResultSheet={selectedResultSheet}
          onSelectSheet={setSelectedResultSheet}
          matchingMode={importModalMatchingMode}
          onMatchingModeChange={setImportModalMatchingMode}
          onConfirm={handleImportExistingResult}
          isImporting={isImportingResult}
        />
      </div>
    </ErrorBoundary>
  );
};