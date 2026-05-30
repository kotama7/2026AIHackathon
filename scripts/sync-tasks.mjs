#!/usr/bin/env node
// scripts/sync-tasks.mjs
//
// tasks/**/*.md を読み、GitHub Issue を作成/更新する冪等スクリプト。
// gh CLI 経由で Issue 操作を行うため、事前に `gh auth login` 済みであること。
// GitHub Actions では GITHUB_TOKEN 経由で gh が自動認証される。
//
// Usage:
//   node scripts/sync-tasks.mjs              # 同期実行
//   node scripts/sync-tasks.mjs --dry-run    # 差分のみ表示
//   node scripts/sync-tasks.mjs --summary    # 工数集計のみ
//
// 必要環境変数:
//   GITHUB_REPOSITORY  (owner/repo, Actions では自動)
//   GITHUB_USER_A      (Person A の GitHub username)
//   GITHUB_USER_B      (Person B の GitHub username)

import { readdir, readFile } from 'node:fs/promises';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const SUMMARY_ONLY = process.argv.includes('--summary');
const TASKS_DIR = 'tasks';
const REPO = process.env.GITHUB_REPOSITORY;
const USER_A = process.env.GITHUB_USER_A || '';
const USER_B = process.env.GITHUB_USER_B || '';

// ---------- ファイル走査 ----------
async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.isFile() && ent.name.endsWith('.md') && !ent.name.startsWith('_') && ent.name !== 'README.md' && ent.name !== 'INDEX.md') {
      out.push(p);
    }
  }
  return out;
}

// ---------- 最小 front-matter パーサ (固定スキーマ) ----------
function parseFrontMatter(text, filePath) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`No front-matter: ${filePath}`);
  const yaml = m[1];
  const body = m[2];
  const meta = {};
  let currentKey = null;
  for (const rawLine of yaml.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line) continue;
    // list item
    const li = line.match(/^\s+-\s+(.+)$/);
    if (li && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(stripQuotes(li[1]));
      continue;
    }
    // key: value
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    currentKey = key;
    const val = valRaw.trim();
    if (val === '') {
      meta[key] = []; // 続く list 想定
    } else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      meta[key] = inner ? inner.split(',').map(s => stripQuotes(s.trim())) : [];
    } else if (/^\d+(\.\d+)?$/.test(val)) {
      meta[key] = Number(val);
    } else {
      meta[key] = stripQuotes(val);
    }
  }
  return { meta, body };
}
function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

// ---------- 検証 ----------
function validate(tasks) {
  const ids = new Set();
  const errs = [];
  for (const t of tasks) {
    const { id, title, assignee, estimate_hours, phase } = t.meta;
    if (!id) errs.push(`${t.file}: id 必須`);
    if (ids.has(id)) errs.push(`${t.file}: id 重複 ${id}`);
    ids.add(id);
    if (!title) errs.push(`${t.file}: title 必須`);
    if (!['A', 'B', 'both'].includes(assignee)) errs.push(`${t.file}: assignee は A/B/both`);
    if (typeof estimate_hours !== 'number') errs.push(`${t.file}: estimate_hours は数値必須`);
    if (typeof phase !== 'number') errs.push(`${t.file}: phase は数値必須`);
  }
  // depends_on の参照整合
  for (const t of tasks) {
    for (const d of t.meta.depends_on || []) {
      if (!ids.has(d)) errs.push(`${t.file}: depends_on で未知の id を参照: ${d}`);
    }
  }
  if (errs.length) {
    for (const e of errs) console.error('ERROR:', e);
    process.exit(1);
  }
}

// ---------- 集計 ----------
function summary(tasks) {
  const byAssignee = {};
  const byPhase = {};
  let total = 0;
  for (const t of tasks) {
    const a = t.meta.assignee;
    const p = `phase-${t.meta.phase}`;
    byAssignee[a] = (byAssignee[a] || 0) + t.meta.estimate_hours;
    byPhase[p] = (byPhase[p] || 0) + t.meta.estimate_hours;
    total += t.meta.estimate_hours;
  }
  console.log('--- 工数集計 ---');
  console.log('担当別:');
  for (const [k, v] of Object.entries(byAssignee).sort()) console.log(`  ${k}: ${v}h`);
  console.log('フェーズ別:');
  for (const [k, v] of Object.entries(byPhase).sort()) console.log(`  ${k}: ${v}h`);
  console.log(`合計: ${total}h (タスク数 ${tasks.length})`);
}

// ---------- gh CLI ----------
function gh(args, { json = false, allowFail = false } = {}) {
  try {
    const out = execSync(`gh ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return json ? JSON.parse(out) : out.trim();
  } catch (e) {
    if (allowFail) return null;
    console.error('gh failed:', args);
    console.error(e.stderr?.toString() || e.message);
    process.exit(1);
  }
}

function ensureLabel(name, color, description) {
  if (DRY) { console.log(`[dry] ensure label: ${name}`); return; }
  const existing = gh(`label list --json name --limit 200`, { json: true });
  if (existing.some(l => l.name === name)) {
    gh(`label edit "${name}" --color ${color} --description "${description}"`, { allowFail: true });
  } else {
    gh(`label create "${name}" --color ${color} --description "${description}"`, { allowFail: true });
  }
}

function ensureAllLabels(tasks) {
  ensureLabel('assignee:A', '0E8A16', 'Person A (backend/LLM)');
  ensureLabel('assignee:B', '1D76DB', 'Person B (frontend)');
  ensureLabel('assignee:both', '5319E7', 'Joint task');
  for (let i = 0; i <= 5; i++) ensureLabel(`phase-${i}`, ['B60205','D93F0B','FBCA04','0E8A16','1D76DB','5319E7'][i], `Phase ${i}`);
  const areas = new Set();
  for (const t of tasks) for (const l of t.meta.labels || []) areas.add(l);
  for (const a of areas) ensureLabel(a, 'C5DEF5', `Area: ${a}`);
}

// ---------- Issue 同期 ----------
function listAllIssues() {
  // open + closed の全 Issue を取得 (PR を除外)
  return gh(`issue list --state all --limit 500 --json number,title,labels,assignees,body`, { json: true });
}

function titleFor(task) {
  return `[${task.meta.id}] ${task.meta.title}`;
}

function labelsFor(task) {
  return [
    `phase-${task.meta.phase}`,
    `assignee:${task.meta.assignee}`,
    ...(task.meta.labels || []),
  ];
}

function assigneesFor(task) {
  const a = task.meta.assignee;
  if (a === 'A' && USER_A) return [USER_A];
  if (a === 'B' && USER_B) return [USER_B];
  if (a === 'both') return [USER_A, USER_B].filter(Boolean);
  return [];
}

function renderBody(task, idToIssueNum) {
  const front = `<!-- managed by scripts/sync-tasks.mjs — edit the source file: ${task.file.replace(/\\/g, '/')} -->\n\n`;
  const meta = `**Assignee**: ${task.meta.assignee} / **Estimate**: ${task.meta.estimate_hours}h / **Phase**: ${task.meta.phase}\n\n`;
  let deps = '';
  if (task.meta.depends_on?.length) {
    const lines = task.meta.depends_on.map(id => {
      const n = idToIssueNum[id];
      return n ? `- [ ] #${n} (${id})` : `- [ ] (${id} — issue 未作成)`;
    });
    deps = `## Blocked by\n${lines.join('\n')}\n\n`;
  }
  return front + meta + deps + task.body.trim() + '\n';
}

function createOrUpdate(task, existingByTitle, idToIssueNum) {
  const t = titleFor(task);
  const labels = labelsFor(task);
  const assignees = assigneesFor(task);
  const body = renderBody(task, idToIssueNum);
  const existing = existingByTitle[t];
  if (existing) {
    if (DRY) { console.log(`[dry] update #${existing.number} ${t}`); return existing.number; }
    const labelArgs = labels.map(l => `--add-label "${l}"`).join(' ');
    const assigneeArgs = assignees.map(a => `--add-assignee "${a}"`).join(' ');
    // body は file 経由で渡す方が安全
    const tmpFile = `.sync-body-${existing.number}.tmp`;
    writeFileSync(tmpFile, body);
    gh(`issue edit ${existing.number} --body-file ${tmpFile} ${labelArgs} ${assigneeArgs}`);
    unlinkSync(tmpFile);
    return existing.number;
  } else {
    if (DRY) { console.log(`[dry] create ${t}`); return null; }
    const labelArgs = labels.map(l => `--label "${l}"`).join(' ');
    const assigneeArgs = assignees.map(a => `--assignee "${a}"`).join(' ');
    const tmpFile = `.sync-body-new.tmp`;
    writeFileSync(tmpFile, body);
    const url = gh(`issue create --title "${t.replace(/"/g, '\\"')}" --body-file ${tmpFile} ${labelArgs} ${assigneeArgs}`);
    unlinkSync(tmpFile);
    const m = url.match(/\/issues\/(\d+)/);
    return m ? Number(m[1]) : null;
  }
}

// ---------- main ----------
async function main() {
  const files = await walk(TASKS_DIR);
  const tasks = [];
  for (const f of files) {
    const text = await readFile(f, 'utf-8');
    const parsed = parseFrontMatter(text, f);
    tasks.push({ file: relative('.', f), ...parsed });
  }
  tasks.sort((a, b) => a.meta.id.localeCompare(b.meta.id));

  validate(tasks);

  if (SUMMARY_ONLY) {
    summary(tasks);
    return;
  }

  summary(tasks);

  if (!REPO && !DRY) {
    console.error('GITHUB_REPOSITORY が設定されていません');
    process.exit(1);
  }

  ensureAllLabels(tasks);

  const existing = DRY ? [] : listAllIssues();
  const existingByTitle = Object.fromEntries(existing.map(i => [i.title, i]));

  // pass 1: 作成/更新 (depends_on は仮)
  const idToIssueNum = {};
  for (const t of tasks) {
    const tmpIdMap = Object.assign({}, idToIssueNum);
    const num = createOrUpdate(t, existingByTitle, tmpIdMap);
    if (num) idToIssueNum[t.meta.id] = num;
  }

  // pass 2: depends_on を Issue 番号に解決して body を再更新
  for (const t of tasks) {
    if (!(t.meta.depends_on?.length)) continue;
    const t2 = { ...t };
    const ex = existingByTitle[titleFor(t)] || { number: idToIssueNum[t.meta.id] };
    if (!ex.number) continue;
    const body = renderBody(t2, idToIssueNum);
    if (DRY) { console.log(`[dry] re-render deps for #${ex.number} (${t.meta.id})`); continue; }
    const tmpFile = `.sync-body-${ex.number}.tmp`;
    writeFileSync(tmpFile, body);
    gh(`issue edit ${ex.number} --body-file ${tmpFile}`);
    unlinkSync(tmpFile);
  }

  console.log(`同期完了: ${tasks.length} タスク`);
}

main().catch(e => { console.error(e); process.exit(1); });
