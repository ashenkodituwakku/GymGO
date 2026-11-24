#!/usr/bin/env node
/**
 * Sample training for the launch ads, in a local test account: eight weeks of
 * push / pull / legs at three independent Melbourne gyms, and a collection
 * of ten independents (no chains, no logos). Nobody real trained this.
 *
 * Run it against your own local server only (`pnpm app`), from apps/server
 * so tsx can load the domain package:
 *
 *   cd apps/server
 *   GYMGO_TOKEN=<session token> node --import tsx ../../marketing/launch-ads/seed.mjs
 *
 * The cards' seeds are picked so the collection shows each rarity once or
 * more (one Legendary foil among them). A real collection rolls its own.
 */

import { cardFor, newSeed } from '../../packages/domain/src/cards.ts';

const BASE = (process.env.GYMGO_URL || 'http://localhost:8081/_gymgo').replace(/\/+$/, '');
const TOKEN = process.env.GYMGO_TOKEN;
if (!TOKEN) {
  console.error('Set GYMGO_TOKEN to a session token for a local test account.');
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) {
  console.error('This writes sample data: point it at a local server only.');
  process.exit(2);
}
const headers = { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` };
const DAY = 86_400_000;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
/** A day in Melbourne (UTC+11 in summer), as the app writes it. */
const melbourneDay = (time) => new Date(time + 11 * 3_600_000).toISOString().slice(0, 10);

// --- Training: eight weeks, a little heavier each week ------------------------------
const PUSH = [['bench-press', 60, 8], ['ohp', 37.5, 8], ['incline-db', 22, 10], ['lateral-raise', 9, 12], ['pushdown', 25, 12]];
const PULL = [['deadlift', 100, 5], ['pulldown', 55, 10], ['bb-row', 55, 8], ['db-curl', 12, 10]];
const LEGS = [['back-squat', 80, 6], ['rdl', 70, 8], ['leg-press', 140, 10], ['split-squat', 16, 10]];
const ROTATION = [[PUSH, 'Push'], [PULL, 'Pull'], [LEGS, 'Legs']];
const TRAINED_AT = ['prime-athletica-fitzroy', 'equilibrium-fitness-north-melbourne', 'prosport-richmond'];
const round = (kg) => Math.round(kg / 2.5) * 2.5;

const sessions = [];
let n = 0;
for (let week = 0; week < 8; week++) {
  const monday = today.getTime() - (8 - week) * 7 * DAY;
  for (const offset of week % 2 === 0 ? [0, 2, 4] : [0, 2, 4, 5]) {
    const [exercises, name] = ROTATION[n % 3];
    n += 1;
    // 6 pm in Melbourne is 07:00 UTC.
    const start = monday + offset * DAY + 7 * 3_600_000;
    if (start > Date.now() - 3_600_000) continue;
    sessions.push({
      name,
      unit: 'kg',
      startedAt: new Date(start).toISOString(),
      finishedAt: new Date(start + 62 * 60_000).toISOString(),
      gymId: TRAINED_AT[n % TRAINED_AT.length],
      exercises: exercises.map(([exerciseId, kg, reps]) => ({
        exerciseId,
        sets: [0, 1, 2].map((set) => ({ weight: round(kg * (1 + week * 0.025)) || kg, reps: reps - (set === 2 ? 1 : 0) })),
      })),
    });
  }
}

// --- Collection: independents only, a spread of rarities ----------------------------
const COLLECTION = [
  ['prime-athletica-fitzroy', 'Prime Athletica', 'Fitzroy', 'legendary', 9],
  ['equilibrium-fitness-north-melbourne', 'Equilibrium Fitness', 'North Melbourne', 'epic', 6],
  ['prosport-richmond', 'Prosport Health & Fitness', 'Richmond', 'rare', 5],
  ['australian-strength-performance', 'Australian Strength Performance', 'Brunswick East', 'rare', 2],
  ['carlton-fitness', 'Carlton Fitness', 'Carlton North', 'uncommon', 2],
  ['lincoln-square-fitness-carlton', 'Lincoln Square Fitness', 'Carlton', 'uncommon', 1],
  ['fitness-xo-northcote', 'Fitness XO', 'Northcote', 'uncommon', 1],
  ['leo-berrys-gym-richmond', 'Leo Berry’s Gym', 'Richmond', 'common', 1],
  ['the-strong-zone-collingwood', 'The Strong Zone', 'Collingwood', 'common', 1],
  ['l9-fitness-fitzroy-north', 'L9 Fitness & Skills', 'Fitzroy North', 'common', 1],
];
const gyms = COLLECTION.map(([id, name, suburb, rarity, visits], i) => {
  const days = Array.from({ length: visits }, (_, k) => melbourneDay(today.getTime() - (50 - i * 3 - k * 5) * DAY));
  const firstAt = `${days[0]}T08:00:00.000Z`;
  let seed = newSeed();
  for (let tries = 0; tries < 500_000; tries++) {
    const look = cardFor({ id, firstAt, days, seed });
    if (look.rarity === rarity && look.foil === (rarity === 'legendary')) break;
    seed = newSeed();
  }
  const look = cardFor({ id, firstAt, days, seed });
  console.log(`  card ${id}: ${look.rarity} ${look.gem}${look.foil ? ' foil' : ''}`);
  return { id, name, suburb, city: 'Melbourne', countryCode: 'AU', brand: null, days, firstAt, lastAt: `${days[days.length - 1]}T08:00:00.000Z`, seed };
});

let logged = 0;
for (const session of sessions) {
  const response = await fetch(`${BASE}/api/training`, { method: 'POST', headers, body: JSON.stringify(session) });
  if (response.ok) logged += 1;
  else console.log('  training', response.status, await response.text());
}
console.log(`Logged ${logged} of ${sessions.length} sessions.`);
const current = await (await fetch(`${BASE}/api/collection`, { headers })).json();
const put = await fetch(`${BASE}/api/collection`, { method: 'PUT', headers, body: JSON.stringify({ gyms, resetAt: current.resetAt ?? null }) });
console.log(`Collection: ${put.status}${put.ok ? '' : ` ${await put.text()}`}`);
