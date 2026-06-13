# シークレット管理ポリシー

このドキュメントは、CoffeeBlog パイプラインにおける API キー・認証情報の取り扱いルールを定めます。

---

## 絶対的なルール

| # | ルール |
|---|---|
| 1 | **API キー・パスワードをコードに書かない** |
| 2 | **`.env` ファイルをコミットしない** |
| 3 | **シークレットをログに出力しない** |
| 4 | **シークレットを PR 説明・Issue・チャットに貼らない** |

---

## シークレットの種類と管理場所

| シークレット | ローカル開発 | GitHub Actions |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env` ファイル | GitHub Secrets |
| `NOTE_EMAIL` | `.env` ファイル | GitHub Secrets |
| `NOTE_PASSWORD` | `.env` ファイル | GitHub Secrets |

---

## ローカル開発での手順

```bash
# 1. テンプレートをコピー
cp .env.example .env

# 2. .env に実際の値を記入（このファイルは .gitignore 済み）
ANTHROPIC_API_KEY=sk-ant-xxxxx
NOTE_EMAIL=your@email.com
NOTE_PASSWORD=yourpassword

# 3. npm install で pre-commit フックが自動セットアップされる
npm install
```

---

## 多層防御の仕組み

```
コミット時（ローカル）
  └─ pre-commit フック
        ├─ .env ファイルのステージ検出 → ブロック
        ├─ sk-ant- パターンの検出 → ブロック
        └─ PASSWORD= / API_KEY= の実値検出 → ブロック

プッシュ・PR 時（GitHub Actions）
  └─ security-audit.yml
        ├─ Gitleaks（.gitleaks.toml のルールで全履歴スキャン）
        └─ npm audit（依存パッケージの脆弱性）

GitHub リポジトリ設定
  └─ Secret scanning（GitHub 組み込み）
        └─ 主要な API キーパターンを自動検出・アラート
```

---

## もし誤ってコミット・プッシュしてしまったら

**即座に以下を実行してください。**

1. **API キーを失効させる**（最優先）
   - Anthropic Console → API Keys → 該当キーを削除
   - note.com → パスワードを変更

2. **Git 履歴から削除する**
   ```bash
   # BFG Repo Cleaner を使う場合
   bfg --delete-files .env
   git push --force
   ```

3. **新しい API キーを発行して `.env` に設定する**

4. **GitHub の Secret scanning アラートを確認する**

> **重要**: `git push --force` 後も、フォーク・クローン済みのリポジトリにはシークレットが残ります。必ずキーを失効させてください。

---

## pre-commit フックの動作確認

```bash
# フックが有効か確認
cat .git/config | grep hooksPath
# → hooksPath = .githooks が表示されればOK

# 手動でフックをテスト
.githooks/pre-commit
```

---

## 参照

- [.env.example](./.env.example) — 環境変数のテンプレート
- [.gitignore](./.gitignore) — Git 除外設定
- [.gitleaks.toml](./.gitleaks.toml) — Gitleaks スキャンルール
- [.github/workflows/security-audit.yml](./.github/workflows/security-audit.yml) — CI セキュリティチェック
