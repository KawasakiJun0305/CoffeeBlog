import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const CATEGORY_PROMPTS: Record<string, string> = {
  "豆・産地": `{{トピック}}について、以下の構成でnote.com向けブログ記事を1800〜2000字で書いてください。

【構成】
1. フック（読者が思わず続きを読みたくなる一文）
2. 産地の背景と歴史（標高・気候・農家のストーリーを交えて）
3. 風味プロファイルの詳細（具体的な食べ物・飲み物で表現）
4. おすすめの焙煎度と抽出方法（具体的な数値: 温度・量・時間）
5. どこで買える？体験できる？（ヒントを提示）
6. まとめ（読者への応援メッセージ）

末尾に追加: #コーヒー #スペシャルティコーヒー #珈琲 #コーヒー豆 #コーヒー好きな人と繋がりたい`,

  "抽出・レシピ": `{{トピック}}について、初心者でも今日から再現できる詳細なレシピ記事を1600〜2000字で書いてください。

【構成】
1. フック（この方法で淹れると劇的に美味しくなる理由を1文で）
2. 難易度と所要時間（冒頭に明記: 難易度 ★★☆☆☆ / 準備〇分+抽出〇分）
3. 必要な器具・材料リスト（代替品も提示）
4. ステップバイステップのレシピ（温度・量・時間の数値必須）
5. 失敗しやすいポイントとQ&A（2〜3つ）
6. バリエーション・アレンジ提案
7. まとめ

末尾に追加: #コーヒー #ハンドドリップ #コーヒーレシピ #珈琲 #おうちカフェ`,

  カフェ情報: `{{トピック}}について、読者が今すぐ行きたくなるレビュー記事を1200〜1500字で書いてください。

【構成】
1. そのカフェを一言で表すキャッチコピー
2. 雰囲気・内装の描写（写真なしでも目に浮かぶ具体的な描写）
3. おすすめドリンク・フードの詳細（味・見た目・価格帯）
4. おすすめシーン（一人作業・デート・家族等）
5. アクセスと注意事項（価格・営業時間は「公式サイトでご確認ください」と添える）
6. 総合評価（★5つで採点 + 一言コメント）

末尾に追加: #カフェ #コーヒー #カフェ巡り #おすすめカフェ #珈琲`,

  "道具・機器": `{{トピック}}について、購入判断に役立つ詳細レビュー記事を1600〜2000字で書いてください。

【構成】
1. この器具が解決する「悩み」（読者の共感を呼ぶ導入）
2. スペック・外観の詳細（サイズ・素材・価格帯）
3. 実際の使い心地（良い点×3・惜しい点×2）
4. 他製品との簡易比較表（2〜3製品）
5. こんな人に向いている / 向いていない（チェックリスト形式）
6. 総合評価（★5つ形式）と購入おすすめ度

末尾に追加: #コーヒー器具 #コーヒーグッズ #コーヒー #珈琲 #コーヒー好き`,

  コーヒー文化: `{{トピック}}について、読者の知的好奇心を刺激する読み物記事を1800〜2000字で書いてください。

【構成】
1. 意外な事実や驚きの導入（「実は〇〇だった」系のフック）
2. 背景・歴史・現状の解説
3. 日本や読者の日常との関連付け
4. トレンドや将来の展望
5. 読者が今日からできること（具体的なアクション提案）
6. エモーショナルな締め（コーヒーの魅力を再発見させる一文）

末尾に追加: #コーヒー #コーヒー文化 #珈琲 #コーヒーのある暮らし #コーヒー好きな人と繋がりたい`,
};

const SYSTEM_PROMPT = `あなたはコーヒー専門のブログライターです。
note.comでコーヒーブログを運営しており、週2〜4本の記事を投稿しています。
読者はコーヒー初心者〜中級者で、日常のコーヒー体験を豊かにしたいと思っています。

出力は以下のフォーマットで返してください：

タイトル: [記事タイトル（30文字以内）]

---

[記事本文]

---
[ハッシュタグ]

【文体ガイドライン】
- 文末は「です・ます」調で統一。体言止めも積極的に使いテンポを出す
- 一文は40〜50字を目安にシャープに。間延びしたら切る
- 専門用語は初出時に括弧で説明を添える（例: テロワール（土壌・気候などの環境要因））
- 語りかける表現（「〜ですよね」「ぜひ」「〜してみてください」）は1記事2回まで。乱用禁止
- 感覚描写を必ず1〜2文入れる。「カップに顔を近づけた瞬間」「一口含むと」など体験の瞬間を切り取る
- 見出し（##）で記事を明確にセクション分けする

【品質基準】
- タイトル: 30文字以内、読者がクリックしたくなる表現
- リード文: 最初の3〜4文で読者を引き込む（共感・驚き・疑問のいずれか）
- 具体性: 曖昧な表現より数値・固有名詞・エピソードを優先
- 締め: 1文で完結。「〜してください」の後に「〜なりますように」など二重締め禁止
- 読後感: 「試したい」「買いたい」「行きたい」と思わせる締め

【禁止事項】
- 「〜なんですね」「〜はずです」「〜かと思います」などのぬるい語尾の連発
- 同じことの言い直し・念押し・くどい繰り返し（一度述べたら繰り返さない）
- 「〜かもしれません」「様々な種類があります」などの曖昧・具体性ゼロの記述`;

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

  const generatedPath = path.join(process.cwd(), "generated.json");
  const generatedData = fs.existsSync(generatedPath)
    ? JSON.parse(fs.readFileSync(generatedPath, "utf-8"))
    : { generated: [] };
  generatedData.generated.push({
    topic,
    category,
    date: dateStr,
    file: path.relative(process.cwd(), outputPath).replace(/\\/g, "/"),
  });
  fs.writeFileSync(generatedPath, JSON.stringify(generatedData, null, 2), "utf-8");

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
