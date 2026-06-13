import type { ProjectStatus } from "../types/pm";

export const status: ProjectStatus = {
  project: "CoffeeBlog",
  description: "note.com向けコーヒーブログのAI記事生成・自動投稿パイプライン",
  goal: "週2〜4本のコーヒー記事をAIで自動生成し、note.comに下書き保存する",
  updated: "2026-06-13",

  phases: [
    {
      id: "phase1",
      name: "AI記事生成スクリプト",
      status: "done",
      target_date: "2026-06-18",
      notes: "openai SDK (GitHub Models / GPT-4o) を使用。GITHUB_TOKEN で認証。",
      tasks: [
        {
          id: "p1-1",
          name: "package.json + TypeScript設定",
          status: "done",
          file: "package.json",
        },
        {
          id: "p1-2",
          name: "scripts/generate-post.ts 作成",
          status: "done",
          file: "scripts/generate-post.ts",
        },
        {
          id: "p1-3",
          name: "prompts/coffee-article.md 作成",
          status: "done",
          file: "prompts/coffee-article.md",
        },
        {
          id: "p1-4",
          name: ".env.example 作成",
          status: "done",
          file: ".env.example",
        },
      ],
    },
    {
      id: "phase2",
      name: "note.com自動投稿スクリプト",
      status: "todo",
      target_date: "2026-06-23",
      notes: "playwright はインストール済み。note.com のセレクタ・ログインフローを要調査",
      tasks: [
        {
          id: "p2-1",
          name: "note.com ログインフローのセレクタ調査",
          status: "todo",
          notes: "Playwrightのcodegen機能で録画すると効率的",
        },
        {
          id: "p2-2",
          name: "scripts/post-to-note.ts 作成",
          status: "todo",
          file: "scripts/post-to-note.ts",
        },
        {
          id: "p2-3",
          name: "ログイン情報を .env で管理 (NOTE_EMAIL, NOTE_PASSWORD)",
          status: "todo",
        },
        {
          id: "p2-4",
          name: "ローカルで下書き保存の動作確認",
          status: "todo",
        },
      ],
    },
    {
      id: "phase3",
      name: "エンドツーエンド統合",
      status: "todo",
      target_date: "2026-06-26",
      tasks: [
        {
          id: "p3-1",
          name: "scripts/run-pipeline.ts 作成（generate + post を連続実行）",
          status: "todo",
          file: "scripts/run-pipeline.ts",
        },
        {
          id: "p3-2",
          name: "カテゴリローテーション実装",
          status: "todo",
          notes: "豆→抽出→カフェ→道具→文化 の順番で自動切替",
        },
        {
          id: "p3-3",
          name: "エラーハンドリング・リトライ処理",
          status: "todo",
        },
        {
          id: "p3-4",
          name: "実行ログ保存",
          status: "todo",
        },
      ],
    },
    {
      id: "phase4",
      name: "GitHub Actions自動化",
      status: "in-progress",
      target_date: "2026-06-30",
      tasks: [
        {
          id: "p4-1",
          name: ".github/workflows/generate-post.yml 作成",
          status: "done",
          file: ".github/workflows/generate-post.yml",
          notes: "月・水・金 09:00 JST、workflow_dispatch付き",
        },
        {
          id: "p4-2",
          name: "GitHub Secrets: NOTE_EMAIL / NOTE_PASSWORD 登録",
          status: "todo",
          notes: "GITHUB_TOKEN は Actions が自動提供するため登録不要",
        },
        {
          id: "p4-3",
          name: "Actions テスト実行・動作確認",
          status: "todo",
        },
      ],
    },
  ],

  blockers: [
    {
      id: "b1",
      phase: "phase2",
      description: "note.com のログインフロー・記事投稿セレクタが未調査",
      action: "npx playwright codegen note.com で手動録画してセレクタを特定する",
    },
  ],

  decisions: [
    {
      id: "d1",
      date: "2026-06-13",
      description: "AIクライアントを GitHub Models (GPT-4o) に決定",
      reason: "無料・追加APIキー不要。GitHub Actions では GITHUB_TOKEN が自動提供される。openai SDK (互換) を使用",
    },
    {
      id: "d2",
      date: "2026-06-13",
      description: "自動化の最終ステップを下書き保存までとする",
      reason: "誤公開リスク回避。人間によるレビュー・加筆後に手動公開するフローを採用",
    },
  ],
};
