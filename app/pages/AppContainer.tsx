// app/pages/AppContainer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react'; 
import { ImportPage } from './ImportPage';
import { DBViewPage } from './DBViewPage';
import { CastManagementPage } from './CastManagementPage';
import { LotteryPage } from './LotteryPage';
import { MatchingPage } from './MatchingPage';
import { LoginPage } from './LoginPage';
import { useAppContext, type PageType } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import './AppContainer.css';

export const AppContainer: React.FC = () => {
  const { activePage, setActivePage, repository, currentWinners } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // --- 認証状態管理 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isChecking, setIsChecking] = useState(true); 
  
  const sheetService = new SheetService();

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

  // --- ログアウト処理 ---
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setIsLoggedIn(false);
        setActivePage('import'); // ログアウト後は初期ページへ
      }
    } catch (err) {
      alert('ログアウトに失敗したよ');
    }
  };

  const loadData = async (userUrl: string, castUrl: string) => {
    try {
      const userValues = await sheetService.fetchSheetData(userUrl, 'A2:G100');
      const importedUsers = userValues.map(row => ({
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
      const importedCasts = castValues.map(row => ({
        name: row[0] || '',
        is_present: row[1] === '1',
        ng_users: row[2] ? row[2].split(',').map((s: string) => s.trim()) : []
      }));

      repository.saveApplyUsers(importedUsers);
      repository.saveCasts(importedCasts);
      setActivePage('db');
    } catch (error) {
      console.error('Data Load Error:', error);
      alert('読み取り失敗');
    }
  };

  const sidebarButtons: { text: string; page: PageType }[] = [
    { text: 'データ読取', page: 'import' },
    { text: 'DBデータ確認', page: 'db' },
    { text: 'キャスト管理', page: 'cast' },
    { text: '抽選', page: 'lottery' },
    { text: 'マッチング', page: 'matching' },
  ];

  // 認証チェック中は何も表示しない（ログイン画面が一瞬出るのを防ぐ）
  if (isChecking) return null; 

  // 未ログインなら、他の画面を一切見せずにログイン画面を出す
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'import': return <ImportPage onSuccess={loadData} />;
      case 'db': return <DBViewPage />;
      case 'cast': return <CastManagementPage repository={repository} />;
      case 'lottery': return <LotteryPage />;
      case 'matching':
        return (
          <MatchingPage
            winners={currentWinners}
            allUserData={repository.getAllApplyUsers()}
            repository={repository}
          />
        );
      default: return <ImportPage onSuccess={loadData} />;
    }
  };

  return (
    <div className="app-container">
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
    </div>
  );
};