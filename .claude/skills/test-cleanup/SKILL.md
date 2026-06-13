---
name: test-cleanup
description: 試験・テスト実行後の後片付けスキル。output/ の試験記事・generated.json のテストエントリ・Playwright成果物・ログファイルを検出し、確認後に一括クリーンアップする。「テスト後片付け」「試験成果物を削除して」「クリーンアップして」などに応答する。
allowed-tools: Glob(*) Grep(*) Read(*) Bash(*) Write(*) Edit(*) AskUserQuestion(*)
effort: low
---

# テスト後片付けスキル (test-cleanup)

試験・テスト実行後に生成された成果物を検出し、確認後に安全にクリーンアップする。
`generated.json` の孤立エントリも合わせて整理する。

## 使い方

```
/test-cleanup [オプション]
```

**オプション:**
| オプション | 説明 |
|-----------|------|
| `--dry-run` | 削除対象をリストアップするだけで実際には削除しない |
| `--all` | 確認なしで全検出ファイルを削除（自動化用途向け） |
| `--output-only` | output/ の記事ファイルのみを対象とする |
| `--json-only` | generated.json の孤立エントリ修正のみを行う |

---

## 実行手順

### Step 1: 後片付け対象の検出

以下を並行して検出する:

#### A. output/ の記事ファイル
```
Glob: output/**/*.md
```
`.gitkeep` は除外する。

#### B. generated.json
```
Read: generated.json
```
`generated` 配列のエントリ数と各エントリの `file` フィールドを把握する。

#### C. Playwright テスト成果物
```
Glob: test-results/**/*
Glob: playwright-report/**/*
Glob: storageState*.json
Glob: auth-state*.json
Glob: playwright/.auth/**/*
```

#### D. ログファイル
```
Glob: **/*.log
```
`node_modules/` は除外する（Bash で `find . -name "*.log" -not -path "*/node_modules/*"` を使う）。

#### E. generated.json の孤立エントリ検出
`generated.json` の各エントリの `file` フィールドに対して、ファイルが実際に存在するか確認する。
存在しないファイルを指すエントリは「孤立エントリ」として記録する。

---

### Step 2: 検出結果の集計と表示

以下のフォーマットで集計して表示する:

```
🔍 後片付け対象の検出結果
══════════════════════════════════════════
📄 output/ 記事ファイル     : <n>件
   例: 2026-06-13-エチオピア-イルガチェフェ.md
   例: 2026-06-13-matrix-ケニア-AA-...md
   （全ファイル名をリスト表示）

📋 generated.json エントリ : <n>件（うち孤立: <m>件）

🎭 Playwright 成果物        : <n>件 / <合計サイズMB>
   test-results/, playwright-report/, auth-state*.json 等

📝 ログファイル             : <n>件
   例: debug.log, error.log

══════════════════════════════════════════
合計: <N>件のファイルが後片付け対象です
```

何も検出されなかった場合:
```
✅ 後片付け対象はありません。作業環境はクリーンです。
```
と表示して終了する。

---

### Step 3: 削除スコープの確認

`--all` フラグがない場合は `AskUserQuestion` ツールを使って削除スコープを確認する:

```
質問: 以下のうち、削除するカテゴリを選んでください（複数選択可）
ヘッダー: 削除スコープ
選択肢 (multiSelect: true):
  - 「output/ の記事ファイル（全件）」: output/ 内の全 .md ファイルを削除
  - 「generated.json の孤立エントリのみ修正」: 実ファイルが存在しないエントリを削除
  - 「generated.json を完全リセット」: generated 配列を空配列にリセット
  - 「Playwright 成果物」: test-results/ / playwright-report/ / auth ファイル
  - 「ログファイル」: *.log ファイルを削除
```

**`--dry-run` の場合**: 削除は行わず、「このスコープだとこれらが削除される」という確認リストを表示して終了する。

---

### Step 4: 削除の実行

選択されたスコープに応じて削除を実行する。

#### output/ の記事ファイル削除
```bash
# output/.gitkeep は保持し、.md ファイルのみ削除
Remove-Item output/*.md -ErrorAction SilentlyContinue
```

#### generated.json の孤立エントリ修正
`generated.json` を読み込み、`file` フィールドのパスが実際に存在するエントリだけを残した新しい配列で上書きする。
`Write` ツールで `generated.json` を更新する（整形は `JSON.stringify(..., null, 2)` 相当の2インデントで）。

#### generated.json の完全リセット
```json
{
  "generated": []
}
```
で `generated.json` を上書きする。

#### Playwright 成果物の削除
```bash
Remove-Item -Recurse -Force test-results/ -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force playwright-report/ -ErrorAction SilentlyContinue
Remove-Item storageState*.json -ErrorAction SilentlyContinue
Remove-Item auth-state*.json -ErrorAction SilentlyContinue
Remove-Item -Recurse playwright/.auth/ -ErrorAction SilentlyContinue
```

#### ログファイルの削除
検出した `*.log` ファイルを1件ずつ削除する（`node_modules/` 外のみ）。

---

### Step 5: 完了レポート

```
✅ テスト後片付け完了
══════════════════════════════════════════
削除した記事ファイル : <n>件
generated.json      : <削除 or 孤立エントリ<m>件を除去 or リセット>
Playwright 成果物   : <n>件 削除 / スキップ
ログファイル        : <n>件 削除 / スキップ
──────────────────────────────────────────
作業環境はクリーンです。
══════════════════════════════════════════
```

---

## 注意事項

- `output/.gitkeep` は削除しない（ディレクトリ構造の保持）
- `node_modules/` 内のファイルは対象外
- `generated.json` の完全リセットは取り消せない操作なので、必ずユーザー確認を取る
- `--all` フラグでも `generated.json` の完全リセットだけは個別確認する
- 削除後、必要なら `/git-save` でクリーンアップをコミットすることを案内する
