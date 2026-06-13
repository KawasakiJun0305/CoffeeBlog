import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// RSS feeds (no API key required)
const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World" },
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", name: "BBC Science" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", name: "BBC Business" },
];

const MAX_NEWS_ITEMS = 15;
const MAX_BOOKS = 8;

interface NewsItem {
  title: string;
  description: string;
  source: string;
}

interface BookItem {
  title: string;
  authors: string;
  publishedDate: string;
  description: string;
}

// Simple RSS parser — no extra packages needed
function extractXmlTag(content: string, tag: string): string | null {
  const cdataMatch = content.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`)
  );
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = content.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (plainMatch) return plainMatch[1].trim();
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const content = match[1];
    const title = extractXmlTag(content, "title");
    const description = extractXmlTag(content, "description");
    if (title && title.length > 10) {
      items.push({
        title: stripHtml(title),
        description: stripHtml(description ?? "").slice(0, 160),
        source: sourceName,
      });
    }
  }
  return items;
}

async function fetchRssNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];

  await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, name }) => {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "CoffeeBlogBot/1.0" },
        });
        if (!response.ok) return;
        const xml = await response.text();
        const items = parseRssItems(xml, name);
        allItems.push(...items);
        console.log(`  📡 ${name}: ${items.length}件取得`);
      } catch (err) {
        console.warn(`  ⚠️  ${name} 取得失敗: ${(err as Error).message}`);
      }
    })
  );

  return allItems.slice(0, MAX_NEWS_ITEMS);
}

// Uses OpenLibrary API (Internet Archive) — no API key, no rate limits
async function fetchRecentBooks(): Promise<BookItem[]> {
  const books: BookItem[] = [];
  const queries = ["coffee", "cafe barista", "food science", "wellness mindfulness"];

  for (const q of queries) {
    if (books.length >= MAX_BOOKS) break;
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&sort=new&limit=5&fields=title,author_name,first_publish_year,subject`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "CoffeeBlogBot/1.0" },
      });
      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      for (const doc of data.docs ?? []) {
        if (books.length >= MAX_BOOKS) break;
        if (!doc.title) continue;
        const alreadyAdded = books.some((b) => b.title === doc.title);
        if (!alreadyAdded) {
          books.push({
            title: doc.title,
            authors: (doc.author_name ?? ["不明"]).slice(0, 2).join(", "),
            publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "不明",
            description: (doc.subject ?? []).slice(0, 4).join(" / "),
          });
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  OpenLibrary 取得失敗 (${q}): ${(err as Error).message}`);
    }
  }

  console.log(`  📚 書籍: ${books.length}件取得`);
  return books;
}

const SYSTEM_PROMPT = `あなたは神奈川在住のコーヒー専門ライターです。
note.comでコーヒーブログを運営しており、週2〜4本の記事を投稿しています。

読者プロフィール:
- 主に神奈川（横浜・鎌倉・湘南・川崎・小田原・箱根）に住む20〜40代
- コーヒー初心者〜中級者
- 世界のコーヒー産地に興味があり、日本の最新カフェトレンドも追いたい

【あなたの特徴的な切り口】
最新ニュースや新刊書籍の話題と、コーヒーを意外な角度で結びつけた記事を書くのが得意です。
「え、こんな繋がりがあったの！」と読者が驚く発見を提供することを大切にしています。
コーヒー専門の話題でなくても構いません。ニュースや書籍のテーマから「コーヒーとの意外な接点」を見つけ、
読者が「なるほど！」と思える切り口で書きます。

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
- 根拠のない健康効果の断定

出力フォーマット（必ずこの順番で出力してください）:
インスピレーション: 参照したニュース/書籍のタイトルを一言で
カテゴリ: 時事・トレンド / コーヒー文化 / 健康・ウェルネス / コーヒーのサイエンス のいずれか
タイトル: 30文字以内のタイトル

---

（記事本文 1600〜2000字をここに書く）

---
（ハッシュタグをここに書く: 例 #コーヒー #珈琲 など）`;

function buildUserPrompt(news: NewsItem[], books: BookItem[]): string {
  const newsList = news
    .map(
      (n, i) =>
        `${i + 1}. [${n.source}] ${n.title}${n.description ? `\n   概要: ${n.description}` : ""}`
    )
    .join("\n");

  const bookList = books
    .map(
      (b, i) =>
        `${i + 1}. 「${b.title}」(${b.authors}, ${b.publishedDate})${b.description ? `\n   内容: ${b.description}` : ""}`
    )
    .join("\n");

  return `以下の最新ニュースと新刊書籍情報をもとに、コーヒーと面白い形で結びつけた記事を1本書いてください。

コーヒー専門の記事でなくても構いません。ニュースや書籍のテーマから「コーヒーとの意外な接点」を見つけ、
読者が「なるほど！」と思える切り口で記事を作成してください。

【今日の最新ニュース】
${newsList || "（取得できませんでした）"}

【最新書籍】
${bookList || "（取得できませんでした）"}

上記の中から最も面白い切り口を1つ選び、note.com向けの記事を作成してください。`;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Extract article body (everything after the first --- separator), stripping the meta header
function extractArticleBody(fullText: string): string {
  const parts = fullText.split(/\n---\n/);
  if (parts.length >= 3) {
    return `${parts[1].trim()}\n\n---\n${parts.slice(2).join("\n---\n").trim()}`;
  }
  if (parts.length === 2) {
    return parts[1].trim();
  }
  return fullText;
}

function sanitizeFilename(text: string): string {
  return text
    .replace(/[\\/:*?"<>|×（）【】「」『』]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

interface GeneratedEntry {
  topic: string;
  category: string;
  date: string;
  file: string;
  generated_by: string;
  inspiration?: string;
}

interface GeneratedData {
  generated: GeneratedEntry[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("\n🌐 最新情報を取得中...");

  const [news, books] = await Promise.all([fetchRssNews(), fetchRecentBooks()]);

  if (news.length === 0 && books.length === 0) {
    console.error("❌ ニュース・書籍データの取得に失敗しました。ネットワーク接続を確認してください。");
    process.exit(1);
  }

  console.log(`\n✅ 取得完了: ニュース${news.length}件 / 書籍${books.length}件`);

  const userPrompt = buildUserPrompt(news, books);

  if (isDryRun) {
    console.log("\n🧪 ドライランモード（APIは呼ばれません）");
    console.log("--- プロンプト先頭400字 ---");
    console.log(userPrompt.slice(0, 400) + "...");
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

  console.log("\n📝 記事生成中...");
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

  // Extract metadata — handle plain "Label: value" and bold "**Label**: value"
  const inspirationMatch = fullText.match(/\*{0,2}インスピレーション\*{0,2}[：:]\s*(.+)/);
  const categoryMatch = fullText.match(/\*{0,2}カテゴリ\*{0,2}[：:]\s*(.+)/);
  const titleMatch = fullText.match(/\*{0,2}タイトル\*{0,2}[：:]\s*(.+)/);

  const inspiration = inspirationMatch?.[1]?.trim() ?? "最新ニュース";
  const category = categoryMatch?.[1]?.trim() ?? "時事・トレンド";
  const title = titleMatch?.[1]?.trim() ?? "記事";

  // Strip the meta header block — save only the article body
  const articleBody = extractArticleBody(fullText);

  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const dateStr = formatDate(new Date());
  const safeFilename = sanitizeFilename(title);
  const outputPath = path.join(outputDir, `${dateStr}-news-${safeFilename}.md`);

  fs.writeFileSync(
    outputPath,
    `---
date: ${dateStr}
title: ${title}
category: ${category}
inspiration: ${inspiration}
generated_by: news
model: gpt-4o (GitHub Models)
news_fetched: ${news.length}
books_fetched: ${books.length}
---

${articleBody}
`,
    "utf-8"
  );

  const generatedPath = path.join(process.cwd(), "generated.json");
  const generatedData: GeneratedData = fs.existsSync(generatedPath)
    ? JSON.parse(fs.readFileSync(generatedPath, "utf-8"))
    : { generated: [] };

  generatedData.generated.push({
    topic: title,
    category,
    date: dateStr,
    file: path.relative(process.cwd(), outputPath).replace(/\\/g, "/"),
    generated_by: "news",
    inspiration,
  });

  fs.writeFileSync(generatedPath, JSON.stringify(generatedData, null, 2), "utf-8");

  console.log(`✅ 保存: ${path.basename(outputPath)}`);
  console.log(`📌 タイトル: ${title}`);
  console.log(`📂 カテゴリ: ${category}`);
  console.log(`💡 インスピレーション: ${inspiration}`);
  console.log("--- プレビュー ---");
  console.log(articleBody.slice(0, 200) + "...\n");
}

main().catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
