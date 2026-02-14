import React from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ThemeSelector } from '@/components/ThemeSelector';
import { SETTINGS } from '@/common/copy';

/**
 * 設定画面。テーマ切替・起動時動作など。NG設定は「NGユーザー管理」に移動済み。
 */
export const SettingsPage: React.FC = () => {
  const { themeId, setThemeId, launchBehavior, setLaunchBehavior } = useAppContext();

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">設定</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          テーマやアプリの動作を変更できます。
        </p>

        <div className="form-group form-group-spacing">
          <label className="form-label">{SETTINGS.LAUNCH_BEHAVIOR_LABEL}</label>
          <div className="btn-toggle-group" role="group" aria-label={SETTINGS.LAUNCH_BEHAVIOR_LABEL}>
            <button
              type="button"
              className={`btn-toggle ${launchBehavior === 'top' ? 'active' : ''}`}
              onClick={() => setLaunchBehavior('top')}
            >
              {SETTINGS.LAUNCH_TOP}
            </button>
            <button
              type="button"
              className={`btn-toggle ${launchBehavior === 'last' ? 'active' : ''}`}
              onClick={() => setLaunchBehavior('last')}
            >
              {SETTINGS.LAUNCH_LAST}
            </button>
          </div>
          <p className="form-inline-note form-note-mt">
            次回起動時から反映されます。
          </p>
        </div>

        <div className="form-group form-group-spacing mt-24">
          <label className="form-label">テーマ</label>
          <p className="form-inline-note form-note-mt mb-12">
            色のプレビューをタップして切り替えます。設定タブでのみ変更できます。
          </p>
          <ThemeSelector themeId={themeId} setThemeId={setThemeId} />
        </div>

        <div className="form-group form-group-spacing mt-24">
          <label className="form-label">その他</label>
          <p className="form-inline-note form-note-mt text-muted-color text-sm">
            NGユーザー設定・要注意人物・NG例外は「NGユーザー管理」ページで行えます。
          </p>
        </div>
      </div>
    </div>
  );
};
