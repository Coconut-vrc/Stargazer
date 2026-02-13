import React from 'react';
import { APP_NAME } from '@/common/copy';

/**
 * アプリ共通のヘッダーロゴ。
 * - デスクトップのサイドバー上部
 * - モバイルヘッダー
 * で再利用する想定。
 */
export const HeaderLogo: React.FC = () => {
  return (
    <div className="header-logo">
      <div className="header-logo__icon" aria-hidden="true">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* 背景の軌道線 */}
          <g opacity="0.4" stroke="#ffffff" fill="none" strokeWidth="2">
            <path d="M 40 100 Q 60 70, 100 60 T 160 100" />
            <path d="M 160 100 Q 140 130, 100 140 T 40 100" />
          </g>

          {/* メインの惑星 */}
          <circle cx="100" cy="100" r="55" fill="#f5f5f5" />

          {/* 惑星のリング */}
          <ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="25"
            fill="none"
            stroke="#2a3a5a"
            strokeWidth="12"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="25"
            fill="none"
            stroke="#f5f5f5"
            strokeWidth="8"
          />

          {/* 小さな星（キラキラ） */}
          <circle className="header-logo__star" cx="45" cy="95" r="3" fill="#ffffff" />
          <circle className="header-logo__star" cx="155" cy="105" r="3" fill="#ffffff" />
          <circle className="header-logo__star" cx="70" cy="55" r="2.5" fill="#ffffff" />
          <circle className="header-logo__star" cx="130" cy="145" r="2.5" fill="#ffffff" />
        </svg>
      </div>
      <div className="header-logo__text">
        <div className="header-logo__title">{APP_NAME.toUpperCase()}</div>
        <div className="header-logo__tagline">MATCHING &amp; LOTTERY</div>
      </div>
    </div>
  );
};

