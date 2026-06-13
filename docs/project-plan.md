# CoffeeBlog — プロジェクト計画書

**作成日**: 2026-06-13  
**プラットフォーム**: note.com  
**このリポジトリの役割**: AI 記事生成 + note.com 自動投稿パイプライン

---

## システム概要

```
[GitHub Actions - 週次 cron]
  ↓
[Claude API で記事下書き生成]
  ↓
[Playwright でnote.comにログイン]
  ↓
[note.com に下書き保存]  ← 自動化ここまで
  ↓
[人間がレビュー・加筆して公開]  ← 手動
```

---

## Phase 1: AI 記事生成スクリプト

**目標**: Claude API でコーヒー記事の下書きを生成する

### タスク
- [ ] `package.json` 初期化 + TypeScript 設定
- [ ] `@anthropic-ai/sdk` インストール
- [ ] `scripts/generate-post.ts` 作成
  - トピックを受け取り記事を生成
  - note 投稿に適した形式（タイトル + 本文）で出力
- [ ] `prompts/coffee-article.md` プロンプトテンプレート作成
- [ ] `.env.example` 作成（`ANTHROPIC_API_KEY`）

**完了基準**: `npm run generate` でコーヒー記事が生成される

---

## Phase 2: note.com 自動投稿スクリプト

**目標**: Playwright で note.com へ自動ログイン → 下書き保存

### タスク
- [ ] `playwright` インストール
- [ ] `scripts/post-to-note.ts` 作成
  - note.com にログイン
  - 新規記事作成画面を開く
  - タイトル・本文を入力
  - **下書き保存**（公開はしない）
- [ ] ログイン情報を `.env` で管理（`NOTE_EMAIL`, `NOTE_PASSWORD`）
- [ ] ローカルで動作確認

**完了基準**: スクリプト実行でnote.comに下書きが保存される

---

## Phase 3: エンドツーエンド統合

**目標**: 記事生成 → 下書き投稿を1コマンドで実行

### タスク
- [ ] `scripts/run-pipeline.ts` 作成（generate + post を連続実行）
- [ ] カテゴリローテーション（豆→抽出→カフェ→... を順番に）
- [ ] エラーハンドリング・リトライ処理
- [ ] 実行ログ保存

**完了基準**: `npm run pipeline` で自動的にnoteに下書きが作成される

---

## Phase 4: GitHub Actions 自動化

**目標**: 週次で自動的に下書き記事を生成・投稿

### タスク
- [ ] `.github/workflows/generate-post.yml` 作成
  - スケジュール: 週2〜3回（月・水・金 朝9時）
  - `ubuntu-latest` ランナーで Playwright ヘッドレス実行
  - GitHub Secrets 設定: `ANTHROPIC_API_KEY`, `NOTE_EMAIL`, `NOTE_PASSWORD`
- [ ] GitHub Secrets に各種キーを登録
- [ ] Actions のテスト実行・動作確認

**完了基準**: GitHub Actions でnoteに下書きが自動作成される

---

## スケジュール概算

| フェーズ | 期間 | 予定完了 |
|----------|------|----------|
| Phase 1 | 3〜5日 | 2026-06-18頃 |
| Phase 2 | 3〜5日 | 2026-06-23頃 |
| Phase 3 | 2〜3日 | 2026-06-26頃 |
| Phase 4 | 2〜3日 | 2026-06-30頃 |

---

## ディレクトリ構成

```
CoffeeBlog/
├── scripts/
│   ├── generate-post.ts      # Claude API で記事生成
│   ├── post-to-note.ts       # Playwright で note.com へ投稿
│   └── run-pipeline.ts       # 一括実行
├── prompts/
│   └── coffee-article.md     # 記事生成プロンプトテンプレート
├── output/                   # 生成記事の一時保存
├── samples/                  # note 既存記事サンプル（プロンプト参考）
├── .github/
│   └── workflows/
│       └── generate-post.yml
├── docs/
│   ├── concept.md
│   └── project-plan.md
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 環境・ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20.x LTS | ランタイム |
| TypeScript | 5.x | スクリプト |
| `@anthropic-ai/sdk` | 最新 | Claude API クライアント |
| `playwright` | 最新 | ブラウザ自動操作 |
| GitHub Actions | - | 定期自動実行 |

---

## セキュリティ注意事項

- `.env` は絶対に Git にコミットしない（`.gitignore` に追加）
- note.com のパスワードは GitHub Secrets で管理
- 下書き保存のみ自動化（誤公開防止）
