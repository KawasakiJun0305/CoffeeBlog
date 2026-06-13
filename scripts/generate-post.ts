import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const CATEGORY_PROMPTS: Record<string, string> = {
  "豆・産地":
    "{{トピック}}について、産地の特徴・風味プロファイル・おすすめの飲み方を含む1500〜2000文字のブログ記事を書いてください。",
  "抽出・レシピ":
    "{{トピック}}の詳しいレシピと、美味しく淹れるコツを含む1500〜2000文字のブログ記事を書いてください。",
  カフェ情報:
    "{{トピック}}のカフェについて、雰囲気・おすすめメニュー・アクセスを含む1000〜1500文字のレビュー記事を書いてください。",
  "道具・機器":
    "{{トピック}}について、特徴・使い方・他製品との比較を含む1500〜2000文字のレビュー記事を書いてください。",
  コーヒー文化:
    "{{トピック}}について、背景・現状・読者が楽しめるポイントを含む1500〜2000文字のブログ記事を書いてください。",
};

const SYSTEM_PROMPT = `あなたはコーヒー専門のブログライターです。
日本語で、読みやすく親しみやすい文体で記事を執筆します。
コーヒー初心者にも中級者にも楽しめる内容を心がけてください。

出力は以下の形式で返してください：

タイトル: [記事タイトル（30文字以内）]

---

[記事本文]

文体ガイドライン：
- 一文を短くし、テンポよく読めるようにする
- 専門用語は初出時に簡単な説明を添える
- 読者に語りかけるような親しみやすい表現を使う
- 見出し（##）を使って読みやすく構成する
- 具体的なエピソードや数字を交える
- 文末は「です・ます」調で統一`;

function buildUserPrompt(topic: string, category: string): string {
  const template =
    CATEGORY_PROMPTS[category] ??
    "{{トピック}}について1500〜2000文字のブログ記事を書いてください。";
  return template.replace("{{トピック}}", topic);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function sanitizeFilename(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

async function generatePost(topic: string, category: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN が設定されていません。.env ファイルを確認してください。"
    );
  }

  const client = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: token,
  });

  console.log(`📝 記事を生成中...`);
  console.log(`   トピック: ${topic}`);
  console.log(`   カテゴリ: ${category}`);
  console.log();

  let fullText = "";

  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(topic, category) },
    ],
  });

  process.stdout.write("生成中: ");
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullText += delta;
      process.stdout.write(".");
    }
  }
  console.log(" 完了!\n");

  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = formatDate(new Date());
  const safeFilename = sanitizeFilename(topic);
  const outputPath = path.join(outputDir, `${dateStr}-${safeFilename}.md`);

  const fileContent = `---
date: ${dateStr}
topic: ${topic}
category: ${category}
model: gpt-4o (GitHub Models)
---

${fullText}
`;

  fs.writeFileSync(outputPath, fileContent, "utf-8");

  console.log(`\n✅ 保存しました: ${outputPath}`);
  console.log("\n--- プレビュー (先頭200文字) ---");
  console.log(fullText.slice(0, 200) + "...");
}

async function dryRun(topic: string, category: string): Promise<void> {
  const DUMMY_ARTICLE = `タイトル: ${topic}の魅力を徹底解説

---

## はじめに

こんにちは！今日は${topic}についてご紹介します。

## ${topic}とは？

${topic}は、コーヒー愛好家の間で非常に人気の高いテーマです。
その豊かな風味と香りは、多くの人を魅了してやみません。

## まとめ

ぜひ${topic}を試してみてください。きっと新しいコーヒーの世界が広がるはずです。
`;

  console.log(`🧪 ドライランモード（APIは呼ばれません）`);
  console.log(`   トピック: ${topic}`);
  console.log(`   カテゴリ: ${category}`);
  console.log(`   プロンプト: ${buildUserPrompt(topic, category)}\n`);

  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = formatDate(new Date());
  const safeFilename = sanitizeFilename(topic);
  const outputPath = path.join(outputDir, `${dateStr}-${safeFilename}-dry.md`);

  const fileContent = `---
date: ${dateStr}
topic: ${topic}
category: ${category}
mode: dry-run
---

${DUMMY_ARTICLE}
`;
  fs.writeFileSync(outputPath, fileContent, "utf-8");
  console.log(`✅ ドライランファイルを保存: ${outputPath}`);
  console.log("\n--- 生成されるプロンプト確認 ---");
  console.log("[システム]", SYSTEM_PROMPT.slice(0, 80) + "...");
  console.log("[ユーザー]", buildUserPrompt(topic, category));
}

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");

if (filteredArgs.length < 1) {
  console.error("使い方: npm run generate -- <トピック> [カテゴリ] [--dry-run]");
  console.error('例: npm run generate -- "エチオピア イルガチェフェ" "豆・産地"');
  console.error('例: npm run generate -- "ハンドドリップ入門" "抽出・レシピ" --dry-run');
  console.error(`\nカテゴリ一覧: ${Object.keys(CATEGORY_PROMPTS).join(", ")}`);
  process.exit(1);
}

const topic = filteredArgs[0];
const category = filteredArgs[1] ?? "豆・産地";

if (!Object.keys(CATEGORY_PROMPTS).includes(category)) {
  console.warn(`⚠️  不明なカテゴリ "${category}"。デフォルトのプロンプトを使用します。`);
}

const run = isDryRun ? dryRun : generatePost;
run(topic, category).catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
