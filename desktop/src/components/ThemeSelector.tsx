import React from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { THEMES, THEME_NAMES } from '@/common/themes';
import type { ThemeId } from '@/common/themes';

export const ThemeSelector: React.FC<{
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
}> = ({ themeId, setThemeId }) => {
  const handleValueChange = (value: string) => {
    setThemeId(value as ThemeId);
  };

  return (
    <RadioGroup.Root
      className="theme-selector"
      value={themeId}
      onValueChange={handleValueChange}
      aria-label="テーマを選択"
    >
      {THEMES.map((t) => {
        const isActive = themeId === t.id;
        const { bg, sidebar, card, accent, text } = t.preview;
        return (
          <RadioGroup.Item
            key={t.id}
            value={t.id}
            className={`theme-preview ${isActive ? 'active' : ''}`}
            title={THEME_NAMES[t.id]}
          >
            {/* ミニレイアウト */}
            <span className="theme-preview__layout" style={{ backgroundColor: bg }}>
              {/* サイドバー */}
              <span className="theme-preview__sidebar" style={{ backgroundColor: sidebar }}>
                <span className="theme-preview__sidebar-dot" style={{ backgroundColor: accent }} />
                <span className="theme-preview__sidebar-line" style={{ backgroundColor: text, opacity: 0.25 }} />
                <span className="theme-preview__sidebar-line" style={{ backgroundColor: text, opacity: 0.15 }} />
              </span>
              {/* コンテンツエリア */}
              <span className="theme-preview__content">
                <span className="theme-preview__card" style={{ backgroundColor: card }}>
                  <span className="theme-preview__card-line" style={{ backgroundColor: text, opacity: 0.3 }} />
                  <span className="theme-preview__card-line theme-preview__card-line--short" style={{ backgroundColor: text, opacity: 0.15 }} />
                </span>
                <span className="theme-preview__accent" style={{ backgroundColor: accent }} />
              </span>
            </span>
            <span className="theme-preview__label" style={{ color: isActive ? undefined : undefined }}>
              {THEME_NAMES[t.id]}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
};
