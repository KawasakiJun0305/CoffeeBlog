import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// --- Types ---
interface ArticleFile {
  filename: string;
  filepath: string;
  title: string;
  body: string;
  mtime: number;
}

interface ArticleScore {
  filename: string;
  title: string;
  scores: {
    titleHook: number;
    originality: number;
    concreteness: number;
    readerFit: number;
  };
  total: number;
  rationale: string;
}

// --- Parsing ---
function parseFrontmatter(content: string): { fm: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return { fm, body: match[2].trim() };
}

function extractTitle(fm: Record<string, string>, body: string, filename: string): string {
  if (fm.title) return fm.title;

  // "タイトル: X" or "**タイトル**: X"
  const bodyTitle = body.match(/\*{0,2}タイトル\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*\n/);
  if (bodyTitle) return bodyTitle[1].trim();

  // First markdown heading
  const heading = body.match(/^#{1,4}\s+(.{4,40})/m);
  if (heading) return heading[1].trim();

  return fm.topic ?? filename;
}

function readArticles(dir: string, limit?: number): ArticleFile[] {
  if (!fs.existsSync(dir)) {
    console.error(`❌ output/ ディレクトリが見つかりません: ${dir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const filepath = path.join(dir, f);
      const stat = fs.statSync(filepath);
      return { filename: f, filepath, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime); // newest first

  const targets = limit ? files.slice(0, limit) : files;

  return targets.map(({ filename, filepath, mtime }) => {
    const content = fs.readFileSync(filepath, "utf-8");
    const { fm, body } = parseFrontmatter(content);
    const title = extractTitle(fm, body, filename);
    return { filename, filepath, title, body, mtime };
  });
}

// --- Scoring prompt ---
function buildScoringPrompt(articles: ArticleFile[]): string {
  const articleBlocks = articles
    .map((a, i) => {
      const preview = a.body.slice(0, 700).replace(/\n{3,}/g, "\n\n");
      return `=== 記事${i + 1}: ${a.filename} ===
タイトル候補: ${a.title}

${preview}
[...以下省略]`;
    })
    .join("\n\n");

  return `以下の${articles.length}本のコーヒーブログ記事候補を評価してください。

読者プロフィール: 神奈川在住の20〜40代、コーヒー初心者〜中級者、note.comでの閲覧を想定

【評価軸（各1〜5点）】
- titleHook: タイトルの引き込み力（数字・疑問形・「実は」「〇〇の理由」など）
- originality: 切り口の独自性・意外性（「え、こんな繋がりが！」の驚き）
- concreteness: 具体性（数値・地名・固有名詞の豊富さ）
- readerFit: note読者との親和性（神奈川・地域感・共感しやすさ）

【出力形式】
必ず以下のJSON配列のみを返してください（説明文不要）:
[
  {
    "filename": "ファイル名.md",
    "titleHook": 数値,
    "originality": 数値,
    "concreteness": 数値,
    "readerFit": 数値,
    "rationale": "2〜3文で推薦理由または課題点"
  }
]

${articleBlocks}`;
}

// --- Display ---
function renderTable(scores: ArticleScore[]): void {
  const BAR_MAX = 5;
  const bar = (n: number) => "█".repeat(n) + "░".repeat(BAR_MAX - n);

  console.log("\n" + "═".repeat(60));
  console.log("  📊 記事スコアリング結果（AIによる自動評価）");
  console.log("═".repeat(60));

  scores.forEach((s, idx) => {
    const medal = ["🥇", "🥈", "🥉"][idx] ?? `  ${idx + 1}.`;
    console.log(`\n${medal} 【${s.title}】`);
    console.log(`   ファイル: ${s.filename}`);
    console.log(`   合計スコア: ${s.total} / 20`);
    console.log(`   タイトル引き込み   ${bar(s.scores.titleHook)}  ${s.scores.titleHook}/5`);
    console.log(`   切り口の独自性     ${bar(s.scores.originality)}  ${s.scores.originality}/5`);
    console.log(`   具体性             ${bar(s.scores.concreteness)}  ${s.scores.concreteness}/5`);
    console.log(`   読者親和性         ${bar(s.scores.readerFit)}  ${s.scores.readerFit}/5`);
    console.log(`   📝 ${s.rationale}`);
  });

  console.log("\n" + "─".repeat(60));
  console.log("  ⚠️  人間味チェック（AI評価外）");
  console.log("  └ 「読んで心が動いた」「自分の言葉で語られている感」は");
  console.log("     数値に出ません。最終判断はあなたの直感で。");
  console.log("─".repeat(60) + "\n");
}

// --- Main ---
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "10", 10) : undefined;
  const dirIdx = args.indexOf("--dir");
  const outputDir = dirIdx >= 0 ? args[dirIdx + 1] : path.join(process.cwd(), "output");

  console.log(`\n📂 ${outputDir} から記事を読み込み中...`);
  const articles = readArticles(outputDir, limit);

  if (articles.length === 0) {
    console.log("❌ output/ に .md ファイルが見つかりません。先に記事を生成してください。");
    process.exit(1);
  }

  console.log(`✅ ${articles.length}本 を読み込みました:`);
  articles.forEach((a) => console.log(`   - ${a.filename}`));

  if (articles.length === 1) {
    console.log("\n⚠️  比較対象が1本のみです。複数生成後に実行するとより有益です。");
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN が設定されていません。.env ファイルを確認してください。");
  }

  const client = new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: token,
  });

  console.log("\n🤖 スコアリング中...");
  const prompt = buildScoringPrompt(articles);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content:
          "あなたはコンテンツ編集者です。指定されたJSON形式のみを返してください。余計な説明は不要です。",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";

  // Extract JSON array from response (strip markdown fences if present)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("❌ JSONの解析に失敗しました。APIレスポンス:");
    console.error(raw.slice(0, 400));
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawScores: any[];
  try {
    rawScores = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("❌ JSONパースエラー:", jsonMatch[0].slice(0, 200));
    process.exit(1);
  }

  // Map back to our type, matching by filename
  const scores: ArticleScore[] = rawScores
    .map((r) => {
      const article = articles.find((a) => a.filename === r.filename);
      const title = article?.title ?? r.filename;
      const s = {
        titleHook: Math.min(5, Math.max(1, Number(r.titleHook) || 3)),
        originality: Math.min(5, Math.max(1, Number(r.originality) || 3)),
        concreteness: Math.min(5, Math.max(1, Number(r.concreteness) || 3)),
        readerFit: Math.min(5, Math.max(1, Number(r.readerFit) || 3)),
      };
      return {
        filename: r.filename as string,
        title,
        scores: s,
        total: s.titleHook + s.originality + s.concreteness + s.readerFit,
        rationale: (r.rationale as string) ?? "",
      };
    })
    .sort((a, b) => b.total - a.total);

  renderTable(scores);
}

main().catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
