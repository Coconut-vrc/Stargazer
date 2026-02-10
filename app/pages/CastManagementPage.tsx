// pages/CastManagementPage.tsx の全量

import React, { useState, useEffect, useRef } from 'react';
import type { CastBean } from '../common/types/entities';
import { Repository } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';

export const CastManagementPage: React.FC<{ repository: Repository }> = ({ repository }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputNgName, setInputNgName] = useState('');
  const [inputCastName, setInputCastName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sheetService = new SheetService();
  const CAST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1rc_QdWi805TaZ_2e8uV_odpc4DRQNVnC5ET6W63LzPw/edit';

  useEffect(() => {
    const allCasts = repository.getAllCasts();
    setCasts(allCasts);
    if (allCasts.length > 0 && !selectedCastName) {
      setSelectedCastName(allCasts[0].name);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [repository, selectedCastName]);

  const syncToSheet = async (castName: string, column: string, value: string) => {
    const allCasts = repository.getAllCasts();
    const rowIndex = allCasts.findIndex(c => c.name === castName);
    if (rowIndex === -1) return;

    const range = `${column}${rowIndex + 2}`;
    try {
      await sheetService.updateSheetData(CAST_SHEET_URL, range, [[value]]);
    } catch (e) {
      console.error('更新失敗:', e);
    }
  };

  const handleAddCast = async () => {
    const newName = inputCastName.trim();
    if (!newName) return;
    if (casts.some(c => c.name === newName)) {
      alert('そのキャストは既に登録されてるよ');
      return;
    }

    const newCast: CastBean = {
      name: newName,
      is_present: false,
      ng_users: []
    };

    const nextRowIndex = casts.length + 2;
    const range = `A${nextRowIndex}:C${nextRowIndex}`;
    
    try {
      await sheetService.updateSheetData(CAST_SHEET_URL, range, [[newName, '0', '']]);
      const updatedList = [...casts, newCast];
      repository.saveCasts(updatedList);
      setCasts(updatedList);
      setInputCastName('');
      if (updatedList.length === 1) setSelectedCastName(newName);
    } catch (e) {
      console.error('キャスト追加失敗:', e);
    }
  };

  const handleAddNg = async () => {
    const nameToAdd = inputNgName.trim();
    if (!nameToAdd || !selectedCastName) return;

    const cast = casts.find(c => c.name === selectedCastName);
    if (cast) {
      if (cast.ng_users.includes(nameToAdd)) return;
      const newList = [...cast.ng_users, nameToAdd];
      cast.ng_users = newList;
      setCasts([...casts]);
      setInputNgName('');
      await syncToSheet(selectedCastName, 'C', newList.join(', '));
    }
  };

  const handleRemoveNg = async (castName: string, targetNg: string) => {
    const cast = casts.find((c: CastBean) => c.name === castName);
    if (cast) {
      const newList = cast.ng_users.filter((u: string) => u !== targetNg);
      cast.ng_users = newList;
      setCasts([...casts]);
      await syncToSheet(castName, 'C', newList.join(', '));
    }
  };

  const togglePresence = async (cast: CastBean) => {
    const newStatus = !cast.is_present;
    repository.updateCastPresence(cast.name, newStatus);
    setCasts([...repository.getAllCasts()]);
    const sheetValue = newStatus ? '1' : '0';
    await syncToSheet(cast.name, 'B', sheetValue);
  };

  const commonInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--discord-bg-dark)',
    border: '1px solid var(--discord-border)',
    color: 'var(--discord-text-normal)',
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--discord-text-muted)',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: '8px'
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--discord-text-header)', fontSize: '24px', margin: 0, fontWeight: 700 }}>
          キャスト・NG管理
        </h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        {/* キャスト新規登録フォーム */}
        <div style={{
          backgroundColor: 'var(--discord-bg-secondary)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid var(--discord-border)',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label style={labelStyle}>キャストを新規登録</label>
            <input
              placeholder="キャスト名を入力..."
              style={commonInputStyle}
              value={inputCastName}
              onChange={(e) => setInputCastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCast()}
            />
          </div>
          <button
            onClick={handleAddCast}
            style={{
              backgroundColor: 'var(--discord-accent-green)',
              color: '#fff',
              border: 'none',
              padding: '0 24px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: 'pointer',
              height: '40px'
            }}
          >
            登録
          </button>
        </div>

        {/* NGユーザー登録フォーム */}
        <div style={{
          backgroundColor: 'var(--discord-bg-secondary)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid var(--discord-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }} ref={dropdownRef}>
            <label style={labelStyle}>対象キャスト</label>
            <div
              style={{ ...commonInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedCastName || '選択中...'}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </div>
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#18191c',
                border: '1px solid var(--discord-border)',
                borderRadius: '4px',
                zIndex: 9999,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
              }}>
                {casts.map(c => (
                  <div
                    key={c.name}
                    style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', color: 'var(--discord-text-normal)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#35373c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      setSelectedCastName(c.name);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
            <label style={labelStyle}>NGユーザーを追加</label>
            <input
              placeholder="ユーザー名を入力..."
              style={commonInputStyle}
              value={inputNgName}
              onChange={(e) => setInputNgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleAddNg}
              style={{
                backgroundColor: 'var(--discord-accent-blue)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                height: '40px',
                minWidth: '96px',
              }}
            >
              追加
            </button>
          </div>
        </div>
      </div>

      {/* カード一覧表示 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {casts.map((cast) => (
          <div key={cast.name} style={{
            backgroundColor: 'var(--discord-bg-secondary)',
            border: '1px solid var(--discord-border)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, color: 'var(--discord-text-header)', fontSize: '16px' }}>{cast.name}</span>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: cast.is_present ? 'var(--discord-accent-green)' : 'var(--discord-accent-red)'
              }} />
            </div>

            <button
              onClick={() => togglePresence(cast)}
              style={{
                padding: '10px 0',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: cast.is_present ? 'var(--discord-accent-green)' : 'var(--discord-accent-red)',
                color: '#fff',
                fontWeight: 700
              }}
            >
              {cast.is_present ? '出席中' : '欠席'}
            </button>

            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                NGユーザー ({cast.ng_users.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cast.ng_users.length > 0 ? (
                  cast.ng_users.map((ng: string) => (
                    <div
                      key={ng}
                      style={{

                        fontSize: '12px', backgroundColor: 'rgba(237,66,69,0.1)', color: 'var(--discord-accent-red)', padding: '4px 10px', 
                        borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(237,66,69,0.27)' 
                         }}
                    >
                      <span>{ng}</span>
                      <span
                        style={{ cursor: 'pointer', color: 'var(--discord-text-muted)', fontSize: '14px', lineHeight: '1' }}
                        onClick={() => handleRemoveNg(cast.name, ng)}
                      >
                        ×
                      </span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--discord-text-muted)', fontStyle: 'italic' }}>なし</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};