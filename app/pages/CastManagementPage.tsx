// F:\DEVELOPFOLDER\dev-core\app\pages\CastManagementPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CastBean, Repository } from '../stores/AppContext';
import { DiscordColors } from '../common/types/discord-colors';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';

export const CastManagementPage: React.FC<{ repository: Repository }> = ({ repository }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputNgName, setInputNgName] = useState('');
  
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
      console.error(e);
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
    const cast = casts.find(c => c.name === castName);
    if (cast) {
      const newList = cast.ng_users.filter(u => u !== targetNg);
      cast.ng_users = newList;
      setCasts([...casts]);
      await syncToSheet(castName, 'C', newList.join(', '));
    }
  };

  const togglePresence = async (cast: CastBean) => {
    const newStatus = !cast.is_present;
    repository.updateCastPresence(cast.name, newStatus);
    setCasts([...repository.getAllCasts()]);
    const sheetValue = newStatus ? '0' : '1';
    await syncToSheet(cast.name, 'B', sheetValue);
  };

  const commonInputStyle: React.CSSProperties = { 
    backgroundColor: DiscordColors.bgDark, border: `1px solid ${DiscordColors.border}`, 
    color: DiscordColors.textNormal, padding: '10px 12px', borderRadius: '4px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ color: DiscordColors.textHeader, fontSize: '24px', margin: 0, fontWeight: 700 }}>キャスト・NG管理</h1>
      </header>

      {/* 登録フォーム */}
      <div style={{
        backgroundColor: DiscordColors.bgSecondary, padding: '20px', borderRadius: '8px', marginBottom: '32px',
        border: `1px solid ${DiscordColors.border}`, display: 'flex', gap: '16px', alignItems: 'flex-end', position: 'relative', zIndex: 100
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, position: 'relative' }} ref={dropdownRef}>
          <label style={{ fontSize: '12px', color: DiscordColors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>対象キャスト</label>
          <div 
            style={{ ...commonInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{selectedCastName || '選択中...'}</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </div>
          {isDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              backgroundColor: '#18191c', border: `1px solid ${DiscordColors.border}`, borderRadius: '4px', zIndex: 9999,
              maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
            }}>
              {casts.map(c => (
                <div 
                  key={c.name}
                  style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', color: DiscordColors.textNormal }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#35373c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => { setSelectedCastName(c.name); setIsDropdownOpen(false); }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 2 }}>
          <label style={{ fontSize: '12px', color: DiscordColors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>NGユーザーを追加</label>
          <input 
            placeholder="ユーザー名を入力..." style={commonInputStyle} value={inputNgName}
            onChange={(e) => setInputNgName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
          />
        </div>
        
        <button onClick={handleAddNg} style={{ backgroundColor: DiscordColors.accentBlue, color: '#fff', border: 'none', padding: '0 24px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', height: '40px' }}>
          追加
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {casts.map((cast) => (
          <div key={cast.name} style={{ backgroundColor: DiscordColors.bgSecondary, border: `1px solid ${DiscordColors.border}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontWeight: 600, color: DiscordColors.textHeader, fontSize: '16px' }}>{cast.name}</span>
              <button 
                onClick={() => togglePresence(cast)} 
                style={{ 
                  padding: '10px 0', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', border: 'none', 
                  backgroundColor: cast.is_present ? DiscordColors.accentGreen : DiscordColors.accentRed, 
                  color: '#fff', fontWeight: 700, width: '100%'
                }}
              >
                {cast.is_present ? '出席中' : '欠席中'}
              </button>
            </div>
            <div style={{ borderTop: `1px solid ${DiscordColors.border}`, paddingTop: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cast.ng_users.map(ng => (
                  <span key={ng} style={{ 
                    fontSize: '12px', backgroundColor: 'rgba(237,66,69,0.1)', color: DiscordColors.accentRed, padding: '4px 10px', 
                    borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${DiscordColors.accentRed}44` 
                  }}>
                    {ng}
                    <span onClick={() => handleRemoveNg(cast.name, ng)} style={{ cursor: 'pointer', fontWeight: 800 }}>×</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};