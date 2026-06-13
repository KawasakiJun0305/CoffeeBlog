# CoffeeBlog — AI 記事生成パイプライン

Claude API でコーヒー記事を自動生成し、note.com へ下書き保存するパイプライン。

## セットアップ

```bash
# 依存関係のインストール
npm install

# Playwright ブラウザのインストール
npx playwright install chromium

# 環境変数の設定
cp .env.example .env
# .env に ANTHROPIC_API_KEY, NOTE_EMAIL, NOTE_PASSWORD を記入
```

## 使い方

```bash
# 記事を生成（トピックとカテゴリを指定）
npm run generate -- "エチオピア イルガチェフェの魅力" "豆・産地"

# ドライラン（API を呼ばずに動作確認）
npm run generate -- "ハンドドリップ入門" "抽出・レシピ" --dry-run

# note.com へ下書き投稿（Phase 2 以降）
npm run post

# 生成 → 投稿を一括実行（Phase 3 以降）
npm run pipeline
```

### カテゴリ一覧

| カテゴリ       | 内容                         |
| -------------- | ---------------------------- |
| `豆・産地`     | 産地別特徴・風味プロファイル |
| `抽出・レシピ` | ドリップレシピ・抽出コツ     |
| `カフェ情報`   | カフェレビュー               |
| `道具・機器`   | コーヒーグッズレビュー       |
| `コーヒー文化` | トレンド・文化コラム         |

## 開発コマンド

```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint 自動修正
npm run format      # Prettier 整形
npm run format:check # フォーマットチェック（CI 用）
npm run typecheck   # TypeScript 型チェック
```

## GitHub Actions

| ワークフロー         | トリガー                    | 内容                |
| -------------------- | --------------------------- | ------------------- |
| `ci.yml`             | push / PR                   | lint・型チェック    |
| `generate-post.yml`  | 月・水・金 09:00 JST / 手動 | 記事生成            |
| `security-audit.yml` | 週次・push                  | npm audit・Gitleaks |

### Secrets の設定

GitHub リポジトリ Settings → Secrets and variables → Actions に以下を登録：

- `ANTHROPIC_API_KEY`
- `NOTE_EMAIL`
- `NOTE_PASSWORD`

## フロー

```
[GitHub Actions cron]
  ↓
[Claude API で記事生成]
  ↓
[output/ に Markdown 保存]
  ↓
[Playwright で note.com へ下書き保存]  ← Phase 2
  ↓
[人間がレビュー・公開]  ← 手動
```

## ディレクトリ構成

```
CoffeeBlog/
├── scripts/
│   ├── generate-post.ts   # Claude API で記事生成
│   ├── post-to-note.ts    # Playwright で note.com へ投稿
│   └── run-pipeline.ts    # 一括実行
├── types/
│   └── index.ts           # 共有型定義
├── prompts/
│   └── coffee-article.md  # プロンプトテンプレート
├── output/                # 生成記事（.gitignore 対象）
├── samples/               # note 既存記事サンプル
├── .github/workflows/
├── docs/
├── eslint.config.js
├── .prettierrc
└── tsconfig.json
```
