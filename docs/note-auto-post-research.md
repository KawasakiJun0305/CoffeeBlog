# note.com 自動投稿 調査レポート

**調査日**: 2026-06-13  
**目的**: generate-post.ts で生成した記事をnote.comへスマートに自動投稿する方法を評価する

---

## 結論

**非公式REST APIによる直接投稿**が最もスマートな方法。  
Playwrightなどのブラウザ自動化は不要で、`fetch()` 1回で投稿できる。

---

## 比較表

| 方法 | 難易度 | 安定性 | 自動公開 | 備考 |
|------|--------|--------|----------|------|
| 非公式REST API | ★☆☆ | 中（仕様変更リスク） | ✅ 可能 | 最有力 |
| note MCP サーバー | ★☆☆ | 中 | ❌ 下書きのみ | Claude Desktop連携向け |
| Playwright（ブラウザ操作） | ★★★ | 低（UI変更で壊れる） | ✅ 可能 | 最終手段 |
| 公式API | — | — | — | **存在しない** |

---

## 方法1: 非公式REST API（推奨）

### エンドポイント

```
POST https://api.note.com/v2.0/notes
```

### 認証

```
Authorization: Bearer {APIトークン}
Content-Type: application/json
```

### リクエストボディ

```json
{
  "title": "記事タイトル",
  "body": "本文テキスト（HTML or Markdown）",
  "status": "publish"
}
```

`status` は `"draft"` にすれば下書き保存になる。

### Bearer トークンの取得手順

1. ブラウザでnote.comにログイン
2. DevTools（F12）を開く → **Network** タブ
3. noteの任意のページを操作（記事一覧など）
4. リクエスト一覧から `api.note.com` へのリクエストを選択
5. **Request Headers** の `Authorization: Bearer xxxxx` を確認
6. そのトークンをコピーして `.env` に保存

> ⚠️ トークンの有効期限は不明（セッション依存）。失効した場合は再取得が必要。

### TypeScript での実装イメージ

```typescript
// scripts/post-to-note.ts
import * as dotenv from "dotenv";
dotenv.config();

interface NotePostPayload {
  title: string;
  body: string;
  status: "publish" | "draft";
}

async function postToNote(payload: NotePostPayload) {
  const res = await fetch("https://api.note.com/v2.0/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NOTE_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`note API error ${res.status}: ${err}`);
  }

  return res.json();
}
```

### 環境変数

```env
NOTE_API_TOKEN=eyJhbGciOiJIUzI1NiJ9...
```

---

## 方法2: note.com MCP サーバー

**リポジトリ**: `shimayuz/note-com-mcp`（コミュニティ製）

### 特徴

- Claude Desktop / Cursor から自然言語でnoteを操作できる
- 認証は `NOTE_EMAIL` / `NOTE_PASSWORD` / `NOTE_USER_ID` 環境変数
- 下書き作成・画像アップロード・マガジン管理に対応
- **公開はnote.com上で手動が必要**（publishエンドポイント非対応）

### 向いている用途

- Claude Desktopから手動で「これをnoteに下書き保存して」と指示するフロー
- 完全自動化よりも半自動（確認してから公開）を好む場合

---

## 方法3: Playwright（最終手段）

### 採用しない理由

- noteのエディタはProseMirrorベースで単純なフォーム入力が効かない
- UI変更のたびにセレクターのメンテが必要
- 実行環境にChromiumが必要でGitHub Actionsが重くなる

### 採用すべきケース

- REST APIが突然使えなくなった場合のフォールバック
- 画像付き投稿など、APIが未対応の操作をしたい場合

---

## 推奨パイプライン

```
topics.json
    ↓
generate-post.ts（GitHub Models で記事生成）
    ↓
output/{date}-{slug}.md（ローカル保存）
    ↓
post-to-note.ts（REST API で投稿）
    ↓
GitHub Actions（スケジュール実行: 週2〜4回）
```

---

## 次のアクション

- [ ] ブラウザDevToolsでBearer トークンを取得する
- [ ] `scripts/post-to-note.ts` を実装する
- [ ] `generate-post.ts` と連携して一気通貫パイプラインを構築する
- [ ] `.env.example` に `NOTE_API_TOKEN` を追加する
- [ ] GitHub Actions の Secrets に `NOTE_API_TOKEN` を登録する

---

## 参考リンク

- [noteに毎日自動投稿するシステムの全コードを公開する（Qiita）](https://qiita.com/mistudio0902/items/f9e092ebe52e2b83c2e8)
- [note.com MCP Server（glama.ai）](https://glama.ai/mcp/servers/@shimayuz/note-com-mcp/tree/c4a3520aedc99a3da638a5827959506d0e391aac)
- [note自動投稿Pythonライブラリ開発の話（note.com）](https://note.com/naokun_gadget/n/naf129cb5f34b)
- [note APIでの自動化について（note.com）](https://note.com/akawibaku137/n/nc154955d0220)
