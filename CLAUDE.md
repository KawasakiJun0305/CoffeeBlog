# CoffeeBlog — Claude 指示ファイル

## テスト後片付けの自動提案

スクリプト実行（`npm run generate`、`ts-node scripts/`、`npx ts-node` 等）や
試験的な記事生成を行った後は、ユーザーから求められなくても `/test-cleanup` の実行を提案すること。

提案タイミング:
- `scripts/` 配下のスクリプトを実行した後
- `output/` にファイルが生成されたと分かった後
- 「試してみた」「テスト実行した」など試験的な作業が完了したとき

提案の形式（簡潔に1行）:
> 「後片付けしますか？ → `/test-cleanup`」

## Gitブランチ戦略

**1対応1ブランチ**方針を採用する。

- タスク・修正・機能追加ごとに `feature/<name>` または `fix/<name>` ブランチを切る
- 作業完了後は main へ PR でマージ（直接 main コミット禁止）
- `/git-save` を提案する際は「ブランチを切りますか？」も合わせて案内する

## output/ はgit管理外

`output/` は `.gitignore` 対象。記事ファイルの削除後に `/git-save` を案内しない。
`generated.json` など git 管理下のファイルを変更した場合のみ `/git-save` を案内する。
