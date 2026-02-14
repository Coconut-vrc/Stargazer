import React from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ThemeSelector } from '@/components/ThemeSelector';

/**
 * 設定画面。テーマ切替のみ。
 */
export const SettingsPage: React.FC = () => {
  const { themeId, setThemeId } = useAppContext();

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">設定</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          テーマを変更できます。
        </p>

        <div className="form-group form-group-spacing">
          <label className="form-label">テーマ</label>
          <p className="form-inline-note form-note-mt mb-12">
            デフォルトとチェックを切り替えます。
          </p>
          <ThemeSelector themeId={themeId} setThemeId={setThemeId} />
        </div>

        <div className="form-group form-group-spacing mt-24">
          <label className="form-label">その他</label>
          <p className="form-inline-note form-note-mt text-muted-color text-sm">
            NGユーザー設定・要注意人物・NG例外は「キャスト管理」ページで行えます。
          </p>
        </div>
      </div>
    </div>
  );
};
