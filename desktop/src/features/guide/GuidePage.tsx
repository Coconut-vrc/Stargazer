import React, { useState } from 'react';
import { FileText, Database, Users, Settings, CheckCircle, BarChart3, HelpCircle } from 'lucide-react';
import { GUIDE } from '@/common/copy';

export const GuidePage: React.FC = () => {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // ツールチップ付き要素のコンポーネント
  const TooltipElement: React.FC<{
    id: string;
    tooltip: string;
    children: React.ReactNode;
    className?: string;
  }> = ({ id, tooltip, children, className }) => (
    <div
      className={`guide-tooltip-wrapper ${className ?? ''}`.trim()}
      onMouseEnter={() => setHoveredElement(id)}
      onMouseLeave={() => setHoveredElement(null)}
    >
      {children}
      {hoveredElement === id && (
        <div className="guide-tooltip-bubble">
          {tooltip}
          <div className="guide-tooltip-arrow" />
        </div>
      )}
    </div>
  );

  return (
    <div className="page-wrapper guide-page-narrow">
      <style>{`
        @media (max-width: 768px) {
          .guide-section-grid {
            grid-template-columns: 1fr !important;
          }
          .guide-sample-preview {
            transform: scale(1) !important;
            transform-origin: top center !important;
            margin-top: 20px;
          }
          .guide-flow-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .guide-mode-grid {
            grid-template-columns: 1fr !important;
          }
          .guide-header-flex {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
      `}</style>
      {/* ヘッダー */}
      <header className="page-header guide-header-centered">
        <div className="guide-header-flex guide-header-flex-inline">
          <div className="guide-header-icon">
            <HelpCircle size={28} />
          </div>
          <h1 className="page-header-title page-header-title--lg" style={{ margin: 0 }}>
            使い方ガイド
          </h1>
        </div>
        <p className="page-header-subtitle guide-subtitle-lg">
          {GUIDE.SUBTITLE}
        </p>
      </header>

      {/* データフロー */}
      <section className="guide-section">
        <h2 className="page-header-title page-header-title--md guide-section-title">
          <BarChart3 size={22} />
          基本的な流れ
        </h2>
        <div className="guide-flow-box">
          <div className="guide-flow-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: FileText, text: GUIDE.FLOW_DATA_READ, desc: GUIDE.FLOW_DATA_READ_DESC },
              { icon: Database, text: GUIDE.FLOW_DB, desc: GUIDE.FLOW_DB_DESC },
              { icon: Users, text: GUIDE.FLOW_CAST, desc: GUIDE.FLOW_CAST_DESC },
              { icon: Settings, text: GUIDE.FLOW_LOTTERY_CONDITION, desc: GUIDE.FLOW_LOTTERY_CONDITION_DESC },
              { icon: CheckCircle, text: GUIDE.FLOW_MATCHING_CONFIRM, desc: GUIDE.FLOW_MATCHING_CONFIRM_DESC },
              { icon: BarChart3, text: GUIDE.FLOW_MATCHING_RESULT, desc: GUIDE.FLOW_MATCHING_RESULT_DESC },
            ].map((item, idx) => (
              <div key={idx} className="guide-flow-item">
                <item.icon size={24} className="guide-flow-item-icon" />
                <div className="guide-flow-item-title">
                  {idx + 1}. {item.text}
                </div>
                <div className="guide-flow-item-desc">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 各画面の説明 */}
      <section className="guide-section">
        <h2 className="page-header-title page-header-title--md guide-section-title">
          <Settings size={22} />
          各画面の機能
        </h2>

        <div className="guide-stack-vertical">
          {/* データ読取 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText size={20} />
                  1. データ読取
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  応募データはCSVファイルで取り込み、キャストはPC内のローカルデータから読み込みます。URLは使いません。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    必要な操作：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>「CSVファイルを選択」からフォームの回答CSVを選ぶ</li>
                    <li>取り込み後、DBデータ確認や抽選に進む</li>
                  </ul>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '12px', marginTop: '10px', lineHeight: '1.6' }}>
                    ※ キャスト一覧は起動時にローカル（%LOCALAPPDATA%\\CosmoArtsStore\\cast）から自動読み込みされます。編集は「キャスト管理」で行います。
                  </p>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--discord-text-header)' }}>
                  データ読取
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                    応募データCSV
                  </div>
                  <TooltipElement id="csv-select" tooltip="フォームの回答CSVを選択して取り込み">
                    <button
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--discord-accent-green)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      CSVファイルを選択
                    </button>
                  </TooltipElement>
                </div>
              </div>
            </div>
          </div>

          {/* DBデータ確認 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Database size={20} />
                  2. DBデータ確認
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  読み込んだ応募者名簿のデータを一覧表示します。ユーザー情報と希望キャストを確認できます。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    できること：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>応募者の一覧を確認</li>
                    <li>X IDをクリックしてユーザーページに遷移</li>
                    <li>希望キャストの確認</li>
                  </ul>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--discord-text-header)' }}>
                  名簿データベース
                </div>
                <div style={{ overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--discord-border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--discord-bg-secondary)' }}>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>名前</th>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>X ID</th>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>希望1</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>ユーザー1</td>
                        <TooltipElement id="x-id-link" tooltip="クリックでXのユーザーページに遷移">
                          <td style={{ padding: '6px', color: 'var(--discord-text-link)', cursor: 'pointer', textDecoration: 'underline' }}>
                            @user1
                          </td>
                        </TooltipElement>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>キャストA</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>ユーザー2</td>
                        <td style={{ padding: '6px', color: 'var(--discord-text-link)', cursor: 'pointer', textDecoration: 'underline' }}>@user2</td>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>キャストB</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* キャスト管理 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Users size={20} />
                  3. キャスト管理
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  キャストの出席管理とNGユーザー管理を行います。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    できること：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>キャストの新規登録・削除</li>
                    <li>キャストの出席状態の切り替え</li>
                    <li>NGユーザーの追加・削除</li>
                    <li>出席状況の確認</li>
                  </ul>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--discord-text-header)' }}>
                  キャスト・NG管理
                </div>
                <div style={{ 
                  backgroundColor: 'var(--discord-bg-secondary)',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--discord-border)',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--discord-text-normal)' }}>キャストA</div>
                    <TooltipElement id="presence-dot" tooltip="緑=出席中、グレー=欠席">
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--discord-accent-green)' 
                      }} />
                    </TooltipElement>
                  </div>
                  <TooltipElement id="presence-button" tooltip="クリックで出席状態を切り替え">
                    <button
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--discord-accent-green)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                        marginBottom: '8px',
                        cursor: 'default'
                      }}
                    >
                      出席中
                    </button>
                  </TooltipElement>
                  <div style={{ fontSize: '10px', color: 'var(--discord-text-muted)', marginBottom: '6px' }}>
                    NGユーザー (1)
                  </div>
                  <TooltipElement id="ng-user" tooltip="NGユーザーを削除するには×をクリック">
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'var(--discord-bg-dark)',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'var(--discord-text-normal)'
                    }}>
                      ユーザー1
                      <span style={{ cursor: 'pointer', color: 'var(--discord-accent-red)' }}>×</span>
                    </div>
                  </TooltipElement>
                </div>
              </div>
            </div>
          </div>

          {/* 抽選条件 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Settings size={20} />
                  4. 抽選条件
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  抽選の条件を設定し、抽選を実行します。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    必要な操作：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>マッチング形式（M001～M006）を選択</li>
                    <li>ローテーション回数・当選人数（または当選者数・総テーブル数など）を入力</li>
                    <li>「抽選を開始する」をクリック</li>
                  </ul>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--discord-text-header)' }}>
                  抽選条件
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    マッチング形式・当選人数など
                  </div>
                  <TooltipElement id="winner-count" tooltip="抽選で選ぶ人数を入力">
                    <input
                      type="number"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--discord-bg-secondary)',
                        border: '1px solid var(--discord-border)',
                        borderRadius: '4px',
                        color: 'var(--discord-text-normal)',
                        fontSize: '11px',
                        pointerEvents: 'none'
                      }}
                      value="15"
                      readOnly
                    />
                  </TooltipElement>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    マッチング方式
                  </div>
                  <TooltipElement id="matching-mode-random" tooltip="希望キャストを優先的に割り当て">
                    <div style={{
                      padding: '10px',
                      backgroundColor: 'var(--discord-accent-blue)',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '11px',
                      color: '#fff',
                      fontWeight: 600
                    }}>
                      ランダムマッチング（希望優先）
                    </div>
                  </TooltipElement>
                  <TooltipElement id="matching-mode-rotation" tooltip="循環ローテーションで公平に割り当て">
                    <div style={{
                      padding: '10px',
                      backgroundColor: 'var(--discord-bg-secondary)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--discord-text-normal)',
                      fontWeight: 600,
                      border: '1px solid var(--discord-border)'
                    }}>
                      循環方式マッチング（ローテーション）
                    </div>
                  </TooltipElement>
                </div>
                <TooltipElement id="lottery-start" tooltip="設定した条件で抽選を実行">
                  <button
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'var(--discord-accent-green)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'default'
                    }}
                  >
                    抽選を開始する
                  </button>
                </TooltipElement>
              </div>
            </div>
          </div>

          {/* マッチング構成確認 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={20} />
                  5. マッチング構成確認
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  抽選結果を確認し、CSVでダウンロードできます。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    できること：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>当選者と希望キャストの確認</li>
                    <li>抽選結果をCSVでダウンロード</li>
                    <li>マッチング画面への遷移</li>
                  </ul>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--discord-text-header)' }}>
                  マッチング構成確認
                </div>
                <div style={{ overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--discord-border)', marginBottom: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--discord-bg-secondary)' }}>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>ユーザー</th>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>希望1</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>ユーザー1</td>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>キャストA</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>ユーザー2</td>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>キャストB</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <TooltipElement id="export-result" tooltip="抽選結果をCSVでダウンロード">
                    <button
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--discord-border)',
                        backgroundColor: 'var(--discord-bg-secondary)',
                        color: 'var(--discord-text-normal)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      抽選結果をCSVでダウンロード
                    </button>
                  </TooltipElement>
                  <TooltipElement id="matching-start" tooltip="マッチング結果画面に遷移">
                    <button
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--discord-accent-green)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      マッチング開始
                    </button>
                  </TooltipElement>
                </div>
              </div>
            </div>
          </div>

          {/* マッチング結果 */}
          <div className="guide-card">
            <div className="guide-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ 
                  color: 'var(--discord-text-header)', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <BarChart3 size={20} />
                  6. マッチング結果
                </h3>
                <p style={{ color: 'var(--discord-text-normal)', marginBottom: '16px', lineHeight: '1.7' }}>
                  マッチング結果を表示します。ユーザー別とキャスト別の2つの視点で確認できます。
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: 'var(--discord-text-muted)', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    できること：
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    color: 'var(--discord-text-normal)',
                    fontSize: '14px',
                    lineHeight: '1.9'
                  }}>
                    <li>ユーザー別・キャスト別マッチング結果の確認</li>
                    <li>当選者別・キャスト別の表をPNG画像で保存（共有や撮影に便利）</li>
                    <li>マッチング結果をCSVでダウンロード</li>
                  </ul>
                </div>
              </div>
              <div className="guide-sample-preview" style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--discord-text-header)' }}>
                  マッチング結果
                </div>
                <div style={{ overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--discord-border)', marginBottom: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--discord-bg-secondary)' }}>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>ユーザー</th>
                        <th style={{ padding: '6px', textAlign: 'left', fontSize: '9px', color: 'var(--discord-text-muted)', fontWeight: 600 }}>1ローテ目</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px', color: 'var(--discord-text-normal)' }}>ユーザー1</td>
                        <td style={{ padding: '6px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--discord-text-normal)', marginBottom: '2px' }}>キャストA</div>
                          <TooltipElement id="rank-badge" tooltip="第1希望=金色、第2希望=銀色、第3希望=銅色">
                            <span style={{
                              fontSize: '8px',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              backgroundColor: '#F5C400',
                              color: '#000',
                              fontWeight: 600
                            }}>
                              第1希望
                            </span>
                          </TooltipElement>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <TooltipElement id="export-png-user" tooltip="当選者別の表をPNG画像でダウンロード">
                    <button
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--discord-border)',
                        backgroundColor: 'var(--discord-bg-secondary)',
                        color: 'var(--discord-text-normal)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      PNGで保存（当選者別）
                    </button>
                  </TooltipElement>
                  <TooltipElement id="export-png-cast" tooltip="キャスト別の表をPNG画像でダウンロード">
                    <button
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--discord-border)',
                        backgroundColor: 'var(--discord-bg-secondary)',
                        color: 'var(--discord-text-normal)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      PNGで保存（キャスト別）
                    </button>
                  </TooltipElement>
                  <TooltipElement id="export-matching" tooltip="マッチング結果をCSVでダウンロード">
                    <button
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--discord-accent-green)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      マッチング結果をCSVでダウンロード
                    </button>
                  </TooltipElement>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* マッチング形式（M001～M006） */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '20px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Settings size={22} />
          マッチング形式（抽選条件）
        </h2>
        <div className="guide-card">
          <p style={{ color: 'var(--discord-text-normal)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.7' }}>
            抽選条件画面で、マッチング形式を M001～M006 から選択します。共通でローテーション回数を設定し、形式に応じて当選人数・総テーブル数・グループ数などを入力します。
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--discord-text-normal)', fontSize: '14px', lineHeight: '2' }}>
            <li>M001: 完全ランダムマッチング（空席なし・ランダム）</li>
            <li>M002: 完全ローテーションマッチング（空席なし・順番に回る）</li>
            <li>M003: 空席込みランダムマッチング</li>
            <li>M004: 空席込みローテーションマッチング</li>
            <li>M005: グループマッチング</li>
            <li>M006: 複数マッチング</li>
          </ul>
        </div>
      </section>

      {/* マッチング方式の違い */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '20px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <BarChart3 size={22} />
          マッチング方式の違い
        </h2>
        <div className="guide-card">
          <div className="guide-mode-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{
              backgroundColor: 'var(--discord-bg-dark)',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--discord-border)'
            }}>
              <h4 style={{ 
                color: 'var(--discord-text-header)', 
                fontSize: '16px', 
                fontWeight: 600,
                marginBottom: '12px'
              }}>
                ランダムマッチング（希望優先）
              </h4>
              <p style={{ 
                color: 'var(--discord-text-normal)', 
                fontSize: '14px',
                lineHeight: '1.7',
                margin: 0
              }}>
                希望キャストを優先的に割り当てるランダムマッチングです。希望をできる限り叶えたい場合に適しています。
              </p>
            </div>
            <div style={{
              backgroundColor: 'var(--discord-bg-dark)',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--discord-border)'
            }}>
              <h4 style={{ 
                color: 'var(--discord-text-header)', 
                fontSize: '16px', 
                fontWeight: 600,
                marginBottom: '12px'
              }}>
                循環方式マッチング（ローテーション）
              </h4>
              <p style={{ 
                color: 'var(--discord-text-normal)', 
                fontSize: '14px',
                lineHeight: '1.7',
                margin: 0
              }}>
                循環ローテーション＋重み付きランダムです。全員が公平にローテーションするため、公平性を重視する場合に適しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* よくある質問 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '20px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <HelpCircle size={22} />
          よくある質問
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              q: '「列数が足りません」と出ます。',
              a: 'テンプレート形式では必要な列数を満たしているか確認してください。カスタム形式では「列の割り当て」で各項目に十分な列を指定しているか確認してください。'
            },
            {
              q: '抽選結果やマッチング結果はどこに保存されますか？',
              a: GUIDE.EXPORT_DESCRIPTION
            },
            {
              q: 'NGユーザーとは何ですか？',
              a: '特定のキャストが接客しないように設定するユーザーです。NGユーザーに設定されたユーザーは、そのキャストにマッチングされません。'
            },
            {
              q: '希望ランクのバッジの色は何を意味しますか？',
              a: '第1希望は金色、第2希望は銀色、第3希望は銅色、希望外はグレーで表示されます。マッチング結果画面で確認できます。'
            },
            {
              q: '抽選をやり直したい場合はどうすればいいですか？',
              a: '「抽選条件」画面に戻って、再度「抽選を開始する」をクリックしてください。新しい抽選結果が生成されます。'
            },
          ].map((item, idx) => (
            <div key={idx} className="guide-card guide-card--compact">
              <h4 style={{ 
                color: 'var(--discord-text-header)', 
                fontSize: '15px', 
                fontWeight: 600,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--discord-accent-blue)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Q
                </div>
                {item.q}
              </h4>
              <p style={{ 
                color: 'var(--discord-text-normal)', 
                fontSize: '14px',
                lineHeight: '1.7',
                margin: 0,
                paddingLeft: '28px'
              }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
