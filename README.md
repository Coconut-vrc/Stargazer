# Stargazer

抽選・マッチング管理アプリ（Tauri 2 デスクトップアプリ）

完全ローカル運用。外部API・認証は使用しません。応募データはCSV取り込み、キャスト・NGはPC内のJSONで管理します。

## プロジェクト構成

```
desktop/         # Tauri 2 デスクトップアプリ
  src/           # フロントエンド（Vite + React）
  src-tauri/     # Rust バックエンド
docs/            # 設計書・ドキュメント（仕様書、FUNCTIONAL_SPEC 等）
```

## Getting Started

**リポジトリのルート（Stargazer）で実行する。** `tauri` はグローバルではなく `desktop/node_modules` に入っているため、必ず `npm run` で起動する。

```bash
# 依存関係（ルートと desktop の両方）
npm install
cd desktop && npm install && cd ..

# 開発起動（Tauri + React）
npm run dev
```

ビルド:

```bash
npm run build
```
