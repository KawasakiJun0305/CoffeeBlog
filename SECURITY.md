# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Reporting a Vulnerability

セキュリティ上の脆弱性を発見した場合は、**GitHub Issues には投稿せず**、以下の方法でご連絡ください。

- Email: jr2552jr@gmail.com

報告内容に含めていただきたい情報:

- 脆弱性の概要
- 再現手順
- 影響範囲の想定

報告を受けてから **7日以内** に返信し、**30日以内** に対応方針をお知らせします。

## Security Practices

このリポジトリでは以下のセキュリティ対策を実施しています:

- **シークレット管理**: API キーや認証情報は `.env` ファイルで管理し、`.gitignore` により Git 管理外としています
- **依存関係の自動更新**: Dependabot による週次の脆弱性スキャンおよびパッケージ更新
- **CI セキュリティ監査**: プッシュ・PR ごとに `npm audit` および Gitleaks によるシークレットスキャンを実行
- **GitHub Actions のシークレット**: `NOTE_EMAIL`・`NOTE_PASSWORD`・`ANTHROPIC_API_KEY` は GitHub Secrets 経由で注入し、コードには含みません

## Required GitHub Repository Settings

このリポジトリを fork・利用する場合は、以下を GitHub の Settings から有効化することを推奨します:

- **Secret scanning**: Settings > Security > Secret scanning
- **Dependabot alerts**: Settings > Security > Dependabot alerts
- **Branch protection rules**: main ブランチへの直接プッシュを禁止し、PR 経由のマージを必須化
