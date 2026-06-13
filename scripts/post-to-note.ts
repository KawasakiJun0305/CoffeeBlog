import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface NotePostPayload {
  title: string;
  body: string;
  status: "draft" | "publish";
}

interface NotePostResponse {
  data: {
    id: number;
    key: string;
    name: string;
    status: string;
    noteUrl: string;
  };
}

function parseArticleFile(filePath: string): { title: string; body: string } {
  const content = fs.readFileSync(filePath, "utf-8");

  // frontmatter を除去（最初の --- から次の --- まで）
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n\n/, "");

  // タイトル行を抽出
  const titleMatch = withoutFrontmatter.match(/^タイトル:\s*(.+)$/m);
  if (!titleMatch) {
    throw new Error('記事に "タイトル: " 行が見つかりません');
  }
  const title = titleMatch[1].trim();

  // タイトル行より後ろを本文として取得（先頭の区切り線も除去）
  const afterTitle = withoutFrontmatter
    .slice(withoutFrontmatter.indexOf(titleMatch[0]) + titleMatch[0].length)
    .replace(/^\s*---\s*\n/, "")
    .trim();

  return { title, body: afterTitle };
}

function findLatestOutputFile(): string {
  const outputDir = path.join(process.cwd(), "output");
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".md") && !f.endsWith("-dry.md") && f !== ".gitkeep")
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(outputDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    throw new Error("output/ フォルダに投稿できる記事が見つかりません");
  }

  return path.join(outputDir, files[0].name);
}

async function postToNote(
  payload: NotePostPayload,
  token: string
): Promise<NotePostResponse> {
  const res = await fetch("https://api.note.com/v2.0/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`note API エラー (${res.status}): ${errText}`);
  }

  return res.json() as Promise<NotePostResponse>;
}

async function main(): Promise<void> {
  const token = process.env.NOTE_API_TOKEN;
  if (!token) {
    throw new Error(
      "NOTE_API_TOKEN が設定されていません。.env ファイルを確認してください。"
    );
  }

  const args = process.argv.slice(2);
  const isPublish = args.includes("--publish");
  const filePath = args.find((a) => !a.startsWith("--")) ?? findLatestOutputFile();

  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  }

  console.log(`📄 対象ファイル: ${filePath}`);
  console.log(`📡 モード: ${isPublish ? "公開" : "下書き保存"}\n`);

  const { title, body } = parseArticleFile(filePath);

  console.log(`タイトル: ${title}`);
  console.log(`本文: ${body.slice(0, 80)}...\n`);

  const payload: NotePostPayload = {
    title,
    body,
    status: isPublish ? "publish" : "draft",
  };

  console.log("📤 note.com へ送信中...");
  const result = await postToNote(payload, token);

  const note = result.data;
  const label = isPublish ? "✅ 公開しました！" : "📝 下書きを保存しました！";
  console.log(`\n${label}`);
  console.log(`   記事ID  : ${note.id}`);
  console.log(`   記事URL : ${note.noteUrl ?? "（note管理画面で確認）"}`);
}

main().catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
