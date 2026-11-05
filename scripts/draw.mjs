#!/usr/bin/env node
// Run the draw for one group, offline, once.
//
//   node scripts/draw.mjs <slug> [--force]      e.g.  node scripts/draw.mjs wesley
//
// Reads draws/<slug>.json, picks a valid assignment (nobody draws themselves or a blocked
// recipient), and writes:
//   site/<slug>/draw.json  — committed. One AES-GCM ciphertext per giver, in shuffled order.
//                            Without a key it says nothing about who has whom.
//   links/<slug>.txt       — NOT committed (.gitignore). Each person's private link; the key sits
//                            in the URL fragment, which browsers never send to the server.
//
// The pairings are never printed. Re-running with --force is a fresh draw and invalidates every
// link already sent out.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const BASE_URL = "https://christmas.inmused.com";
const [slug, flag] = process.argv.slice(2);
if (!slug) { console.error("usage: node scripts/draw.mjs <slug> [--force]"); process.exit(2); }

const cfg = JSON.parse(readFileSync(`draws/${slug}.json`, "utf8"));
const out = `site/${slug}/draw.json`;
if (existsSync(out) && flag !== "--force") {
  console.error(`${out} exists. A new draw invalidates every link already sent — pass --force if that is what you want.`);
  process.exit(1);
}

const people = cfg.people;
const blocked = new Set((cfg.blocked || []).map(([g, r]) => `${g}>${r}`));
const allowed = (g, r) => g !== r && !blocked.has(`${g}>${r}`);

function randInt(n) {
  // Rejection sampling: no modulo bias.
  const lim = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= lim);
  return buf[0] % n;
}
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Shuffle until every giver's recipient is allowed. Uniform over all valid assignments.
let recipients;
for (let tries = 0; ; tries++) {
  if (tries > 100000) { console.error("no valid assignment — check the blocked list"); process.exit(1); }
  recipients = shuffle(people);
  if (people.every((g, i) => allowed(g, recipients[i]))) break;
}

const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
const entries = [];
const links = [];
for (let i = 0; i < people.length; i++) {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify({ g: people[i], r: recipients[i] }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
  entries.push({ iv: b64u(iv), ct: b64u(ct) });
  links.push(`${people[i]}: ${BASE_URL}/${slug}/#${b64u(raw)}`);
}

mkdirSync(`site/${slug}`, { recursive: true });
writeFileSync(out, JSON.stringify({ slug, drawn: new Date().toISOString().slice(0, 10), entries: shuffle(entries) }, null, 2) + "\n");
mkdirSync("links", { recursive: true });
writeFileSync(`links/${slug}.txt`, links.join("\n") + "\n", { mode: 0o600 });
console.log(`Drew ${people.length} names. Wrote ${out} and links/${slug}.txt (private — do not commit).`);
