import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// --- Types ---
interface TopicsMatrix {
  beans: string[];
  methods: string[];
  angles: string[];
}

interface Combination {
  bean: string;
  method: string;
  angle: string;
}

interface GeneratedEntry {
  bean?: string;
  method?: string;
  angle?: string;
  generated_by?: string;
}

interface GeneratedData {
  generated: GeneratedEntry[];
}

// --- Load matrix ---
const matrixPath = path.join(process.cwd(), "topics-matrix.json");
const matrix: TopicsMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));

// --- System prompt (Kanagawa-focused, high quality) ---
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
コーヒーを通じて世界を旅する感覚、日本の今を感じる視点を常に意識する。

【文体ガイドライン】
- 文末は「です・ます」調で統一
- 一文は50〜60字を目安に、テンポよく読める長さに
- 専門用語は初出時に括弧で説明（例: テロワール（土壌・気候などの環境要因））
- 読者に語りかける表現を積極使用（「〜してみてください」「〜ですよね」「ぜひ」）

【品質基準】
- タイトル: 30文字以内。数字・疑問形・「実は」「〇〇の理由」が効果的
- リード文: 最初の3〜4文で「驚き・旅心・共感・行動欲求」のどれかで引き込む
- 具体性: 曖昧表現より数値・地名・固有名詞・エピソードを優先
- 締め: 「今日帰ったら試してほしい」「今週末ぜひ行ってみてください」など行動喚起

【事実確認・入手可能性ルール】
- 産地・精製方法・健康効果など事実に基づく記述は「〜とされています」「〜という研究があります」など根拠の性格を示す表現にとどめる
- 希少豆（小笠原諸島・沖縄・パナマゲイシャ・ジャマイカ ブルーマウンテン等）が市販ドリップバッグとして売られている可能性は低い。そのような組み合わせでは「専門焙煎店やオンラインで豆を入手してから、自宅で○○形式のバッグに詰めて楽しむ方法」として正直に案内すること
- カフェ名・ショップ名・ブランド名を具体的に挙げる場合、架空の名称を使わない。「近くのスペシャルティコーヒーショップ」など一般的な表現にとどめるか、実在が確実な著名店のみ使用する

【禁止事項】
- 「〜かもしれません」「〜のようです」などの曖昧な逃げ表現
- 「様々な種類があります」などの具体性ゼロの記述
- うんちくの羅列（常に「読者にとっての意味・価値」を示す）
- 根拠のない健康効果の断定
- 入手が現実的でない前提のまま「手軽に」「簡単に手に入る」と記述すること

出力フォーマット:
タイトル: [記事タイトル（30文字以内）]

---

[記事本文]

---
[ハッシュタグ]`;

// --- Angle-specific prompt enhancements ---
const ANGLE_ENHANCEMENTS: Record<string, string> = {
  "初心者向け入門": `
【切り口の注意点: 初心者向け入門】
- 専門用語は必ず括弧内に平易な説明を添えること
- 「難しそう」という先入観を払拭する安心感ある表現を使う
- 「失敗しても大丈夫、こうリカバリーする」という視点を1つ含める
- 最初の一歩を踏み出しやすい、背中を押す締めにする`,

  "健康・科学的視点": `
【切り口の注意点: 健康・科学的視点】
- カフェイン量（mg）、抗酸化物質（クロロゲン酸など）など数値を含める
- 「研究によると」「栄養学的に」など根拠を示す表現を使う（断定はしない）
- 摂取タイミング（食後30分・就寝6時間前まで等）の具体的アドバイスを含める
- 体への影響を科学的に、かつ読者が実生活で使えるアドバイスとして提示する`,

  "夏の楽しみ方": `
【切り口の注意点: 夏の楽しみ方】
- 記事全体に「夏らしい涼感」「暑い日のひと休み」のムードを演出する
- アイス/冷却アレンジのレシピや工夫を具体的に含める
- 神奈川の夏（海・花火・湘南・みなとみらい）の情景と結びつけた描写を1箇所以上入れる
- 「夏にこそ飲みたい理由」を明確に提示する`,

  "冬の温かい楽しみ方": `
【切り口の注意点: 冬の温かい楽しみ方】
- 寒い季節に温かい一杯を楽しむシーンを演出する（朝の窓辺・夜のリラックス等）
- ホットアレンジ（ミルク・スパイス・シロップ）のアイデアを含める
- 神奈川の冬（箱根の温泉・みなとみらいのイルミネーション等）と結びつける
- 「寒さが豊かにしてくれる一杯の体験」というテーマを軸にする`,

  "ギフト選び": `
【切り口の注意点: ギフト選び】
- 「誰に贈るか」のペルソナを2〜3パターン提示（コーヒー好きな友人/職場の上司/コーヒー未経験の親など）
- 価格帯（1,000円台/3,000円台/5,000円以上）に合わせた選び方を示す
- ラッピングや一言メッセージカードなどのプラスアルファの提案を含める
- 「贈られた人がきっと喜ぶ理由」を具体的に伝える`,

  "プロのコツを自宅で再現": `
【切り口の注意点: プロのコツを自宅で再現】
- バリスタが実際に行っている「ちょっとした工夫」を2〜3個含める（温度・挽き目・注ぎ方など）
- 「なぜそのコツが効くのか」の理由（科学的根拠や経験則）を必ず添える
- 「これをやるだけで劇的に変わった！」という具体的な変化を提示する
- 読者が「これは知らなかった」と感じる驚きのポイントを1つ以上含める`,

  "産地ストーリー深掘り": `
【切り口の注意点: 産地ストーリー深掘り】
- 産地の情景を旅行記のように描写する（標高・気候・景観などの具体的数値と描写）
- 生産者や農家の視点・ストーリーを盛り込む
- 「この豆が今ここにある旅路」（農場→精製→輸送→焙煎→カップ）の一端に触れる
- 読者が「この産地に行ってみたい/この豆を飲んでみたい」と感じる旅情を演出する`,

  "カフェ風アレンジレシピ": `
【切り口の注意点: カフェ風アレンジレシピ】
- カフェで提供されるような応用ドリンク（ラテ・フラッペ・シロップアレンジ等）を2〜3種提案する
- 自宅で再現するための具体的な材料・手順を記載する（シロップの分量・泡立て方など）
- 「インスタ映えするビジュアル」の演出方法（グラス・飾り・色合い）を1つ含める
- コーヒーを「飲む」だけでなく「楽しむ・演出する」体験価値を伝える`,

  "コスパ最強": `
【切り口の注意点: コスパ最強】
- この組み合わせが「なぜコスパが良いか」を具体的に説明する（豆の価格帯・器具コスト・1杯あたりのコスト）
- スペシャルティコーヒーを賢く楽しむための節約・お得情報を含める
- 「カフェで飲むより自宅で○○円で同じ体験ができる」という比較を示す
- コスパを意識しながらも、品質を下げない工夫・選び方を提示する`,

  "ペアリング（食べ物との相性）": `
【切り口の注意点: ペアリング（食べ物との相性）】
- この豆×抽出方法との相性が良い食べ物を3〜4ペア、理由付きで提案する
- 「なぜ合うか」の理由（風味の補完・対比・香りの相乗効果）を必ず説明する
- 日本で手に入りやすい食品（コンビニスイーツ・和菓子・チョコレート等）を含める
- 「試してみたい！」という気持ちを引き出す具体的なシーン描写を1つ含める`,

  "週末のリラックスタイムに": `
【切り口の注意点: 週末のリラックスタイムに】
- 「時間をかけて丁寧に淹れる週末の贅沢」というムードを全体に流す
- 器具の準備から飲み終わるまでの「体験としての豊かさ」を描写する
- 神奈川の週末（鎌倉・湘南・横浜など）と組み合わせたシーンを提示する
- 「忙しい平日を乗り越えた自分へのご褒美」という感情に響くメッセージで締める`,

  "時短・忙しい朝に": `
【切り口の注意点: 時短・忙しい朝に】
- 5〜10分で完成する手順に絞って記述する（余計なステップは省く）
- 前夜に準備できる仕込みのコツを1つ以上含める
- 「忙しくても美味しいコーヒーを諦めない」がテーマ、共感を呼ぶ書き出しにする
- 時短でも「このポイントだけは守ると劇的に変わる」という1点集中アドバイスを含める`,

  "サステナブル・フェアトレード視点": `
【切り口の注意点: サステナブル・フェアトレード視点】
- この豆の生産地でのフェアトレード・環境保全の取り組みを具体的に紹介する
- 「1杯のコーヒーが産地の農家にどう届くか」のサプライチェーンに触れる
- 認証ラベル（フェアトレード認証・レインフォレストアライアンス・UTZ等）の見方を説明する
- 「美味しく飲むことが、世界を変える一歩につながる」という読者への前向きなメッセージで締める`,

  "精製方法で楽しむ（ナチュラル/ウォッシュト）": `
【切り口の注意点: 精製方法で楽しむ（ナチュラル/ウォッシュト）】
- ナチュラル・ウォッシュト・ハニープロセスの違いを、風味の違いとセットで説明する
- この豆がどの精製方法で作られているか、その理由（産地の気候・水資源事情等）に触れる
- 同じ豆の異なる精製バージョンを飲み比べる楽しさを提案する
- 「精製方法を知ると、豆選びが10倍楽しくなる」という知的満足感を演出する`,

  "アウトドア・キャンプで楽しむ": `
【切り口の注意点: アウトドア・キャンプで楽しむ】
- キャンプ・ハイキング・車中泊など、屋外シーンに特化した楽しみ方を提案する
- 持ち運びやすい器具（コンパクトドリッパー・パーコレーター等）と組み合わせた使い方を提示する
- 神奈川アウトドアスポット（丹沢・箱根・三浦・湘南）での情景と結びつけたシーン描写を1箇所入れる
- 「自然の中で飲む一杯は格別」という体験価値を、五感を使って描写する`,

  "SNS映え・写真の撮り方": `
【切り口の注意点: SNS映え・写真の撮り方】
- このコーヒーをインスタグラム・Xでシェアしたくなるビジュアル演出を3パターン提案する
- 撮影のコツ（光の角度・背景選び・小物の置き方・フィルター）を具体的に解説する
- 「#コーヒー好き」「#おうちカフェ」など、拡散しやすいハッシュタグ戦略を添える
- 「飲む前に、まず一枚撮りたくなる」という演出への期待感を書き出しで演出する`,

  "コーヒーを使ったお菓子・料理": `
【切り口の注意点: コーヒーを使ったお菓子・料理】
- このコーヒー豆・抽出液を使ったスイーツまたは料理のレシピを1〜2品、材料・手順付きで紹介する
- 「なぜこの豆がこの料理に合うか」（風味の補完・香りの相乗効果）を必ず説明する
- 自宅で再現しやすい難易度（初心者でも30分以内）に絞って記述する
- 「コーヒーは飲むだけじゃない」という発見を読者に与える締めにする`,

  "春・秋の季節の変わり目に": `
【切り口の注意点: 春・秋の季節の変わり目に】
- 季節の移ろい（春なら花見・新緑、秋なら紅葉・読書の秋）とコーヒーの組み合わせを演出する
- 気温変化に合わせたホット・アイスの切り替えアドバイスを含める
- 神奈川の季節スポット（春の鎌倉桜・秋の箱根紅葉・湘南のサーフシーン等）と結びつけた情景描写を入れる
- 「この季節にしか感じられない、一杯の豊かさ」という季節限定感で締める`,
};

// --- Prompt builder ---
function buildUserPrompt(combo: Combination): string {
  const angleNote = ANGLE_ENHANCEMENTS[combo.angle] ?? "";
  return `以下の3つの軸を組み合わせたコーヒー記事を1600〜2000字で書いてください。

【組み合わせ】
- 豆・産地: ${combo.bean}
- 抽出方法: ${combo.method}
- 切り口:   ${combo.angle}

【構成ガイド】
1. フック: 「${combo.bean}を${combo.method}で淹れると何が変わるか」を1文で提示
2. ${combo.bean}の特徴・産地背景を「${combo.angle}」の視点から照らした解説
3. ${combo.method}のレシピ（温度・豆量・湯量・時間など具体的数値必須）
4. この組み合わせの相性——なぜ${combo.bean}×${combo.method}が面白いか
5. 「${combo.angle}」に特化した深掘りアドバイス（2〜3点、具体的に）
6. 締め（今週末すぐに行動できる提案）
${angleNote}`;
}

// --- Combination utilities ---
function getAllCombinations(): Combination[] {
  const combos: Combination[] = [];
  for (const bean of matrix.beans) {
    for (const method of matrix.methods) {
      for (const angle of matrix.angles) {
        combos.push({ bean, method, angle });
      }
    }
  }
  return combos;
}

function getGeneratedKeys(): Set<string> {
  const generatedPath = path.join(process.cwd(), "generated.json");
  if (!fs.existsSync(generatedPath)) return new Set();
  const data: GeneratedData = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
  return new Set(
    data.generated
      .filter((e) => e.generated_by === "matrix" && e.bean && e.method && e.angle)
      .map((e) => `${e.bean}||${e.method}||${e.angle}`)
  );
}

function pickUnused(count: number): Combination[] {
  const all = getAllCombinations();
  const done = getGeneratedKeys();
  const unused = all.filter((c) => !done.has(`${c.bean}||${c.method}||${c.angle}`));
  // shuffle
  for (let i = unused.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unused[i], unused[j]] = [unused[j], unused[i]];
  }
  return unused.slice(0, count);
}

// --- Status display ---
function showStatus(): void {
  const all = getAllCombinations();
  const done = getGeneratedKeys();
  const remaining = all.length - done.size;
  const pct = ((done.size / all.length) * 100).toFixed(1);

  console.log("\n📊 Matrix 生成ステータス");
  console.log("━".repeat(44));
  console.log(`✅ 生成済み:  ${String(done.size).padStart(5)} / ${all.length.toLocaleString()} (${pct}%)`);
  console.log(`⏳ 残り:      ${remaining.toLocaleString()} 組み合わせ`);
  console.log(`\n📦 豆:    ${matrix.beans.length}種`);
  console.log(`🔧 抽出:  ${matrix.methods.length}種`);
  console.log(`🎯 切り口: ${matrix.angles.length}種`);
  console.log(`   → 総組み合わせ: ${matrix.beans.length} × ${matrix.methods.length} × ${matrix.angles.length} = ${all.length.toLocaleString()}`);

  if (done.size > 0) {
    const angleUsage = new Map<string, number>();
    for (const key of done) {
      const angle = key.split("||")[2];
      angleUsage.set(angle, (angleUsage.get(angle) ?? 0) + 1);
    }
    console.log("\n🎯 切り口 使用状況:");
    for (const angle of matrix.angles) {
      const count = angleUsage.get(angle) ?? 0;
      const bar = "█".repeat(count) + "░".repeat(Math.max(0, 5 - count));
      console.log(`   ${bar} ${count}  ${angle}`);
    }
  }
  console.log("━".repeat(44) + "\n");
}

// --- File utilities ---
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function sanitizeFilename(text: string): string {
  return text
    .replace(/[\\/:*?"<>|×（）【】「」『』？！＊＜＞｜]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// --- Generation ---
async function generateOne(
  combo: Combination,
  isDryRun: boolean,
  index: number,
  total: number
): Promise<void> {
  const label = `${combo.bean} × ${combo.method}（${combo.angle}）`;
  const prefix = total > 1 ? `[${index + 1}/${total}] ` : "";

  console.log(`\n${prefix}🎲 組み合わせ:`);
  console.log(`   豆:     ${combo.bean}`);
  console.log(`   抽出:   ${combo.method}`);
  console.log(`   切り口: ${combo.angle}`);

  const userPrompt = buildUserPrompt(combo);

  if (isDryRun) {
    console.log(`\n🧪 ドライランモード（APIは呼ばれません）`);
    console.log("--- 生成されるプロンプト ---");
    console.log(userPrompt);
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
  const safeFilename = sanitizeFilename(label);
  const outputPath = path.join(outputDir, `${dateStr}-matrix-${safeFilename}.md`);

  fs.writeFileSync(
    outputPath,
    `---
date: ${dateStr}
bean: ${combo.bean}
method: ${combo.method}
angle: ${combo.angle}
topic: ${label}
generated_by: matrix
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
    bean: combo.bean,
    method: combo.method,
    angle: combo.angle,
    generated_by: "matrix",
  } as GeneratedEntry & { date: string; file: string; topic: string });

  // ts workaround: push as any since we extend the interface
  (
    generatedData.generated[generatedData.generated.length - 1] as Record<string, string>
  )["topic"] = label;
  (
    generatedData.generated[generatedData.generated.length - 1] as Record<string, string>
  )["date"] = dateStr;
  (
    generatedData.generated[generatedData.generated.length - 1] as Record<string, string>
  )["file"] = path.relative(process.cwd(), outputPath).replace(/\\/g, "/");

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

  const positionalArgs = args.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));

  if (isStatus) {
    showStatus();
    return;
  }

  let combos: Combination[];

  if (positionalArgs.length >= 3) {
    combos = [{ bean: positionalArgs[0], method: positionalArgs[1], angle: positionalArgs[2] }];
  } else {
    combos = pickUnused(count);
    if (combos.length === 0) {
      const totalCombinations = getAllCombinations().length;
      console.log(`\n🎉 全 ${totalCombinations.toLocaleString()} 組み合わせ生成済みです！ topics-matrix.json に軸を追加してください。`);
      return;
    }
    if (combos.length < count) {
      console.log(`⚠️  未生成の組み合わせが ${combos.length} 件しかありません。${combos.length} 件を生成します。`);
    }
  }

  for (let i = 0; i < combos.length; i++) {
    await generateOne(combos[i], isDryRun, i, combos.length);
    if (!isDryRun && i < combos.length - 1) {
      console.log("⏳ 3秒待機中...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (!isDryRun && combos.length > 0) {
    const done = getGeneratedKeys().size + combos.length;
    const total = getAllCombinations().length;
    console.log(`\n📊 進捗: ${done} / ${total} (${((done / total) * 100).toFixed(1)}%)`);
  }
}

main().catch((err: Error) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
