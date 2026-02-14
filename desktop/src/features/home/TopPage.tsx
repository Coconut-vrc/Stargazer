import React from 'react';
import {
  HelpCircle,
  FileText,
  Database,
  Sliders,
  Ticket,
  LayoutGrid,
  Users,
  UserX,
  Settings,
  Bug,
} from 'lucide-react';
import { useAppContext, type PageType } from '@/stores/AppContext';
import { NAV } from '@/common/copy';

/** グループ定義：ラベルと含まれるページ */
const NAV_GROUPS: { label: string; pages: PageType[] }[] = [
  { label: 'メインフロー', pages: ['guide', 'import', 'db', 'lotteryCondition', 'lottery', 'matching'] },
  { label: '管理', pages: ['cast', 'ngManagement'] },
  { label: 'その他', pages: ['settings', 'debug'] },
];

const ICON_MAP: Record<Exclude<PageType, 'home'>, React.ReactNode> = {
  guide: <HelpCircle size={36} />,
  import: <FileText size={36} />,
  db: <Database size={36} />,
  lotteryCondition: <Sliders size={36} />,
  lottery: <Ticket size={36} />,
  matching: <LayoutGrid size={36} />,
  cast: <Users size={36} />,
  ngManagement: <UserX size={36} />,
  settings: <Settings size={36} />,
  debug: <Bug size={36} />,
};

const LABEL_MAP: Record<Exclude<PageType, 'home'>, string> = {
  guide: NAV.GUIDE,
  import: NAV.IMPORT,
  db: NAV.DB,
  lotteryCondition: NAV.LOTTERY_CONDITION,
  lottery: NAV.LOTTERY,
  matching: NAV.MATCHING,
  cast: NAV.CAST,
  ngManagement: NAV.NG_MANAGEMENT,
  settings: NAV.SETTINGS,
  debug: NAV.DEBUG,
};

const isDev = import.meta.env.DEV;

export const TopPage: React.FC = () => {
  const { setActivePage } = useAppContext();

  const handleClick = (page: PageType) => {
    setActivePage(page);
  };

  return (
    <div className="page-wrapper">
      <div className="top-page">
        <h2 className="page-header-title page-header-title--lg top-page__title">
          ホーム
        </h2>
        <p className="page-header-subtitle top-page__subtitle">
          画面を選んで移動します
        </p>

        <div className="top-page__grid">
          {NAV_GROUPS.map((group) => {
            const items = isDev
              ? group.pages
              : group.pages.filter((p) => p !== 'debug');
            if (items.length === 0) return null;

            return (
              <div key={group.label} className="top-page__group">
                <h3 className="top-page__group-label">{group.label}</h3>
                <div className="top-page__group-grid">
                  {items.map((page) => {
                    const pageKey = page as Exclude<PageType, 'home'>;
                    return (
                      <button
                        key={page}
                        type="button"
                        className="top-page__tile"
                        onClick={() => handleClick(page)}
                      >
                        <span className="top-page__tile-icon" aria-hidden>
                          {ICON_MAP[pageKey]}
                        </span>
                        <span className="top-page__tile-label">
                          {LABEL_MAP[pageKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
