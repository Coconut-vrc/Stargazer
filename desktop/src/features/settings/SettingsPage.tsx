import React, { useState, useCallback } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ThemeSelector } from '@/components/ThemeSelector';
import { AppSelect } from '@/components/AppSelect';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import type { CautionUser, NGException } from '@/features/matching/types/matching-system-types';

const NG_JUDGMENT_LABELS: Record<NGJudgmentType, string> = {
  username: 'ユーザー名のみで判定',
  accountId: 'アカウントID(X)のみで判定',
  either: 'ユーザー名 OR アカウントID（どちらか一致でNG）',
};

const NG_BEHAVIOR_LABELS: Record<NGMatchingBehavior, string> = {
  warn: '警告モード（結果でハイライト・手動で入れ替え可能）',
  exclude: '除外モード（マッチング時に自動除外）',
};

/**
 * 設定画面。テーマ切替・NG設定・その他を集約。
 */
export const SettingsPage: React.FC = () => {
  const { themeId, setThemeId, matchingSettings, setMatchingSettings } = useAppContext();

  const [cautionThreshold, setCautionThreshold] = useState(
    () => matchingSettings.caution.autoRegisterThreshold,
  );
  const handleThresholdBlur = useCallback(() => {
    const n = Math.max(1, Math.floor(Number(cautionThreshold)) || 1);
    setCautionThreshold(n);
    setMatchingSettings((prev) => ({
      ...prev,
      caution: { ...prev.caution, autoRegisterThreshold: n },
    }));
  }, [cautionThreshold, setMatchingSettings]);

  const handleAddCaution = useCallback(() => {
    const username = prompt('要注意人物のユーザー名（必須）');
    if (username === null || !username.trim()) return;
    const accountId = prompt('要注意人物のアカウントID(X)（必須）');
    if (accountId === null || !accountId.trim()) return;
    const newOne: CautionUser = {
      username: username.trim(),
      accountId: accountId.trim(),
      registrationType: 'manual',
      registeredAt: new Date().toISOString(),
    };
    setMatchingSettings((prev) => ({
      ...prev,
      caution: {
        ...prev.caution,
        cautionUsers: [...prev.caution.cautionUsers, newOne],
      },
    }));
  }, [setMatchingSettings]);

  const handleRemoveCaution = useCallback(
    (index: number) => {
      setMatchingSettings((prev) => ({
        ...prev,
        caution: {
          ...prev.caution,
          cautionUsers: prev.caution.cautionUsers.filter((_, i) => i !== index),
        },
      }));
    },
    [setMatchingSettings],
  );

  const handleAddException = useCallback(() => {
    const username = prompt('NG例外のユーザー名（必須）');
    if (username === null || !username.trim()) return;
    const accountId = prompt('NG例外のアカウントID(X)（必須）');
    if (accountId === null || !accountId.trim()) return;
    const newOne: NGException = {
      username: username.trim(),
      accountId: accountId.trim(),
      registeredAt: new Date().toISOString(),
    };
    setMatchingSettings((prev) => ({
      ...prev,
      ngExceptions: { exceptions: [...prev.ngExceptions.exceptions, newOne] },
    }));
  }, [setMatchingSettings]);

  const handleRemoveException = useCallback(
    (index: number) => {
      setMatchingSettings((prev) => ({
        ...prev,
        ngExceptions: {
          exceptions: prev.ngExceptions.exceptions.filter((_, i) => i !== index),
        },
      }));
    },
    [setMatchingSettings],
  );

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">設定</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          テーマやアプリの動作を変更できます。
        </p>

        <div className="form-group form-group-spacing">
          <label className="form-label">テーマ</label>
          <p className="form-inline-note form-note-mt" style={{ marginBottom: 12 }}>
            色のプレビューをタップして切り替えます。設定タブでのみ変更できます。
          </p>
          <ThemeSelector themeId={themeId} setThemeId={setThemeId} />
        </div>

        <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
          <label className="form-label">NGユーザー設定</label>
          <p className="form-inline-note form-note-mt" style={{ marginBottom: 8, fontSize: 13 }}>
            キャストごとのNGリストの判定方法と、マッチング時の挙動を選択します。
          </p>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 12 }}>判定基準</label>
            <AppSelect
              value={matchingSettings.ngJudgmentType}
              onValueChange={(v) => {
                if (v === 'username' || v === 'accountId' || v === 'either') setMatchingSettings((prev) => ({ ...prev, ngJudgmentType: v }));
              }}
              options={(Object.keys(NG_JUDGMENT_LABELS) as NGJudgmentType[]).map((k) => ({
                value: k,
                label: NG_JUDGMENT_LABELS[k],
              }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 12 }}>マッチング時の挙動</label>
            <AppSelect
              value={matchingSettings.ngMatchingBehavior}
              onValueChange={(v) => {
                if (v === 'warn' || v === 'exclude') setMatchingSettings((prev) => ({ ...prev, ngMatchingBehavior: v }));
              }}
              options={(Object.keys(NG_BEHAVIOR_LABELS) as NGMatchingBehavior[]).map((k) => ({
                value: k,
                label: NG_BEHAVIOR_LABELS[k],
              }))}
            />
          </div>
        </div>

        <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
          <label className="form-label">要注意人物</label>
          <p className="form-inline-note form-note-mt" style={{ marginBottom: 8, fontSize: 13 }}>
            複数キャストがNGにしたユーザーを自動で要注意にします。手動登録も可能です（ユーザー名・アカウントID両方必須）。
          </p>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 12 }}>自動登録の閾値（何人以上のキャストがNGにしたら要注意とするか）</label>
            <input
              type="number"
              min={1}
              value={cautionThreshold}
              onChange={(e) => setCautionThreshold(Number(e.target.value) || 1)}
              onBlur={handleThresholdBlur}
              className="form-input"
              style={{ maxWidth: 80 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <button type="button" className="btn-primary btn-fixed-h" onClick={handleAddCaution}>
              要注意人物を手動登録
            </button>
          </div>
          {matchingSettings.caution.cautionUsers.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13 }}>
              {matchingSettings.caution.cautionUsers.map((c, i) => (
                <li key={`${c.username}-${c.accountId}-${i}`} style={{ marginBottom: 4 }}>
                  {c.username} / @{c.accountId}
                  {c.registrationType === 'manual' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCaution(i)}
                      style={{ marginLeft: 8, fontSize: 11 }}
                    >
                      削除
                    </button>
                  )}
                  {c.registrationType === 'auto' && c.ngCastCount != null && (
                    <span style={{ color: 'var(--discord-text-muted)', marginLeft: 8 }}>
                      （{c.ngCastCount}名のキャストがNG）
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
          <label className="form-label">NG例外</label>
          <p className="form-inline-note form-note-mt" style={{ marginBottom: 8, fontSize: 13 }}>
            登録したユーザーは応募リストの要注意警告を出しません。キャストのNG設定には影響しません（ユーザー名・アカウントID両方必須）。
          </p>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <button type="button" className="btn-primary btn-fixed-h" onClick={handleAddException}>
              NG例外を追加
            </button>
          </div>
          {matchingSettings.ngExceptions.exceptions.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13 }}>
              {matchingSettings.ngExceptions.exceptions.map((e, i) => (
                <li key={`${e.username}-${e.accountId}-${i}`} style={{ marginBottom: 4 }}>
                  {e.username} / @{e.accountId}
                  <button
                    type="button"
                    onClick={() => handleRemoveException(i)}
                    style={{ marginLeft: 8, fontSize: 11 }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
          <label className="form-label">その他</label>
          <p className="form-inline-note form-note-mt" style={{ color: 'var(--discord-text-muted)', fontSize: 13 }}>
            今後、ここに各種設定を追加予定です。
          </p>
        </div>
      </div>
    </div>
  );
};
