# サンプルデータ一覧（desktop/public）

`docs/import-file-reference.md` で参照した Google フォームの列構成を参考にしたサンプルCSVです。  
**データ読取**で「カスタム」を選び、CSV選択後に列の割り当てで各列を項目にマッピングして取り込んでください。

---

## フォーム別サンプル（カスタムインポート用）

| ファイル | 参照フォーム | 主な列（1行目ヘッダー） |
|----------|--------------|-------------------------|
| `sample-form-almare.csv` | 海底宮殿 ALMARE | VRC名, xアカウントURL（最小2列） |
| `sample-form-bar-onedrop.csv` | Bar OneDrop | 注意事項への同意, VRC-ID, Xアカウント名, 話したいキャストの希望, 意気込み・質問 |
| `sample-form-club-suien.csv` | CLUB SUIEN | 同意, Twitter応募要項, VRChatのURL, TwitterのURL, 指名したいキャスト(複数可) |
| `sample-form-love-eden.csv` | Club Luv of Eden | VRC名, Xのリンク, ホラー等NG(複数選択) |
| `sample-form-pecheur.csv` | Pécheur（ホスト） | VRchat名, X, 参加人数, 連れ様VRC名, 第一希望, 第二希望, 確認, 意気込み |
| `sample-form-otenjo.csv` | 天上の縁 | X(URL), VRChatのアカウント(URL), 初参加, 気になる神(任意), 自由記述欄, 禁止事項・確認 |
| `sample-form-mimidream.csv` | めいどりーむ症候群 | VRChatのお名前, X(@から), 希望時間帯, 連絡事項・キャストへのメッセージ, 確認事項 |
| `sample-form-mimichou.csv` | mimiChou | VRCアカウント名, X URL, VRCユーザーページURL, フォロー確認, PCVR・VC, ランク, 女性アバター, 気になるキャスト(任意), 一言・意気込み |
| `sample-form-3x3.csv` | 3×3 シェアハウス | 同意, VRC URL, X URL, 君の気になる子は誰？(複数可), 呼ばれたい名前, スキンシップ範囲 |

---

## 既存スタブ・テスト用（テンプレート or カスタム）

| ファイル | 用途 | 形式 |
|----------|------|------|
| `stub-import-basic.csv` | 基本テンプレート | ユーザー名, アカウントID, 希望キャスト１～３（200名） |
| `stub-import-checkbox.csv` | カンマ区切り希望 | ユーザー名, アカウントID, 希望キャスト(カンマ区切り)（200名） |
| `test-200-ng.csv` | NG/要注意人物テスト | 基本列＋NG一致ユーザー含む（200名） |
| `test-200-group-10x20.csv` | M005 グループ用 | 200名 |
| `test-120-group-6x20.csv` | M005 小規模 | 120名 |
| `test-200-multiple-5x3.csv` | M006 複数用 | 200名 |
| `test-60-multiple-4x3.csv` | M006 小規模 | 60名 |

---

※ フォーム別サンプルの「希望キャスト」列には、本プロジェクトの出席キャスト名（sample-casts.json 等）に合わせた値を入れています。実際のフォームでは各イベントのキャスト名に読み替えてください。
