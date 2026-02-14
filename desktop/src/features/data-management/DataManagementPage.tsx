import React, { useState } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ImportPage } from '@/features/import/ImportPage';
import { DBViewPage } from '@/features/db/DBViewPage';
import { LotteryPage } from '@/features/lottery/LotteryPage';
import { LotteryResultPage } from '@/features/lottery/LotteryResultPage';
import { MatchingPage } from '@/features/matching/MatchingPage';

type DataManagementTab = 'import' | 'db' | 'lotteryCondition' | 'lottery' | 'matching';

interface DataManagementPageProps {
  onImportUserRows: (
    rows: string[][],
    mapping: import('@/common/importFormat').ColumnMapping,
    options?: import('@/common/sheetParsers').MapRowOptions
  ) => void;
}

export const DataManagementPage: React.FC<DataManagementPageProps> = ({ onImportUserRows }) => {
  const {
    repository,
    currentWinners,
    matchingTypeCode,
    rotationCount,
    totalTables,
    groupCount,
    usersPerGroup,
    usersPerTable,
    castsPerRotation,
    matchingSettings,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<DataManagementTab>('import');

  const tabs: { id: DataManagementTab; label: string }[] = [
    { id: 'import', label: 'データ読取' },
    { id: 'db', label: 'DBデータ確認' },
    { id: 'lotteryCondition', label: '抽選条件' },
    { id: 'lottery', label: '抽選' },
    { id: 'matching', label: 'マッチング' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'import':
        return <ImportPage onImportUserRows={onImportUserRows} />;
      case 'db':
        return <DBViewPage />;
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
      default:
        return null;
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`page-tab ${activeTab === tab.id ? 'page-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="page-tab-content">{renderContent()}</div>
    </div>
  );
};
