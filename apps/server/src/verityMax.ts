/**
 * Verity's GymGO Max features (app.ts routes POST /api/verity/workout and
 * POST /api/verity/note), on the same models as the chat (verity.ts):
 *
 * - **Build me a workout**: a request in your own words ("45 minutes, upper
 *   body, dumbbells only") becomes a GymGO workout. The app sends the
 *   exercises your kit allows (GymGO's list lives in the app); the model
 *   may only choose from those, and what it answers is read back strictly:
 *   anything not on the list, or not a sensible number, is left out.
 * - **Coach's note**: a few sentences on the workout you've just finished,
 *   beside your recent ones: what went well, and what to aim for next time.
 *
 * Each runs only when asked for, and counts as one of Verity's questions.
 */

import { VerityError } from './verity';

/** What one request may say. */
export const MAX_REQUEST_CHARS = 500;
/** Exercises the app may offer for a workout. */
export const MAX_CATALOGUE = 250;
/** A built workout's exercises: at least one, at most this many. */
export const MAX_WORKOUT_ITEMS = 10;
/** The longest coach's note kept. */
export const MAX_NOTE_CHARS = 900;

export interface CatalogueEntry {
  id: string;
  name: string;
  /** How its sets are counted: reps, a time (a plank), or a distance (a carry). */
  measure: 'reps' | 'time' | 'distance';
}

export interface BuiltWorkout {
  name: string;
  /** Why it's built this way, in a sentence, from Verity. */
  note: string | null;
  items: Array<{ exerciseId: string; sets: number; reps: string; restSeconds: number }>;
}

/** Letters, numbers and ordinary punctuation, on one line: nothing that could pass for markup or a new instruction. */
const plainLine = (value: string, most: number) =>
  value
    .replace(/[\u0000-\u001f\u007f<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, most);

/** The request, as typed: a sensible length, one paragraph. */
export function cleanRequest(input: unknown): string {
  const text = typeof input === 'string' ? plainLine(input, MAX_REQUEST_CHARS) : '';
  if (text.length < 3) throw new VerityError(400, 'Describe the workout you want, like how long and which muscles.');
  return text;
}

/** The exercises the app offers: ids and names it knows, each once, at most MAX_CATALOGUE. */
export function cleanCatalogue(input: unknown): CatalogueEntry[] {
  if (!Array.isArray(input)) throw new VerityError(400, 'No exercises were sent. Try again.');
  const seen = new Set<string>();
  const list: CatalogueEntry[] = [];
  for (const item of input.slice(0, MAX_CATALOGUE)) {
    const id = (item as { id?: unknown } | null)?.id;
    const name = (item as { name?: unknown } | null)?.name;
    const measure = (item as { measure?: unknown } | null)?.measure;
    if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_:-]{0,79}$/.test(id) || seen.has(id)) continue;
    if (typeof name !== 'string' || !plainLine(name, 80)) continue;
    seen.add(id);
    list.push({ id, name: plainLine(name, 80), measure: measure === 'time' || measure === 'distance' ? measure : 'reps' });
  }
  if (list.length === 0) throw new VerityError(400, 'No exercises were sent. Try again.');
  return list;
}

/** What Verity is asked to do, after his guide: build one workout from the list, as JSON. */
export function workoutTask(catalogue: readonly CatalogueEntry[]): string {
  const lines = catalogue.map((entry) => `${entry.id} | ${entry.name}${entry.measure === 'time' ? ' (timed: reps as "30–45 s")' : entry.measure === 'distance' ? ' (distance: reps as "30–40 m")' : ''}`);
  return [
    'Build one workout for their request. Answer with JSON only: no words before or after it, no code fence.',
    'Its shape: {"name": "a short name, at most 40 characters", "note": "one sentence on why it is built this way", "items": [{"id": "an id from the list below", "sets": 3, "reps": "8–10", "rest": 90}]}',
    `Use only ids from this list, each at most once, ${MAX_WORKOUT_ITEMS} at most; usually 4 to 7 exercises. sets is 1 to 6; rest is seconds, 0 to 300; reps is a number or a range like "8–10", a time like "30–45 s" for a timed exercise, or a distance like "30–40 m" for a distance one.`,
    'Order them as they should be done: bigger lifts first. Fit the time they give (about 2 to 3 minutes a set, with rest). If their log is here, build on it.',
    'The exercises they can do (id | name):',
    ...lines,
  ].join('\n');
}

/** Sets, reps and rest within sensible bounds, or null. */
function readReps(value: unknown, measure: CatalogueEntry['measure']): string | null {
  const text = typeof value === 'number' ? String(Math.round(value)) : typeof value === 'string' ? value.trim() : '';
  const unit = measure === 'time' ? 's' : measure === 'distance' ? 'm' : '';
  const match = /^(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?\s*(s|sec|secs|seconds|m|metres|meters|reps)?$/i.exec(text);
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] ? Number(match[2]) : null;
  if (low < 1 || (high !== null && high < low)) return null;
  const most = measure === 'time' ? 600 : measure === 'distance' ? 500 : 50;
  if ((high ?? low) > most) return null;
  const range = high !== null && high !== low ? `${low}–${high}` : String(low);
  return unit ? `${range} ${unit}` : range;
}

/**
 * Verity's answer, read as a workout: the first JSON object in it, every
 * exercise on the list, numbers within bounds. Null when nothing usable
 * came back (the app asks the person to try again).
 */
export function readWorkout(answer: string, catalogue: readonly CatalogueEntry[]): BuiltWorkout | null {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let data: unknown;
  try {
    data = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return null;
  }
  const raw = data as { name?: unknown; note?: unknown; items?: unknown } | null;
  if (!raw || !Array.isArray(raw.items)) return null;
  const known = new Map(catalogue.map((entry) => [entry.id, entry]));
  const used = new Set<string>();
  const items: BuiltWorkout['items'] = [];
  for (const item of raw.items) {
    const entry = known.get(String((item as { id?: unknown } | null)?.id ?? ''));
    if (!entry || used.has(entry.id)) continue;
    const sets = Math.round(Number((item as { sets?: unknown }).sets));
    const reps = readReps((item as { reps?: unknown }).reps, entry.measure);
    const rest = Math.round(Number((item as { rest?: unknown }).rest ?? 90));
    if (!Number.isFinite(sets) || sets < 1 || sets > 6 || reps === null) continue;
    used.add(entry.id);
    items.push({ exerciseId: entry.id, sets, reps, restSeconds: Number.isFinite(rest) ? Math.min(300, Math.max(0, rest)) : 90 });
    if (items.length === MAX_WORKOUT_ITEMS) break;
  }
  if (items.length === 0) return null;
  const name = typeof raw.name === 'string' ? plainLine(raw.name, 40) : '';
  const note = typeof raw.note === 'string' ? plainLine(raw.note, 240) : '';
  return { name: name || 'Verity’s workout', note: note || null, items };
}

/** What Verity is asked to do for a coach's note. */
export const NOTE_TASK = [
  'Write a short coach’s note on the workout they have just finished, which is under "What the person is looking at". Compare it with their recent training, in their log, when it is there.',
  'Two to four sentences, plain text, no headings or lists: one specific thing that went well (a heavier set, more reps, a new exercise, turning up at all), and one specific thing to aim for next time.',
  'Use their own numbers. Never invent a number they didn’t log, and make no claims about health, injury or the body beyond the training itself.',
].join('\n');

/** The note as shown: plain text, a sensible length. */
export function cleanNote(answer: string): string {
  const text = answer
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[*#_`]+/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (!text) throw new VerityError(502, 'Verity didn’t write a note this time. Try again.');
  return text.length > MAX_NOTE_CHARS ? `${text.slice(0, MAX_NOTE_CHARS).replace(/\s+\S*$/, '')}…` : text;
}
