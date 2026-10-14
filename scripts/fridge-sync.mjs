#!/usr/bin/env node
/* Folds recent fridge moves from the ntfy.sh topic into static/fridge.json.
   Run by .github/workflows/fridge-sync.yml on a schedule; safe to run by hand:

     node scripts/fridge-sync.mjs

   Reads  <base>/<topic>/json?poll=1&since=<updated>   (base defaults to https://ntfy.sh)
   Writes static/fridge.json only when a magnet actually moved, and prints `moves=N`
   (also appended to $GITHUB_OUTPUT when set). Validation mirrors static/fridge.js. */

import { readFile, writeFile, appendFile } from 'node:fs/promises';

const FILE = new URL('../static/fridge.json', import.meta.url);
const BASE = (process.env.FRIDGE_NTFY_BASE || 'https://ntfy.sh').replace(/\/+$/, '');
const IDS = ['card', 'ticker', 'featured-0', 'featured-1', 'featured-2'];

const round = v => Math.round(v * 1000) / 1000;
const validPos = m => !!m && Number.isFinite(+m.x) && Number.isFinite(+m.y) && +m.x >= 0 && +m.x <= 1 && +m.y >= 0 && +m.y <= 1;

// Same folding rule as the client: last message per id wins, by server time; anything older than
// `minTime` (the file's `updated`) is ignored, so bumping `updated` by hand is a reset.
function foldMessages(magnets, text, minTime = 0) {
    const before = JSON.stringify(magnets);
    const seen = {};
    let latest = 0;
    for (const line of String(text).split('\n')) {
        let msg, move;
        try { msg = JSON.parse(line); } catch { continue; }
        if (!msg || msg.event !== 'message' || typeof msg.message !== 'string') continue;
        try { move = JSON.parse(msg.message); } catch { continue; }
        if (!move || !IDS.includes(move.id) || !validPos(move)) continue;
        const t = +msg.time || 0;
        if (t < minTime) continue;
        if (seen[move.id] && seen[move.id] > t) continue;
        seen[move.id] = t;
        magnets[move.id] = { x: round(+move.x), y: round(+move.y) };
        if (t > latest) latest = t;
    }
    const after = JSON.parse(JSON.stringify(magnets)), was = JSON.parse(before);
    const changed = IDS.filter(id => JSON.stringify(after[id]) !== JSON.stringify(was[id])).length;
    return { latest, changed };
}

async function report(moves) {
    console.log(`moves=${moves}`);
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `moves=${moves}\n`);
}

const data = JSON.parse(await readFile(FILE, 'utf8'));
const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
if (!topic || topic === 'PLACEHOLDER') {
    console.log('fridge.json has no topic; nothing to sync');
    await report(0);
    process.exit(0);
}
data.magnets = data.magnets || {};
const updated = Math.max(0, Math.floor(+data.updated || 0));
const since = updated > 0 ? String(updated) : 'all';
const url = `${BASE}/${encodeURIComponent(topic)}/json?poll=1&since=${since}`;

const res = await fetch(url);
if (!res.ok) {
    console.error(`ntfy responded ${res.status} for ${url}`);
    process.exit(1);
}
const { latest, changed } = foldMessages(data.magnets, await res.text(), updated);
if (changed > 0) {
    data.updated = Math.max(updated, latest);
    await writeFile(FILE, JSON.stringify(data, null, 2) + '\n');
}
await report(changed);
