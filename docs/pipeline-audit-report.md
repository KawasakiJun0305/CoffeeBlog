# パイプライン監査レポート

> 生成日: 2026-06-13

---

## 1. パイプライン全体フロー

```
【トリガー】
  GitHub Actions スケジュール（月・水・金 09:00 JST）
  └─ workflow_dispatch（手動: topic / category / dry_run 指定可）
  または
  ローカル CLI: npm run generate / npm run matrix / npm run topics

         ↓

【コンテンツ選択】
  topics.json          → generate-post.ts         （カテゴリ × トピックの固定リスト）
  topics-matrix.json   → generate-from-matrix.ts  （豆60 × 抽出12 × 切り口18 = 12,960通り）
  [未追跡]               generate-from-topics.ts

         ↓

【AI生成】
  GitHub Models (Azure Inference Endpoint)
  モデル: GPT-4o  /  max_tokens: 4096  /  stream: true
  システムプロンプト → カテゴリ or 切り口別プロンプト → 記事本文生成（1600〜2000字）

         ↓

【保存】
  output/{date}-{topic}.md   （frontmatter + タイトル + 本文 + ハッシュタグ）
  generated.json             （生成済み記録・重複防止）

         ↓

【投稿】（手動: npm run post）
  post-to-note.ts → note.com API v2.0
  デフォルト: draft保存 / --publish で公開
```

---

## 2. コンポーネント別説明

| コンポーネント | ファイル | 役割 | 現状 |
|---|---|---|---|
| 単発生成 | `scripts/generate-post.ts` | topic + category 指定で1記事生成 | 稼働中 |
| マトリクス生成 | `scripts/generate-from-matrix.ts` | 豆×抽出×切り口のランダム組み合わせ生成 | 稼働中 |
| note投稿 | `scripts/post-to-note.ts` | output/ の最新 md を note.com へ POST | 稼働中（手動） |
| トピック生成 | `scripts/generate-from-topics.ts` | topics.json ベースの生成 | 未追跡・未確認 |
| CI | `.github/workflows/ci.yml` | lint + typecheck（push / PR 時） | 稼働中 |
| 定期生成 | `.github/workflows/generate-post.yml` | 週3回自動生成 → コミット | 稼働中 |
| PM管理 | `scripts/pm-report.ts` | プロジェクト進捗レポート | 稼働中 |

---

## 3. スケール感

| 軸 | 数 |
|---|---|
| 豆・産地 | 60種 |
| 抽出方法 | 12種 |
| 切り口 | 18種 |
| **総組み合わせ** | **12,960件** |
| 週3本ペースでのストック年数 | **約83年分** |

---

## 4. 現状の課題

### 🔴 高優先度

**① GitHub Models の Rate Limit・依存リスク**
GitHub Models（無料枠）は1日あたりのリクエスト数に上限がある。スケジュール実行が連続失敗してもサイレントに終わる可能性がある。

**② 投稿フローが完全手動**
生成→投稿の間に自動化がなく、`npm run post` を手動実行しないと記事が note に届かない。GitHub Actions で生成はされているが「公開」まで全自動になっていない。

**③ 品質ゲートが存在しない**
生成された記事に対するレビュー・リーガルチェック・重複チェックが自動化されていない（スキルは存在するが未統合）。

### 🟡 中優先度

**④ `generate-from-topics.ts` が未追跡**
git に追加されていない未追跡ファイルが存在する。CI 対象外のため型エラー等があっても検知されない。

**⑤ コード重複**
`sanitizeFilename` / `formatDate` / OpenAI クライアント初期化 / ファイル保存ロジック / `generated.json` 更新ロジックが `generate-post.ts` と `generate-from-matrix.ts` に重複している。

**⑥ エラー通知がない**
Actions 失敗時に Slack / メール通知なし。問題に気づくのが遅れる。

**⑦ 生成モデルが単一（GPT-4o のみ）**
Claude Sonnet 等への切り替えオプションがなく、コスト・品質の比較ができない。

### 🟢 低優先度 / 将来対応

- **画像自動挿入**（Pexels API）：設計済みだが未実装
- **`generated.json` がフラットな JSON**：記事数が増えるとパース・検索が遅くなる
- **note.com 投稿の公開スケジュール管理**：下書きが溜まる一方になる可能性

---

## 5. 改善提案（優先度順）

### P1 — 今すぐ着手推奨

#### ① 生成→投稿パイプラインの自動化

| 項目 | 内容 |
|---|---|
| 現状の問題 | 生成後の `npm run post` が手動。週3本生成されても誰かが手動実行しないと投稿されない |
| 提案内容 | `generate-post.yml` に `post-to-note.ts --publish` ステップを追加。または新規 `publish.yml` で output/ の未投稿ファイルを検出・投稿 |
| 期待効果 | 完全無人運転の実現 |
| 実装コスト | **小**（Actions への1ステップ追加 + `NOTE_API_TOKEN` シークレット設定） |

```yaml
# generate-post.yml に追加するステップ例
- name: Post to note.com
  if: ${{ github.event.inputs.dry_run != 'true' }}
  env:
    NOTE_API_TOKEN: ${{ secrets.NOTE_API_TOKEN }}
  run: npm run post -- --publish
```

#### ② `generate-from-topics.ts` を Git 管理下に追加

| 項目 | 内容 |
|---|---|
| 現状の問題 | 未追跡ファイルが CI 対象外でバグが潜りやすい |
| 提案内容 | `git add scripts/generate-from-topics.ts` + `package.json` の `topics` スクリプトを確認 |
| 実装コスト | **極小** |

#### ③ リーガルチェックをパイプラインに組み込む

| 項目 | 内容 |
|---|---|
| 現状の問題 | `review-coffee-article` / `legal-check-coffee-article` スキルがあるが生成フローに未接続 |
| 提案内容 | 生成後・投稿前にスキルを呼び出すステップを Actions に追加（またはローカル半自動フローとして整備） |
| 実装コスト | **中** |

---

### P2 — 次のスプリント

#### ④ 共通ユーティリティの抽出

| 項目 | 内容 |
|---|---|
| 現状の問題 | `sanitizeFilename` / `formatDate` / OpenAI クライアント / `generated.json` 更新が複数ファイルに散在 |
| 提案内容 | `scripts/lib/utils.ts` と `scripts/lib/ai-client.ts` に共通処理を切り出し |
| 実装コスト | **中**（リファクタリング） |

```
scripts/
├── lib/
│   ├── ai-client.ts    # OpenAI クライアント初期化・ストリーミング共通処理
│   ├── utils.ts        # sanitizeFilename / formatDate / generated.json 読み書き
│   └── prompts.ts      # システムプロンプト・カテゴリプロンプト定数
├── generate-post.ts
├── generate-from-matrix.ts
└── post-to-note.ts
```

#### ⑤ Actions 失敗時の通知追加

```yaml
- name: Notify on failure
  if: failure()
  run: |
    gh issue create \
      --title "🚨 記事生成失敗: $(date '+%Y-%m-%d')" \
      --body "ワークフローが失敗しました。ログを確認してください。" \
      --label "bug"
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### ⑥ 生成済み統計を Actions Step Summary に表示

```yaml
- name: Show matrix status
  run: npm run matrix:status >> $GITHUB_STEP_SUMMARY
```

---

### P3 — 将来対応

#### ⑦ 画像自動挿入（Pexels API 統合）
設計済み（`docs/image-integration-report.md` 参照）。APIキー取得後に着手。

#### ⑧ Claude API への切り替え検討
GitHub Models (GPT-4o) から Claude Sonnet / Haiku への切り替えオプションを追加。記事品質・コスト比較が可能になる。実装コストは小（baseURL + APIキーの変更のみ。既存 SDK は OpenAI 互換）。

#### ⑨ 投稿スケジュール管理
下書きが溜まりすぎないよう、生成日から N 日後に自動公開するスケジュール管理 Workflow を追加する。

---

## 6. まとめ

**強み**: 12,960通りというほぼ無尽蔵のコンテンツマトリクス、詳細な切り口別プロンプト設計、CI/lint 整備済みの堅牢な構成は非常に優れている。

**最重要アクション**: 「生成は自動、投稿は手動」というボトルネックを解消するため、**P1① の生成→投稿の自動化**を最初に着手することを推奨する。`NOTE_API_TOKEN` を GitHub Secrets に追加し、既存ワークフローに `npm run post -- --publish` ステップを追加するだけで完全自動化が実現する。

---

*生成: pipeline-audit スキル / Claude Sonnet 4.6*
