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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAppContext, type PageType } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import '../css/layout.css';

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
    }
  }, [isLoggedIn, repository, setCurrentWinners, setMatchingMode]);

  // --- ログアウト処理 ---
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        // ログアウト直後にメモリ上のシートURL・名簿・キャストを必ずクリアする
        repository.resetAll();
        setCurrentWinners([]);
        setMatchingMode('random');
        setActivePage('import');
        setIsLoggedIn(false);
      }
    } catch (err) {
      alert('ログアウトに失敗したよ');
    }
  };

  const loadData = async (userUrl: string, castUrl: string) => {
    try {
      const userValues = await sheetService.fetchSheetData(userUrl, 'A2:I1000');
      const importedUsers = userValues.map((row) => ({
        timestamp: row[0] || '',
        name: row[1] || '',
        x_id: row[2] || '',
        first_flag: row[3] || '',
        casts: [row[4], row[5], row[6]].filter(Boolean),
        note: row[7] || '',
        is_pair_ticket: row[8] === '1',
        raw_extra: []
      }));

      const castValues = await sheetService.fetchSheetData(castUrl, 'A2:C50');
      const importedCasts = castValues
        .map((row) => ({
          name: row[0] || '',
          is_present: row[1] === '1',
          ng_users: row[2] ? row[2].split(',').map((s: string) => s.trim()) : [],
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
        const filtered = sheets.filter((name) => name.startsWith('抽選結果_'));
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
      console.error('Data Load Error:', error);
      alert('読み取り失敗');
    }
  };

  const sidebarButtons: { text: string; page: PageType }[] = [
    { text: 'データ読取', page: 'import' },
    { text: 'DBデータ確認', page: 'db' },
    { text: '抽選条件', page: 'lotteryCondition' },
    { text: '抽選', page: 'lottery' },
    { text: 'マッチング', page: 'matching' },
    { text: 'キャスト管理', page: 'cast' },
  ];

  const handleImportExistingResult = async () => {
    if (!selectedResultSheet) {
      alert('読み込む抽選結果シートを選択してください。');
      return;
    }
    const userSheetUrl = repository.getUserSheetUrl();
    if (!userSheetUrl) {
      alert('応募者名簿のURLが設定されていません。');
      return;
    }

    setIsImportingResult(true);
    try {
      const range = `${selectedResultSheet}!A2:I1000`;
      const rows = await sheetService.fetchSheetData(userSheetUrl, range);
      if (!rows || rows.length === 0) {
        alert('選択したシートにデータがありません。');
        return;
      }

      const winners = rows.map((row: any[]) => ({
        timestamp: row[0] || '',
        name: row[1] || '',
        x_id: row[2] || '',
        first_flag: row[3] || '',
        casts: [row[4], row[5], row[6]].filter(Boolean),
        note: row[7] || '',
        is_pair_ticket: row[8] === '1',
        raw_extra: [],
      }));

      setCurrentWinners(winners);
      setMatchingMode(importModalMatchingMode);
      setShowResultImportModal(false);
      setActivePage('lottery');
    } catch (e) {
      console.error('既存抽選結果取り込みエラー:', e);
      alert('既存の抽選結果の取り込みに失敗しました。');
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
            allUserData={repository.getAllApplyUsers()}
            repository={repository}
            matchingMode={matchingMode}
            businessMode={businessMode}
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
          <div className="logo">chocomelapp</div>
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
            <div style={{ marginTop: '16px', padding: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: '#949ba4',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                テーマ
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '999px',
                  padding: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  style={{
                    flex: 1,
                    borderRadius: '999px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor:
                      themeMode === 'dark' ? 'var(--discord-accent-blue)' : 'transparent',
                    color: themeMode === 'dark' ? '#fff' : '#949ba4',
                  }}
                >
                  ダーク
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('shokomel')}
                  style={{
                    flex: 1,
                    borderRadius: '999px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor:
                      themeMode === 'shokomel'
                        ? 'var(--discord-accent-blue)'
                        : 'transparent',
                    color: themeMode === 'shokomel' ? '#fff' : '#949ba4',
                  }}
                >
                  しょこめる
                </button>
              </div>
            </div>
            
            {/* ログアウトボタンをサイドバー下部に追加 */}
            <div style={{ marginTop: 'auto', padding: '10px' }}>
              <button 
                onClick={handleLogout}
                className="sidebar-button logout"
                style={{ 
                  color: '#ff4444', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  width: '100%', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer' 
                }}
              >
                <LogOut size={18} />
                ログアウト
              </button>
            </div>
          </div>
        </aside>

        {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)} />}

        <main className="main-content">
          {renderPage()}
        </main>

        {showResultImportModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--discord-bg-dark)',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                padding: '24px 28px',
                width: '100%',
                maxWidth: '520px',
              }}
            >
              <h2
                style={{
                  color: 'var(--discord-text-header)',
                  fontSize: '18px',
                  marginBottom: '8px',
                }}
              >
                既存の抽選結果を取り込みますか？
              </h2>
              <p
                style={{
                  color: 'var(--discord-text-muted)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                このブックには過去の抽選結果シートが見つかりました。読み込むシートとマッチング方式を選択できます。
              </p>

              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    color: 'var(--discord-text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  抽選結果シート
                </div>
                <select
                  value={selectedResultSheet}
                  onChange={(e) => setSelectedResultSheet(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--discord-bg-dark)',
                    border: '1px solid var(--discord-border)',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                  }}
                >
                  {resultSheets.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    color: 'var(--discord-text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  マッチング方式
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setImportModalMatchingMode('random')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border:
                        importModalMatchingMode === 'random'
                          ? '1px solid var(--discord-accent-blue)'
                          : '1px solid var(--discord-border)',
                      backgroundColor:
                        importModalMatchingMode === 'random'
                          ? 'var(--discord-accent-blue)'
                          : 'var(--discord-bg-secondary)',
                      color:
                        importModalMatchingMode === 'random'
                          ? '#fff'
                          : 'var(--discord-text-normal)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ランダム（希望優先）
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportModalMatchingMode('rotation')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border:
                        importModalMatchingMode === 'rotation'
                          ? '1px solid var(--discord-accent-blue)'
                          : '1px solid var(--discord-border)',
                      backgroundColor:
                        importModalMatchingMode === 'rotation'
                          ? 'var(--discord-accent-blue)'
                          : 'var(--discord-bg-secondary)',
                      color:
                        importModalMatchingMode === 'rotation'
                          ? '#fff'
                          : 'var(--discord-text-normal)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    循環方式（ローテーション）
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowResultImportModal(false);
                    setResultSheets([]);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--discord-border)',
                    backgroundColor: 'var(--discord-bg-secondary)',
                    color: 'var(--discord-text-normal)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  キャンセル（DB確認へ）
                </button>
                <button
                  type="button"
                  onClick={handleImportExistingResult}
                  disabled={isImportingResult}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--discord-accent-blue)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isImportingResult ? 'not-allowed' : 'pointer',
                    opacity: isImportingResult ? 0.7 : 1,
                  }}
                >
                  {isImportingResult ? '読み込み中...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};