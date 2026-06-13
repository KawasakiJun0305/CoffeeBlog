import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// --- Types ---
interface TopicEntry {
  topic: string;
  category: string;
}

interface TopicsData {
  topics: TopicEntry[];
}

interface GeneratedEntry {
  topic: string;
  category: string;
  date: string;
  file: string;
  generated_by?: string;
}

interface GeneratedData {
  generated: GeneratedEntry[];
}

// --- Category prompts (from generate-post.ts) ---
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

  "道具・機器": `{{トピック}}について、購入判断に役立つ詳細レビュー記事を1600〜2000字で書いてください。

【構成】
1. この器具が解決する「悩み」（読者の共感を呼ぶ導入）
2. スペック・外観の詳細（サイズ・素材・価格帯）
3. 実際の使い心地（良い点×3・惜しい点×2）
4. 他製品との簡易比較表（2〜3製品）
5. こんな人に向いている / 向いていない（チェックリスト形式）
6. 総合評価（★5つ形式）と購入おすすめ度

末尾に追加: #コーヒー器具 #コーヒーグッズ #コーヒー #珈琲 #コーヒー好き`,

  "カフェ情報": `{{トピック}}について、読者が今すぐ行きたくなるレビュー記事を1200〜1500字で書いてください。

【構成】
1. そのカフェを一言で表すキャッチコピー
2. 雰囲気・内装の描写（写真なしでも目に浮かぶ具体的な描写）
3. おすすめドリンク・フードの詳細（味・見た目・価格帯）
4. おすすめシーン（一人作業・デート・家族等）
5. アクセスと注意事項（価格・営業時間は「公式サイトでご確認ください」と添える）
6. 総合評価（★5つで採点 + 一言コメント）

末尾に追加: #カフェ #コーヒー #カフェ巡り #おすすめカフェ #珈琲`,

  "コーヒー文化": `{{トピック}}について、読者の知的好奇心を刺激する読み物記事を1800〜2000字で書いてください。

【構成】
1. 意外な事実や驚きの導入（「実は〇〇だった」系のフック）
2. 背景・歴史・現状の解説
3. 日本や読者の日常との関連付け
4. トレンドや将来の展望
5. 読者が今日からできること（具体的なアクション提案）
6. エモーショナルな締め（コーヒーの魅力を再発見させる一文）

末尾に追加: #コーヒー #コーヒー文化 #珈琲 #コーヒーのある暮らし #コーヒー好きな人と繋がりたい`,
};

const DEFAULT_PROMPT = `{{トピック}}についてnote.com向けのブログ記事を1600〜2000字で書いてください。

【構成】
1. 読者を引き込むフック（驚き・共感・疑問のどれかで）
2. テーマの詳細解説（背景・歴史・仕組みなど）
3. 読者にとっての意味・価値（「なぜ知っておくべきか」）
4. 具体的なアドバイスや実践方法
5. 行動を促す締め（「今日帰ったら試したい」と思わせる）

末尾に追加: #コーヒー #珈琲 #コーヒー好きな人と繋がりたい`;

const SYSTEM_PROMPT = `あなたは神奈川在住のコーヒー専門ライターです。
note.comでコーヒーブログを運営しており、週2〜4本の記事を投稿しています。

読者プロフィール:
- 主に神奈川（横浜・鎌倉・湘南・川崎・小田原・箱根）に住む20〜40代
- コーヒー初心者〜中級者
- 世界のコーヒー産地に興味があり、日本の最新カフェトレンドも追いたい
- 週末に神奈川の素敵なカフェへ出かけたい

【コンセプト】
毎回の記事で読者に「え、知らなかった！」という発見と
「週末やってみよう / 行ってみよう」という行動意欲を必ず与えること。

【文体ガイドライン】
- 文末は「です・ます」調で統一
- 一文は50〜60字を目安に、テンポよく読める長さに
- 専門用語は初出時に括弧で説明
- 読者に語りかける表現を積極使用

【品質基準】
- タイトル: 30文字以内。数字・疑問形・「実は」「〇〇の理由」が効果的
- リード文: 最初の3〜4文で引き込む
- 具体性: 曖昧表現より数値・地名・固有名詞を優先
- 締め: 行動喚起で終わる

【禁止事項】
- 「〜かもしれません」「〜のようです」などの曖昧な逃げ表現
- 「様々な種類があります」などの具体性ゼロの記述
- うんちくの羅列（常に「読者にとっての意味・価値」を示す）
- 根拠のない健康効果の断定

出力フォーマット:
タイトル: [記事タイトル（30文字以内）]

---

[記事本文]

---
[ハッシュタグ]`;

// --- Data loading ---
function loadTopics(): TopicEntry[] {
  const topicsPath = path.join(process.cwd(), "topics.json");
  const data: TopicsData = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
  return data.topics;
}

function getGeneratedKeys(): Set<string> {
  const generatedPath = path.join(process.cwd(), "generated.json");
  if (!fs.existsSync(generatedPath)) return new Set();
  const data: GeneratedData = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
  return new Set(
    data.generated
      .filter((e) => e.generated_by === "topics")
      .map((e) => e.topic)
  );
}

// --- Status display ---
function showStatus(filterCategory?: string): void {
  const allTopics = loadTopics();
  const done = getGeneratedKeys();

  const filtered = filterCategory
    ? allTopics.filter((t) => t.category === filterCategory)
    : allTopics;

  const categories = [...new Set(allTopics.map((t) => t.category))];

  console.log("\n📊 Topics 生成ステータス");
  console.log("━".repeat(52));

  if (filterCategory) {
    const doneInCat = filtered.filter((t) => done.has(t.topic)).length;
    console.log(`🔍 カテゴリ: ${filterCategory}`);
    console.log(`✅ 生成済み: ${doneInCat} / ${filtered.length}`);
    console.log(`⏳ 残り:     ${filtered.length - doneInCat} 件`);
  } else {
    const totalDone = allTopics.filter((t) => done.has(t.topic)).length;
    const pct = ((totalDone / allTopics.length) * 100).toFixed(1);
    console.log(`✅ 生成済み: ${totalDone} / ${allTopics.length} (${pct}%)`);
    console.log(`⏳ 残り:     ${allTopics.length - totalDone} 件\n`);

    console.log("📂 カテゴリ別:");
    for (const cat of categories) {
      const total = allTopics.filter((t) => t.category === cat).length;
      const doneCount = allTopics.filter((t) => t.category === cat && done.has(t.topic)).length;
      const bar = "█".repeat(doneCount) + "░".repeat(Math.max(0, total - doneCount));
      const truncCat = cat.length > 18 ? cat.slice(0, 17) + "…" : cat.padEnd(18);
      console.log(`  ${truncCat} ${doneCount.toString().padStart(3)}/${total.toString().padEnd(3)} ${bar}`);
    }
  }
  console.log("━".repeat(52) + "\n");
}

// --- Pick unused topics ---
function pickUnused(count: number, filterCategory?: string): TopicEntry[] {
  const allTopics = loadTopics();
  const done = getGeneratedKeys();

  let unused = allTopics.filter((t) => !done.has(t.topic));
  if (filterCategory) {
    unused = unused.filter((t) => t.category === filterCategory);
  }

  // shuffle
  for (let i = unused.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unused[i], unused[j]] = [unused[j], unused[i]];
  }
  return unused.slice(0, count);
}

// --- Prompt builder ---
function buildUserPrompt(entry: TopicEntry): string {
  const template = CATEGORY_PROMPTS[entry.category] ?? DEFAULT_PROMPT;
  return template.replace("{{トピック}}", entry.topic);
}

// --- File utilities ---
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function sanitizeFilename(text: string): string {
  return text
    .replace(/[\\/:*?"<>|×（）【】「」『』]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// --- Generation ---
async function generateOne(
  entry: TopicEntry,
  isDryRun: boolean,
  index: number,
  total: number
): Promise<void> {
  const prefix = total > 1 ? `[${index + 1}/${total}] ` : "";

  console.log(`\n${prefix}📌 トピック: ${entry.topic}`);
  console.log(`   カテゴリ: ${entry.category}`);

  const userPrompt = buildUserPrompt(entry);

  if (isDryRun) {
    console.log(`\n🧪 ドライランモード（APIは呼ばれません）`);
    console.log("--- 生成されるプロンプト (先頭200字) ---");
    console.log(userPrompt.slice(0, 200) + "...");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN が設定されていません。.env ファイルを確認してください。");
  }

  const client = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: token,
  });

  console.log(`\n📝 生成中...`);
  let fullText = "";

  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  process.stdout.write("   ");
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullText += delta;
      process.stdout.write(".");
    }
  }
  console.log(" 完了!\n");

  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const dateStr = formatDate(new Date());
  const safeFilename = sanitizeFilename(entry.topic);
  const outputPath = path.join(outputDir, `${dateStr}-topics-${safeFilename}.md`);

  fs.writeFileSync(
    outputPath,
    `---
date: ${dateStr}
topic: ${entry.topic}
category: ${entry.category}
generated_by: topics
model: gpt-4o (GitHub Models)
---

${fullText}
`,
    "utf-8"
  );

  const generatedPath = path.join(process.cwd(), "generated.json");
  const generatedData: GeneratedData = fs.existsSync(generatedPath)
    ? JSON.parse(fs.readFileSync(generatedPath, "utf-8"))
    : { generated: [] };

  generatedData.generated.push({
    topic: entry.topic,
    category: entry.category,
    date: dateStr,
    file: path.relative(process.cwd(), outputPath).replace(/\\/g, "/"),
    generated_by: "topics",
  });

  fs.writeFileSync(generatedPath, JSON.stringify(generatedData, null, 2), "utf-8");

  console.log(`✅ 保存: ${path.basename(outputPath)}`);
  console.log("--- プレビュー ---");
  console.log(fullText.slice(0, 160) + "...\n");
}

// --- Main ---
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isStatus = args.includes("--status");

  const countIdx = args.indexOf("--count");
  const count = countIdx >= 0 ? Math.max(1, parseInt(args[countIdx + 1] ?? "1", 10)) : 1;

  const catIdx = args.indexOf("--category");
  const filterCategory = catIdx >= 0 ? args[catIdx + 1] : undefined;

  if (isStatus) {
    showStatus(filterCategory);
    return;
  }

  const entries = pickUnused(count, filterCategory);

  if (entries.length === 0) {
    const msg = filterCategory
      ? `カテゴリ「${filterCategory}」の未生成トピックがありません。`
      : "topics.json の全トピックが生成済みです！";
    console.log(`\n🎉 ${msg}`);
    return;
  }

  if (entries.length < count) {
    console.log(`⚠️  未生成トピックが ${entries.length} 件しかありません。${entries.length} 件を生成します。`);
  }

  for (let i = 0; i < entries.length; i++) {
    await generateOne(entries[i], isDryRun, i, entries.length);
    if (!isDryRun && i < entries.length - 1) {
      console.log("⏳ 3秒待機中...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (!isDryRun) {
    const allTopics = loadTopics();
    const doneCount = getGeneratedKeys().size + entries.length;
    console.log(`\n📊 進捗: ${doneCount} / ${allTopics.length} (${((doneCount / allTopics.length) * 100).toFixed(1)}%)`);
  }
}

main().catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
