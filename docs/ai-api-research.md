# AI API 調査レポート — 無料・低コスト日本語ブログ生成

**作成日**: 2026-06-13  
**目的**: API キー不要 or 完全無料で日本語ブログ記事を生成できる AI を選定する

---

## 結論（先に見たい方へ）

| 優先度 | サービス | 理由 |
|--------|----------|------|
| **第1候補** | **GitHub Models（GPT-4o）** | GitHub Actions で追加APIキー完全不要 |
| **第2候補** | **Gemini 2.5 Flash** | 日本語品質トップクラス・無料枠で年中余る |
| **第3候補** | **Groq + Llama 3.3 70B** | 爆速・無料枠あり |

---

## 候補詳細

### 1. GitHub Models（追加キー不要）

| 項目 | 内容 |
|------|------|
| **URL** | https://github.com/marketplace/models |
| **利用可能モデル** | GPT-4o, GPT-4.1, o3, Llama 3.3 70B, Phi-4 など45+モデル |
| **無料枠** | レート制限あり（8K トークン入力 / 4K 出力/リクエスト） |
| **認証方法** | `GITHUB_TOKEN`（GitHub Actions で自動提供）または GitHub PAT |
| **追加APIキー** | **不要**（GitHub アカウントだけで使える） |
| **日本語品質** | GPT-4o 使用時：★★★★☆（十分高品質） |
| **GitHub Actions 相性** | ★★★★★（GITHUB_TOKEN 自動注入で設定ゼロ） |

**コード例（OpenAI SDK 互換）**:
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
});
```

**制限事項**:
- 1リクエストあたり最大 4K 出力トークン（約3000文字 = 十分）
- ローカル実行には GitHub PAT（Personal Access Token）が別途必要

---

### 2. Gemini 2.5 Flash（Google AI Studio）

| 項目 | 内容 |
|------|------|
| **URL** | https://aistudio.google.com/ |
| **利用可能モデル** | gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro |
| **無料枠** | 10〜30 req/分、1日上限あり（週4本なら年中無料） |
| **認証方法** | Google アカウントで API キーを1回発行 |
| **追加APIキー** | 必要（1回だけ取得・無料） |
| **日本語品質** | ★★★★★（現状トップクラス） |
| **GitHub Actions 相性** | ★★★★☆（Secrets に1つ登録するだけ） |

**コード例（Google AI SDK）**:
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const result = await model.generateContent(prompt);
```

**制限事項**:
- API キーの1回取得が必要（Google アカウントがあれば5分）
- 思考機能（Thinking）使用時は消費トークンが増える

---

### 3. Groq（超高速・Llama 3.3 70B）

| 項目 | 内容 |
|------|------|
| **URL** | https://console.groq.com/ |
| **利用可能モデル** | llama-3.3-70b-versatile, qwen2.5-72b など |
| **無料枠** | 1日500リクエスト、14,400 トークン/分 |
| **認証方法** | Groq アカウントで API キーを発行 |
| **日本語品質** | Llama 3.3: ★★★★☆ / Qwen2.5: ★★★★★ |
| **生成速度** | ★★★★★（他の10倍以上速い） |

**制限事項**:
- Groq アカウントの作成が必要
- 日本語は英語よりやや弱い場合あり（Qwen2.5 なら高品質）

---

## 推奨構成

### パターン A: 完全キー不要（GitHub Actions のみ）

```
GitHub Actions
  → GITHUB_TOKEN で GitHub Models (GPT-4o) を呼び出し
  → 記事生成
  → Playwright で note.com に投稿
```

**メリット**: 設定ゼロ  
**デメリット**: ローカル実行に GitHub PAT が別途必要

---

### パターン B: 最高品質（Gemini 2.5 Flash）

```
ローカル / GitHub Actions
  → GEMINI_API_KEY（無料）で Gemini 2.5 Flash を呼び出し
  → 記事生成
  → Playwright で note.com に投稿
```

**メリット**: 日本語品質が最高、無料枠で十分  
**デメリット**: Googleアカウントで API キーを1回取得（5分）

---

### パターン C: 両方使う（フォールバック付き）

```
GitHub Actions → GitHub Models (GPT-4o)  # レート超過時
ローカル       → Gemini 2.5 Flash         # 高品質生成時
```

---

## 必要な環境変数の比較

| パターン | .env に必要なもの | GitHub Secrets に必要なもの |
|----------|-----------------|--------------------------|
| A (GitHub Models) | `GITHUB_TOKEN`（PAT） | なし（GITHUB_TOKEN 自動） |
| B (Gemini) | `GEMINI_API_KEY` | `GEMINI_API_KEY` |
| C (両方) | `GITHUB_TOKEN` + `GEMINI_API_KEY` | `GEMINI_API_KEY` |

---

## 次のアクション

どのパターンを採用するか決定後、以下を実施:

- [ ] パターン A → `npm install openai` (OpenAI SDK 互換)
- [ ] パターン B → `npm install @google/generative-ai`
- [ ] `package.json` から `@anthropic-ai/sdk` を削除
- [ ] `docs/project-plan.md` の AI 欄を更新

---

Sources:
- [Best Free LLM API 2026: Gemini, Groq, OpenRouter Ranked](https://costbench.com/best/best-llm-api-with-free-tier/)
- [Best Free LLM API Tiers in 2026: Groq, Cerebras, GitHub Models & More](https://wetheflywheel.com/en/ai-model-access/free-llm-api-tiers-2026/)
- [GitHub Models - marketplace](https://github.com/marketplace/models)
- [Google AI Studio Pricing 2026](https://www.nocode.mba/articles/google-ai-studio-pricing)
- [Gemini API Free Tier 2026](https://pecollective.com/tools/gemini-free-tier-guide/)
