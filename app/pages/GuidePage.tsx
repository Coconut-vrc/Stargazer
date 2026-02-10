import React, { useState } from 'react';
import { FileText, Database, Users, Settings, CheckCircle, BarChart3, HelpCircle } from 'lucide-react';

export const GuidePage: React.FC = () => {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // ツールチップ付き要素のコンポーネント
  const TooltipElement: React.FC<{
    id: string;
    tooltip: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ id, tooltip, children, style }) => (
    <div
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setHoveredElement(id)}
      onMouseLeave={() => setHoveredElement(null)}
    >
      {children}
      {hoveredElement === id && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--discord-bg-dark)',
            color: 'var(--discord-text-normal)',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid var(--discord-border)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          {tooltip}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--discord-bg-dark)',
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="page-wrapper" style={{ maxWidth: '1000px' }}>
      {/* ヘッダー */}
      <header className="page-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--discord-accent-blue), var(--discord-accent-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <HelpCircle size={28} />
          </div>
          <h1 className="page-header-title page-header-title--lg" style={{ margin: 0 }}>
            使い方ガイド
          </h1>
        </div>
        <p className="page-header-subtitle" style={{ fontSize: '15px' }}>
          chocomelappの基本的な使い方を説明します
        </p>
      </header>

      {/* データフロー */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '20px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <BarChart3 size={22} />
          基本的な流れ
        </h2>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid var(--discord-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {[
              { icon: FileText, text: 'データ読取', desc: 'スプレッドシートからデータを読み込み' },
              { icon: Database, text: 'DBデータ確認', desc: '読み込んだデータを確認' },
              { icon: Users, text: 'キャスト管理', desc: '出席状態を設定' },
              { icon: Settings, text: '抽選条件', desc: '条件を設定して抽選実行' },
              { icon: CheckCircle, text: 'マッチング構成確認', desc: '抽選結果を確認・エクスポート' },
              { icon: BarChart3, text: 'マッチング結果', desc: 'マッチング結果を確認・エクスポート' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--discord-bg-dark)',
                  borderRadius: '8px',
                  border: '1px solid var(--discord-border)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <item.icon size={24} style={{ color: 'var(--discord-accent-blue)', marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, color: 'var(--discord-text-header)', marginBottom: '4px' }}>
                  {idx + 1}. {item.text}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--discord-text-muted)', textAlign: 'center' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 各画面の説明 */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '24px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Settings size={22} />
          各画面の機能
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* データ読取 */}
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                  Googleスプレッドシートから応募者名簿とキャストリストを読み込みます。
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
                    <li>営業モードを選択</li>
                    <li>応募者名簿のURLを入力</li>
                    <li>キャストリストのURLを入力</li>
                    <li>「保存して同期を開始」をクリック</li>
                  </ul>
                </div>
              </div>
              <div style={{ 
                backgroundColor: 'var(--discord-bg-dark)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid var(--discord-border)',
                transform: 'scale(0.85)',
                transformOrigin: 'top right'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--discord-text-header)' }}>
                  外部連携設定
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    営業モード
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <TooltipElement id="special-mode" tooltip="希望キャストを3つの別項目から読み込み">
                      <button
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'var(--discord-accent-blue)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'default'
                        }}
                      >
                        特殊営業
                      </button>
                    </TooltipElement>
                    <TooltipElement id="normal-mode" tooltip="希望キャストを1項目のカンマ区切りから読み込み">
                      <button
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--discord-border)',
                          backgroundColor: 'var(--discord-bg-secondary)',
                          color: 'var(--discord-text-normal)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'default'
                        }}
                      >
                        通常営業
                      </button>
                    </TooltipElement>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    応募者名簿 URL
                  </div>
                  <TooltipElement id="user-url" tooltip="GoogleスプレッドシートのURLをコピー&ペースト">
                    <input
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
                      value="https://docs.google.com/spreadsheets/d/..."
                      readOnly
                    />
                  </TooltipElement>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    キャストリスト URL
                  </div>
                  <TooltipElement id="cast-url" tooltip="GoogleスプレッドシートのURLをコピー&ペースト">
                    <input
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
                      value="https://docs.google.com/spreadsheets/d/..."
                      readOnly
                    />
                  </TooltipElement>
                </div>
                <TooltipElement id="save-button" tooltip="データを読み込んで同期を開始">
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
                    保存して同期を開始
                  </button>
                </TooltipElement>
              </div>
            </div>
          </div>

          {/* DBデータ確認 */}
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
              <div style={{ 
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
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
              <div style={{ 
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
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                    <li>営業モードを選択</li>
                    <li>当選人数を入力</li>
                    <li>通常営業の場合は、総テーブル数を入力</li>
                    <li>マッチング方式を選択</li>
                    <li>「抽選を開始する」をクリック</li>
                  </ul>
                </div>
              </div>
              <div style={{ 
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
                    営業モード
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--discord-accent-blue)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      特殊営業
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid var(--discord-border)',
                        backgroundColor: 'var(--discord-bg-secondary)',
                        color: 'var(--discord-text-normal)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'default'
                      }}
                    >
                      通常営業
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--discord-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                    当選人数
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
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                  抽選結果を確認し、スプレッドシートにエクスポートします。
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
                    <li>抽選結果をスプレッドシートにエクスポート</li>
                    <li>マッチング画面への遷移</li>
                  </ul>
                </div>
              </div>
              <div style={{ 
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
                  <TooltipElement id="export-result" tooltip="抽選結果をスプレッドシートに保存">
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
                      抽選結果をシートに保存
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
          <div style={{ 
            background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid var(--discord-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                    <li>ユーザー別マッチング結果の確認</li>
                    <li>キャスト別マッチング結果の確認</li>
                    <li>マッチング結果をスプレッドシートにエクスポート</li>
                  </ul>
                </div>
              </div>
              <div style={{ 
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
                <TooltipElement id="export-matching" tooltip="マッチング結果をスプレッドシートに保存">
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
                    マッチング結果をシートに保存
                  </button>
                </TooltipElement>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 営業モードの違い */}
      <section style={{ marginBottom: '48px' }}>
        <h2 className="page-header-title page-header-title--md" style={{ 
          marginBottom: '20px', 
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Settings size={22} />
          営業モードの違い
        </h2>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid var(--discord-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--discord-accent-blue)'
                }} />
                特殊営業（完全リクイン制）
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                color: 'var(--discord-text-normal)',
                fontSize: '14px',
                lineHeight: '2'
              }}>
                <li>希望キャストは3つの別項目（E列、F列、G列）から読み込み</li>
                <li>当選人数 ≤ 出席キャスト数</li>
                <li>2ローテーション制</li>
                <li>希望キャストを優先的に割り当て</li>
              </ul>
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
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--discord-accent-green)'
                }} />
                通常営業
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                color: 'var(--discord-text-normal)',
                fontSize: '14px',
                lineHeight: '2'
              }}>
                <li>希望キャストは1項目（E列）のカンマ区切りから読み込み</li>
                <li>総テーブル数 ≥ 当選者数</li>
                <li>3ローテーション制</li>
                <li>空いているテーブルに優先的に配置</li>
              </ul>
            </div>
          </div>
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
        <div style={{ 
          background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid var(--discord-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
              q: '抽選結果やマッチング結果はどこに保存されますか？',
              a: '応募者名簿のスプレッドシート内に、新しいシートとして自動的に作成されます。シート名は「抽選結果_YYYYMMDD_HHMMSS」や「マッチング結果_YYYYMMDD_HHMMSS」の形式です。'
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
            <div key={idx} style={{ 
              background: 'linear-gradient(135deg, var(--discord-bg-secondary), var(--discord-bg-dark))',
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid var(--discord-border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
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
