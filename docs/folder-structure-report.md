# フォルダ構成サマリレポート

**作成日**: 2026-06-13  
**対象**: `d:/GItHub/CoffeeBlog`

---

## ディレクトリツリー

```
CoffeeBlog/
│
├── 📄 README.md                    # セットアップ・コマンド・フロー説明
├── 📄 SECURITY.md                  # セキュリティポリシー
├── 📄 package.json                 # 依存管理・npm スクリプト
├── 📄 tsconfig.json                # TypeScript 設定
├── 📄 eslint.config.js             # ESLint Flat Config
├── 📄 .prettierrc                  # Prettier 設定
├── 📄 .prettierignore              # Prettier 除外設定
├── 📄 .env.example                 # 環境変数テンプレート
├── 📄 .gitignore                   # Git 除外設定
│
├── 📁 scripts/                     # 実行スクリプト
│   └── 📄 generate-post.ts         # ✅ 実装済み：AI 記事生成（Phase 1）
│   ※ post-to-note.ts              # 🔲 未作成（Phase 2）
│   ※ run-pipeline.ts              # 🔲 未作成（Phase 3）
│
├── 📁 types/
│   └── 📄 index.ts                 # 共有型定義（ArticleCategory, GeneratedArticle 等）
│
├── 📁 prompts/
│   └── 📄 coffee-article.md        # 記事生成プロンプトテンプレート
│
├── 📁 output/                      # 生成記事の一時保存（.gitignore 対象）
│   └── 📄 2026-06-13-...-dry.md   # ドライラン出力サンプル（1件）
│
├── 📁 samples/                     # note 既存記事サンプル（現在空）
│
├── 📁 docs/                        # ドキュメント
│   ├── 📄 concept.md               # ブログコンセプト・テーマ・ターゲット
│   ├── 📄 project-plan.md          # フェーズ別タスク・スケジュール
│   ├── 📄 ai-api-research.md       # AI API 選定調査（GitHub Models / Gemini / Groq）
│   ├── 📄 secrets-policy.md        # シークレット管理ポリシー
│   └── 📄 folder-structure-report.md  # このファイル
│
├── 📁 .github/
│   ├── 📄 dependabot.yml           # npm / Actions の自動アップデート設定
│   └── 📁 workflows/
│       ├── 📄 ci.yml               # push/PR 時 lint・型チェック
│       ├── 📄 generate-post.yml    # 月水金 09:00 記事生成（手動実行も可）
│       └── 📄 security-audit.yml   # 週次 npm audit + Gitleaks スキャン
│
└── 📁 .githooks/
    └── 📄 pre-commit               # コミット前シークレット漏洩チェック
```

---

## ファイル数サマリ

| カテゴリ | 件数 | 備考 |
|---------|------|------|
| 設定ファイル（ルート） | 7 | package.json, tsconfig, eslint, prettier 等 |
| スクリプト (`scripts/`) | 1 / 3 | Phase 2・3 のスクリプトは未作成 |
| 型定義 (`types/`) | 1 | 共有型 4 種 |
| プロンプト (`prompts/`) | 1 | カテゴリ別テンプレート |
| ドキュメント (`docs/`) | 5 | 設計・調査・ポリシー含む |
| GitHub Actions | 3 | CI + 生成 + セキュリティ |
| Git フック | 1 | pre-commit |

---

## 実装フェーズ進捗

| フェーズ | 内容 | 状態 |
|---------|------|------|
| Phase 1 | AI 記事生成スクリプト (`generate-post.ts`) | ✅ 完了 |
| Phase 2 | Playwright 自動投稿 (`post-to-note.ts`) | 🔲 未着手 |
| Phase 3 | エンドツーエンド統合 (`run-pipeline.ts`) | 🔲 未着手 |
| Phase 4 | GitHub Actions 自動化 | ✅ 完了 |

---

## 注目ポイント

### AI API 選定が変更済み

`docs/ai-api-research.md` に基づき `@anthropic-ai/sdk` → `openai` へ移行済み。  
**GitHub Models（GPT-4o）** を第1候補として採用。`GITHUB_TOKEN` のみで動作するため、GitHub Actions の追加 Secrets 設定が不要。

### セキュリティが多層防御

```
pre-commit フック（ローカル）
  └─ .env / sk-ant- / PASSWORD= の誤コミットをブロック
GitHub Actions（クラウド）
  └─ Gitleaks（全履歴スキャン）+ npm audit
GitHub Secret scanning（自動）
  └─ 主要 API キーパターンを自動検出
```

### コード品質ツールが整備済み

```bash
npm run lint          # ESLint（Flat Config + typescript-eslint）
npm run format:check  # Prettier チェック（CI 使用）
npm run typecheck     # tsc --noEmit
```

---

## 次のアクション候補

1. **AI API の最終決定**（GitHub Models / Gemini / Groq）
   - → `scripts/generate-post.ts` の `openai` SDK 呼び出しに切り替え
2. **Phase 2 着手**：`scripts/post-to-note.ts` の Playwright 実装
3. **samples/ にサンプル記事を追加**（プロンプト品質向上のため）
4. **GitHub Secrets 登録**（`NOTE_EMAIL`, `NOTE_PASSWORD`）
