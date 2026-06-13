# フリー素材画像統合 検討レポート

**作成日**: 2026-06-13  
**ステータス**: 実装待ち（APIキー取得後に着手可能）

---

## 背景・目的

現在の記事生成パイプラインはテキストのみ。note.com での視認性・エンゲージメント向上のため、フリー素材の写真を自動挿入する機能を検討した。

---

## 画像ソース比較

| サービス | 料金 | リクエスト制限 | クレジット表記 | コーヒー写真の質 |
|---------|------|--------------|--------------|--------------|
| Unsplash API | 無料 | 50回/時 | 必須（著作者名） | 非常に高い |
| **Pexels API** | **無料** | **無制限** | **必須（Pexels表記）** | **高い** |
| Pixabay API | 無料 | 5,000回/時 | 不要（CC0） | 中程度 |

### 採用決定: Pexels API

- リクエスト無制限で GitHub Actions の定期実行に適合
- 写真品質が高く、コーヒー関連素材が豊富
- クレジット表記は記事末尾に1行追加するだけで対応可能

---

## 実装方針

### 組み込み形式

- **本文内**: 記事先頭に1枚 + セクション区切りに任意で挿入
- **アイキャッチ**: note.com 非公式 API での eyecatch フィールド対応は未確認のため、まず本文内のみ実装し後から検証する

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/generate-post.ts` | Pexels API 呼び出し・画像URL挿入ロジックを追加 |
| `.env.example` | `PEXELS_API_KEY` を追加 |

### 追加パッケージ

**なし** — Pexels API は `fetch` で直接呼び出せる。

---

## 生成記事のイメージ（変更後）

```markdown
タイトル: エチオピア イルガチェフェの魅力

---

![エチオピア イルガチェフェ コーヒー](https://images.pexels.com/photos/XXXXX/pexels-photo.jpeg)
*Photo by [John Doe](https://www.pexels.com/@johndoe) on [Pexels](https://www.pexels.com)*

本文ここから...
```

---

## 実装フロー（変更後）

```
1. topics.json からトピック取得          ← 変更なし
2. GPT-4o で記事生成                    ← 変更なし
3. トピック → Pexels 検索キーワード変換   ← 新規
4. Pexels API 呼び出し → 画像URL取得    ← 新規
5. 記事先頭に画像＋クレジット挿入        ← 新規
6. output/*.md に保存                  ← 変更なし
```

---

## フェールセーフ設計

- `PEXELS_API_KEY` が未設定の場合は画像なしで記事生成を続行（エラーにしない）
- Pexels API がタイムアウト・エラーの場合も同様にスキップ

---

## 次のアクション

1. [ ] [Pexels API キーを取得する](https://www.pexels.com/api/)（無料・メール登録のみ）
2. [ ] `scripts/generate-post.ts` に画像取得ロジックを実装
3. [ ] `.env` / `.env.example` に `PEXELS_API_KEY` を追加
4. [ ] ローカルで動作確認（`npm run generate`）
5. [ ] GitHub Actions の Secrets に `PEXELS_API_KEY` を登録
6. [ ] （後回し）note.com API の eyecatch フィールド対応を調査・実装

---

## 保留事項

- **アイキャッチ設定**: `POST /v2.0/notes` に `eyecatch_image_url` フィールドがあるかは note.com DevTools で要確認。外部 URL を渡せるか、または note.com サーバーへのアップロードが必要かも不明。
