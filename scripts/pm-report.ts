import { status } from "../pm/status";
import type { Phase, Task, TaskStatus, PhaseStatus } from "../types/pm";

// ─── ANSI カラー定義 ───────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
};

// ─── ヘルパー ───────────────────────────────────────────────────────────────────
function taskIcon(s: TaskStatus): string {
  switch (s) {
    case "done":      return `${c.green}✓${c.reset}`;
    case "in-progress": return `${c.yellow}◐${c.reset}`;
    case "blocked":   return `${c.red}✗${c.reset}`;
    case "skipped":   return `${c.dim}─${c.reset}`;
    default:          return `${c.dim}○${c.reset}`;
  }
}

function phaseStatusLabel(s: PhaseStatus): string {
  switch (s) {
    case "done":        return `${c.green}${c.bold} DONE     ${c.reset}`;
    case "in-progress": return `${c.yellow}${c.bold} IN PROG  ${c.reset}`;
    case "blocked":     return `${c.red}${c.bold} BLOCKED  ${c.reset}`;
    default:            return `${c.dim}${c.bold} TODO     ${c.reset}`;
  }
}

function calcCompletion(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done" || t.status === "skipped").length;
  return Math.round((done / tasks.length) * 100);
}

function progressBar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const color = pct === 100 ? c.green : pct > 0 ? c.yellow : c.dim;
  return `${color}${bar}${c.reset} ${String(pct).padStart(3)}%`;
}

function separator(char = "─", len = 60): string {
  return c.dim + char.repeat(len) + c.reset;
}

function daysUntil(dateStr: string): string {
  const target = new Date(dateStr);
  const today = new Date("2026-06-13");
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return `${c.red}${Math.abs(diff)}日超過${c.reset}`;
  if (diff === 0) return `${c.yellow}今日${c.reset}`;
  return `${c.cyan}${diff}日後${c.reset}`;
}

// ─── フェーズ表示 ───────────────────────────────────────────────────────────────
function renderPhase(phase: Phase, idx: number): void {
  const pct = calcCompletion(phase.tasks);
  const phaseNum = String(idx + 1).padStart(2, "0");

  console.log();
  console.log(
    `${c.bold}${c.blue}Phase ${phaseNum}${c.reset}  ${c.bold}${phase.name}${c.reset}  ${phaseStatusLabel(phase.status)}`
  );
  console.log(
    `         ${progressBar(pct)}  ${c.dim}目標: ${phase.target_date} (${daysUntil(phase.target_date)})${c.reset}`
  );

  if (phase.notes) {
    console.log(`         ${c.dim}⚑ ${phase.notes}${c.reset}`);
  }

  for (const task of phase.tasks) {
    const icon = taskIcon(task.status);
    const nameColor = task.status === "done" ? c.dim : task.status === "blocked" ? c.red : c.white;
    const file = task.file ? `${c.dim}  → ${task.file}${c.reset}` : "";
    console.log(`           ${icon} ${nameColor}${task.name}${c.reset}${file}`);
    if (task.notes && task.status !== "done") {
      console.log(`               ${c.dim}  ${task.notes}${c.reset}`);
    }
  }
}

// ─── メイン出力 ────────────────────────────────────────────────────────────────
function renderReport(): void {
  const allTasks = status.phases.flatMap((p) => p.tasks);
  const totalPct = calcCompletion(allTasks);
  const donePhases = status.phases.filter((p) => p.status === "done").length;
  const currentPhase = status.phases.find((p) => p.status === "in-progress" || p.status === "todo");

  console.log();
  console.log(separator("═", 60));
  console.log(
    `  ${c.bold}${c.cyan}PM as Code${c.reset}  ${c.bold}${status.project}${c.reset}`
  );
  console.log(`  ${c.dim}${status.description}${c.reset}`);
  console.log(`  ${c.dim}更新: ${status.updated}${c.reset}`);
  console.log(separator("═", 60));

  // ── 全体進捗
  console.log();
  console.log(`  ${c.bold}全体進捗${c.reset}`);
  console.log(`  ${progressBar(totalPct, 40)}`);
  console.log(
    `  ${c.dim}Phase ${donePhases}/${status.phases.length} 完了  |  タスク ${allTasks.filter((t) => t.status === "done").length}/${allTasks.length} 完了${c.reset}`
  );

  if (currentPhase) {
    console.log();
    console.log(`  ${c.bold}現在の注目フェーズ:${c.reset} ${c.yellow}${currentPhase.name}${c.reset}`);
    const nextTask = currentPhase.tasks.find((t) => t.status === "todo" || t.status === "in-progress");
    if (nextTask) {
      console.log(`  ${c.bold}次のタスク:${c.reset} ${nextTask.name}`);
    }
  }

  // ── フェーズ詳細
  console.log();
  console.log(separator("─", 60));
  console.log(`  ${c.bold}フェーズ詳細${c.reset}`);

  status.phases.forEach((phase, i) => renderPhase(phase, i));

  // ── ブロッカー
  if (status.blockers && status.blockers.length > 0) {
    console.log();
    console.log(separator("─", 60));
    console.log(`  ${c.bold}${c.red}ブロッカー${c.reset}`);
    for (const b of status.blockers) {
      console.log(`  ${c.red}✗${c.reset} ${c.bold}${b.description}${c.reset}`);
      console.log(`    ${c.dim}→ 対処: ${b.action}${c.reset}`);
    }
  }

  // ── 意思決定ログ
  if (status.decisions && status.decisions.length > 0) {
    console.log();
    console.log(separator("─", 60));
    console.log(`  ${c.bold}${c.cyan}意思決定ログ${c.reset}`);
    for (const d of status.decisions) {
      console.log(`  ${c.dim}[${d.date}]${c.reset} ${d.description}`);
      console.log(`    ${c.dim}理由: ${d.reason}${c.reset}`);
    }
  }

  console.log();
  console.log(separator("─", 60));
  console.log(
    `  ${c.dim}ステータス変更: pm/status.ts を編集して git commit${c.reset}`
  );
  console.log(
    `  ${c.dim}レポート更新:   npm run pm${c.reset}`
  );
  console.log(separator("═", 60));
  console.log();
}

renderReport();
