/**
 * 最小限の RFC 6902 JSON Patch 適用器 (add / replace / remove のみ)。
 * Repairer (A2-10) が LLM から受け取った差分を CaseTruth に当てるために使う。
 * 外部依存を増やさないための自前実装。対象 doc は破壊せず、clone を返す。
 */

export type JsonPatchOp = {
  op: 'add' | 'replace' | 'remove';
  /** JSON Pointer (RFC 6901)。例: "/evidence/2/weight" */
  path: string;
  /** add / replace のときの値 */
  value?: unknown;
};

export type ApplyPatchResult =
  | { ok: true; doc: unknown }
  | { ok: false; error: string; failedOp: JsonPatchOp };

/** JSON Pointer のトークンをデコード (~1 → /, ~0 → ~)。 */
function decodeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** "/a/b/0" → ["a","b","0"]。"" → []。 */
function parsePointer(path: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error(`invalid JSON Pointer: ${path}`);
  return path.slice(1).split('/').map(decodeToken);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * patches を順に適用する。
 *
 * 個々の op が失敗 (配列 index の取り違え等) してもバッチ全体を捨てず、その op だけスキップして
 * 続行する。LLM repair は複数 op のうち 1 つの index を誤りがちで、以前は 1 つの失敗で repair
 * 全体が無効化 → regen → 関数タイムアウトを誘発していた。少なくとも 1 つ適用できれば ok:true を
 * 返し (上位で再検証される)、全 op 失敗のときのみ ok:false。clone 失敗は即 ok:false。
 */
export function applyJsonPatch(doc: unknown, patches: JsonPatchOp[]): ApplyPatchResult {
  let working: unknown;
  try {
    working = structuredClone(doc);
  } catch (e) {
    return {
      ok: false,
      error: `clone failed: ${String(e)}`,
      failedOp: patches[0] ?? { op: 'replace', path: '' },
    };
  }

  let appliedCount = 0;
  let lastError = '';
  let lastFailedOp: JsonPatchOp | undefined;
  for (const patch of patches) {
    try {
      working = applyOne(working, patch);
      appliedCount++;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      lastFailedOp = patch;
    }
  }

  if (appliedCount === 0) {
    return {
      ok: false,
      error: lastError || 'no patches applied',
      failedOp: lastFailedOp ?? patches[0] ?? { op: 'replace', path: '' },
    };
  }
  return { ok: true, doc: working };
}

function applyOne(doc: unknown, patch: JsonPatchOp): unknown {
  const tokens = parsePointer(patch.path);
  if (tokens.length === 0) {
    // ルート差し替えのみ許可
    if (patch.op === 'replace' || patch.op === 'add') return patch.value;
    throw new Error('cannot remove document root');
  }

  // 親までナビゲートし、最後のキーで操作する
  const parentTokens = tokens.slice(0, -1);
  const lastKey = tokens[tokens.length - 1]!;

  let parent: unknown = doc;
  for (const token of parentTokens) {
    parent = stepInto(parent, token);
  }

  if (Array.isArray(parent)) {
    applyArray(parent, lastKey, patch);
  } else if (isRecord(parent)) {
    applyObject(parent, lastKey, patch);
  } else {
    throw new Error(`parent at "${patch.path}" is neither object nor array`);
  }
  return doc;
}

function stepInto(node: unknown, token: string): unknown {
  if (Array.isArray(node)) {
    const idx = Number(token);
    if (!Number.isInteger(idx) || idx < 0 || idx >= node.length) {
      throw new Error(`array index out of range: ${token}`);
    }
    return node[idx];
  }
  if (isRecord(node)) {
    if (!(token in node)) throw new Error(`missing key: ${token}`);
    return node[token];
  }
  throw new Error(`cannot descend into non-container at token "${token}"`);
}

function applyArray(arr: unknown[], key: string, patch: JsonPatchOp): void {
  if (key === '-') {
    if (patch.op === 'add') {
      arr.push(patch.value);
      return;
    }
    throw new Error(`"-" index only valid for add`);
  }
  const idx = Number(key);
  if (!Number.isInteger(idx) || idx < 0) throw new Error(`invalid array index: ${key}`);
  switch (patch.op) {
    case 'add':
      if (idx > arr.length) throw new Error(`add index out of range: ${idx}`);
      arr.splice(idx, 0, patch.value);
      return;
    case 'replace':
      if (idx >= arr.length) throw new Error(`replace index out of range: ${idx}`);
      arr[idx] = patch.value;
      return;
    case 'remove':
      if (idx >= arr.length) throw new Error(`remove index out of range: ${idx}`);
      arr.splice(idx, 1);
      return;
  }
}

function applyObject(obj: Record<string, unknown>, key: string, patch: JsonPatchOp): void {
  switch (patch.op) {
    case 'add':
    case 'replace':
      obj[key] = patch.value;
      return;
    case 'remove':
      if (!(key in obj)) throw new Error(`remove missing key: ${key}`);
      delete obj[key];
      return;
  }
}
