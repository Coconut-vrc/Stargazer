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
      className="theme-selector theme-selector--swatches"
      value={themeId}
      onValueChange={handleValueChange}
      aria-label="テーマを選択"
    >
      {THEMES.map((t) => {
        const isActive = themeId === t.id;
        const [c1, c2, c3] = t.previewColors;
        return (
          <RadioGroup.Item
            key={t.id}
            value={t.id}
            className={`theme-swatch ${isActive ? 'active' : ''}`}
            title={THEME_NAMES[t.id]}
          >
            <span className="theme-swatch__stripes">
              <span className="theme-swatch__stripe" style={{ backgroundColor: c1 }} />
              {c2 != null && <span className="theme-swatch__stripe" style={{ backgroundColor: c2 }} />}
              {c3 != null && <span className="theme-swatch__stripe" style={{ backgroundColor: c3 }} />}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
};
