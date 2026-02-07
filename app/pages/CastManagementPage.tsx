import React, { useState, useEffect } from 'react';
import { CastBean, Repository } from '../stores/AppContext';
import { DiscordColors } from '../common/types/discord-colors';

export const CastManagementPage: React.FC<{ repository: Repository }> = ({ repository }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);

  useEffect(() => {
    setCasts(repository.getAllCasts());
  }, [repository]);

  const toggle = (cast: CastBean) => {
    repository.updateCastPresence(cast.name, !cast.is_present);
    setCasts([...repository.getAllCasts()]);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  };

  const getCastCardStyle = (cast: CastBean): React.CSSProperties => ({
    backgroundColor: cast.is_present ? DiscordColors.itemActive : DiscordColors.bgDark,
    border: `1px solid ${cast.is_present ? DiscordColors.accentGreen : DiscordColors.border}`,
    padding: '14px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.15s ease',
  });

  const getCastNameStyle = (cast: CastBean): React.CSSProperties => ({
    color: cast.is_present ? DiscordColors.textNormal : DiscordColors.textMuted,
    fontWeight: 500,
    fontSize: '14px',
  });

  const getCastStatusStyle = (cast: CastBean): React.CSSProperties => ({
    fontSize: '12px',
    color: cast.is_present ? DiscordColors.accentGreen : DiscordColors.accentRed,
    fontWeight: 600,
  });

  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${DiscordColors.border}` }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: DiscordColors.textHeader, marginBottom: '4px' }}>
          キャスト出席管理
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: DiscordColors.textMuted }}>
          キャストをクリックして出席・欠席を切り替えてください
        </p>
      </div>

      <div style={gridStyle}>
        {casts.map((cast, i) => (
          <div
            key={i}
            onClick={() => toggle(cast)}
            style={getCastCardStyle(cast)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = cast.is_present ? DiscordColors.bgHover : DiscordColors.itemHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = cast.is_present ? DiscordColors.itemActive : DiscordColors.bgDark;
            }}
          >
            <span style={getCastNameStyle(cast)}>{cast.name}</span>
            <span style={getCastStatusStyle(cast)}>{cast.is_present ? '● 出席' : '○ 欠席'}</span>
          </div>
        ))}
      </div>

      {casts.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: DiscordColors.textMuted,
            fontSize: '14px',
          }}
        >
          キャストデータがありません。スプレッドシートを読み込んでください。
        </div>
      )}
    </div>
  );
};
