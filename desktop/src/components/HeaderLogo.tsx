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
          <defs>
            {/* 深宇宙の背景 */}
            <radialGradient id="hlogo-bg" cx="0.5" cy="0.45" r="0.6">
              <stop offset="0%" stopColor="#1e1848" />
              <stop offset="100%" stopColor="#0a0a1e" />
            </radialGradient>
            {/* 星の金色グロー */}
            <radialGradient id="hlogo-glow" cx="0.5" cy="0.5" r="0.45">
              <stop offset="0%" stopColor="#ffd866" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#ffc233" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffc233" stopOpacity="0" />
            </radialGradient>
            {/* ぼかし */}
            <filter id="hlogo-blur">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* 円形背景 */}
          <circle cx="100" cy="100" r="96" fill="url(#hlogo-bg)" />
          {/* 外枠 */}
          <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,220,100,0.15)" strokeWidth="1.5" />

          {/* 中心のゴールドグロー */}
          <circle cx="100" cy="100" r="65" fill="url(#hlogo-glow)" />

          {/* 4点星グロー（ぼかし） */}
          <path
            d="M 100 18 C 104 80, 122 96, 152 100 C 122 104, 104 120, 100 182 C 96 120, 78 104, 48 100 C 78 96, 96 80, 100 18 Z"
            fill="#ffd866" opacity="0.45" filter="url(#hlogo-blur)"
          />

          {/* 4点星（シャープ・白〜金） */}
          <path
            d="M 100 18 C 104 80, 122 96, 152 100 C 122 104, 104 120, 100 182 C 96 120, 78 104, 48 100 C 78 96, 96 80, 100 18 Z"
            fill="#fff8e0"
          />

          {/* 軌道リング1（左下がり） */}
          <ellipse
            cx="100" cy="100" rx="78" ry="22"
            fill="none" stroke="rgba(255,230,150,0.55)" strokeWidth="3.5"
            transform="rotate(-20 100 100)"
          />

          {/* 軌道リング2（右下がり） */}
          <ellipse
            cx="100" cy="100" rx="78" ry="22"
            fill="none" stroke="rgba(255,230,150,0.55)" strokeWidth="3.5"
            transform="rotate(20 100 100)"
          />

          {/* 右下の小さな4点星 */}
          <path
            d="M 180 176 C 180.5 173, 182 171.5, 185 171 C 182 170.5, 180.5 169, 180 166 C 179.5 169, 178 170.5, 175 171 C 178 171.5, 179.5 173, 180 176 Z"
            fill="#ffd866" opacity="0.7"
          />
        </svg>
      </div>
      <div className="header-logo__text">
        <div className="header-logo__title">{APP_NAME.toUpperCase()}</div>
        <div className="header-logo__tagline">MATCHING &amp; LOTTERY</div>
      </div>
    </div>
  );
};

