// F:\DEVELOPFOLDER\dev-core\app\pages\AppContainer.tsx

import React from 'react';
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
  const sheetService = new SheetService();

  const renderPage = () => {
    switch (activePage) {
      case 'import':
        return <ImportPage onSuccess={loadData} />;
      case 'db':
        return <DBViewPage />;
      case 'cast':
        return <CastManagementPage repository={repository} />;
      case 'lottery':
        return <LotteryPage />;
      case 'matching':
        return (
          <MatchingPage
            winners={currentWinners}
            allUserData={repository.getAllApplyUsers()}
            repository={repository}
          />
        );
      default:
        return <ImportPage onSuccess={loadData} />;
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
        casts: row[4] ? row[4].split(',').map((s: string) => s.trim()) : [],
        note: row[5] || '',
        is_pair_ticket: row[6] === '1',
        raw_extra: []
      }));

      const castValues = await sheetService.fetchSheetData(castUrl, 'A2:C50');
      const importedCasts = castValues.map(row => ({
        name: row[0] || '',
        is_present: row[1] === '1', // 修正: 1の場合を出席とする
        ng_users: row[2] ? row[2].split(',').map((s: string) => s.trim()) : [] // 修正: ng_usersの初期化
      }));

      repository.saveApplyUsers(importedUsers);
      repository.saveCasts(importedCasts);
      setActivePage('db');
    } catch (error) {
      console.error('Data Load Error:', error);
      alert('データの読み取りに失敗したよ。\n・URLが正しいか\n・スプレッドシートがサービスアカウントに共有されているか\nを確認して。');
    }
  };

  const sidebarButtons: { text: string; page: PageType }[] = [
    { text: 'データ読取', page: 'import' },
    { text: 'DBデータ確認', page: 'db' },
    { text: 'キャスト管理', page: 'cast' },
    { text: '抽選', page: 'lottery' },
    { text: 'マッチング', page: 'matching' },
  ];

  return (
    <div className="app-container">
      <div className="sidebar">
        {sidebarButtons.map((button, index) => (
          <button
            key={index}
            className={`sidebar-button ${activePage === button.page ? 'active' : ''}`}
            onClick={() => setActivePage(button.page)}
          >
            {button.text}
          </button>
        ))}
      </div>
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
};