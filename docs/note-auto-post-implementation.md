# note.com 自動投稿 実装記録

**作成日**: 2026-06-13  
**ステータス**: 実装済み・トークン取得待ち

---

## 現在の状態

| 項目 | 状態 |
|------|------|
| `scripts/post-to-note.ts` | ✅ 実装済み |
| `package.json` の `npm run post` | ✅ 定義済み |
| `.env.example` の `NOTE_API_TOKEN` | ✅ 追記済み |
| `.env` への実トークン設定 | ❌ **未完了（次のアクション）** |
| 動作確認 | ❌ 未実施 |

---

## アーキテクチャ

```
topics.json
    ↓
npm run generate  （generate-post.ts）
    ↓  GitHub Models (GPT-4o) で記事生成
output/{date}-{slug}.md
    ↓
npm run post      （post-to-note.ts）
    ↓  note.com 非公式 REST API
note.com（下書き or 公開）
```

---

## 使用API

**エンドポイント**

```
POST https://api.note.com/v2.0/notes
```

**ヘッダー**

```
Content-Type: application/json
Authorization: Bearer {NOTE_API_TOKEN}
```

**ボディ**

```json
{
  "title": "記事タイトル",
  "body":  "本文（Markdown）",
  "status": "draft"
}
```

`status` は `"draft"`（下書き）または `"publish"`（即公開）。

> ⚠️ 非公式APIのため、将来的に仕様変更の可能性あり。  
> 参考: [noteに毎日自動投稿するシステムの全コードを公開する (Qiita)](https://qiita.com/mistudio0902/items/f9e092ebe52e2b83c2e8)

---

## コマンド一覧

```bash
# output/ の最新ファイルを下書き保存（デフォルト・安全）
npm run post

# ファイルを指定して下書き保存
npm run post -- output/2026-06-13-エチオピア-イルガチェフェ.md

# --publish で即公開
npm run post -- --publish

# 生成 → 投稿を一気に行う（run-pipeline.ts 実装後）
npm run pipeline
```

---

## 再開手順（ここから始める）

### Step 1: Bearer トークンを取得する

1. ブラウザ（Chrome推奨）で **note.com にログイン**
2. `F12` → **Network** タブを開く
3. Filter欄に `api.note.com` と入力
4. noteのページを操作（記事一覧を開く・スクロール等）してリクエストを発生させる
5. 一覧に出たリクエストをクリック → **Headers** → **Request Headers**
6. `Authorization: Bearer eyJhbGciOi...` のトークン部分をコピー

### Step 2: `.env` に追記する

```env
NOTE_API_TOKEN=eyJhbGciOi...（コピーしたトークン）
```

> `.env` は `.gitignore` 済みなのでコミットされない。

### Step 3: 動作確認（下書きモード）

```bash
# まず記事を生成しておく（未生成の場合）
npm run generate -- "エチオピア イルガチェフェ" "豆・産地"

# 下書き保存を試す
npm run post
```

note.com の管理画面 → 「記事の管理」→「下書き」に記事が入っていれば成功。

### Step 4: 公開テスト

```bash
npm run post -- --publish
```

---

## ファイル構成（関連ファイル）

```
scripts/
├── generate-post.ts   # 記事生成（実装済み）
├── post-to-note.ts    # note投稿（実装済み）
└── run-pipeline.ts    # 生成→投稿の一気通貫（未実装）

output/
└── {date}-{slug}.md   # 生成された記事

.env                   # NOTE_API_TOKEN を設定（要設定）
.env.example           # テンプレート（コミット済み）

docs/
├── note-auto-post-research.md      # 調査レポート
└── note-auto-post-implementation.md  # このファイル
```

---

## 今後の拡張案

| 拡張 | 内容 | 優先度 |
|------|------|--------|
| `run-pipeline.ts` | 生成→投稿を1コマンドで | 高 |
| GitHub Actions 定期実行 | 週2〜4本を自動スケジュール | 高 |
| トークン自動更新 | 期限切れ時の再認証 | 中 |
| 投稿済み管理 | 二重投稿防止ログ | 中 |
| 画像アップロード | アイキャッチ自動設定 | 低 |

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|--------|------|------|
| `NOTE_API_TOKEN が設定されていません` | .env 未設定 | Step 1〜2 を実施 |
| `note API エラー (401)` | トークン期限切れ | DevToolsで再取得 |
| `note API エラー (422)` | ボディ形式エラー | title/body が空でないか確認 |
| `タイトル: 行が見つかりません` | MDフォーマット崩れ | output/ のファイルを目視確認 |
