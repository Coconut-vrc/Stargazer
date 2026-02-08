// app/pages/AppContainer.tsx
"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ImportPage } from './ImportPage';
import { DBViewPage } from './DBViewPage';
import { CastManagementPage } from './CastManagementPage';
import { LotteryPage } from './LotteryPage';
import { MatchingPage } from './MatchingPage';
import { useAppContext, type PageType } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import './AppContainer.css';

export const AppContainer: React.FC = () => {
  const { activePage, setActivePage, repository, currentWinners } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // メニューの開閉状態
  const sheetService = new SheetService();

  const loadData = async (userUrl: string, castUrl: string) => {
    try {
      const userValues = await sheetService.fetchSheetData(userUrl, 'A2:G100');
      const importedUsers = userValues.map(row => ({
        timestamp: row[0] || '',
        name: row[1] || '',
        x_id: row[2] || '',
        first_flag: row[3] || '',
        casts: row[4] ? row[4].split(',').map((s: string) => s.trim()) : [],
        note: row[5] || '',
        is_pair_ticket: row[6] === '1',
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
      {/* スマホ用ヘッダー */}
      <div className="mobile-header">
        <div className="logo">chocomelapp</div>
        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* サイドバー（PCは常時表示、スマホは被さる） */}
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-title">MENU</div>
          {sidebarButtons.map((button, index) => (
            <button
              key={index}
              className={`sidebar-button ${activePage === button.page ? 'active' : ''}`}
              onClick={() => {
                setActivePage(button.page);
                setIsMenuOpen(false); // ページを選んだら閉じる
              }}
            >
              {button.text}
            </button>
          ))}
        </div>
      </aside>

      {/* 背景オーバーレイ（メニューが開いている時だけメイン画面を暗くする） */}
      {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)} />}

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
};