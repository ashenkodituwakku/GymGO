/**
 * Verity's actions: what it can do for someone, not just say. Only the paid
 * AI service is given them (verity.ts), so only Pro and Max accounts have
 * them, and every one ends with the person deciding: the model proposes, the
 * server checks the proposal strictly, and the app shows it as a card the
 * person taps to save or start (components/Verity.tsx). Nothing here writes
 * to their account.
 *
 * - **create_workout**: "make me a 45-minute push day" becomes a GymGO
 *   workout. The model writes a short brief; the server builds the workout
 *   from the exercises the app offered (verityMax.ts, the same builder as
 *   Build with Verity), keeping only exercises on that list and numbers in
 *   bounds.
 *
 * A tool call is read as data, never trusted: an unknown tool, arguments
 * that aren't the expected JSON, or a brief that trips the guard
 * (verityGuard.ts) is dropped.
 */

import { screen } from './verityGuard';
import { MAX_REQUEST_CHARS } from './verityMax';

/** A tool, as an OpenAI-style chat completions API takes it. */
export interface ToolSpec {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** What the model asked to do, as it came back. */
export interface ToolCall {
  name: string;
  /** Its arguments, as the JSON text the model wrote. */
  arguments: string;
}

export const CREATE_WORKOUT: ToolSpec = {
  type: 'function',
  function: {
    name: 'create_workout',
    description:
      'Build a GymGO workout for the person when they ask you to make, plan, write or create one (for example "make me a 45 minute push day"). GymGO builds it from its own exercise list and shows it to them to check, save or start; you only describe what they asked for. Use it once per request, and only when they want a workout made, not for general questions about training.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['brief'],
      properties: {
        brief: {
          type: 'string',
          description: 'What the workout should be, in one plain sentence from what the person said: length, muscles or split, equipment, goal and level where they said them. For example: "45 minutes, push day, dumbbells and cables, building muscle".',
        },
      },
    },
  },
};

/** The tools a conversation gets. */
export const PAID_TOOLS: ToolSpec[] = [CREATE_WORKOUT];

/** The calls in a model's answer, read without trusting them: names and argument text, nothing else. */
export function readToolCalls(data: unknown): ToolCall[] {
  const calls = (data as { choices?: Array<{ message?: { tool_calls?: unknown } }> } | null)?.choices?.[0]?.message?.tool_calls;
  if (!Array.isArray(calls)) return [];
  const out: ToolCall[] = [];
  for (const call of calls.slice(0, 4)) {
    const fn = (call as { function?: { name?: unknown; arguments?: unknown } } | null)?.function;
    if (typeof fn?.name !== 'string') continue;
    out.push({ name: fn.name, arguments: typeof fn.arguments === 'string' ? fn.arguments.slice(0, 4000) : JSON.stringify(fn.arguments ?? {}).slice(0, 4000) });
  }
  return out;
}

/**
 * The brief from a create_workout call, cleaned, or null when there isn't a
 * usable one: not that tool, not JSON, too short, or something the guard
 * won't pass on to the builder.
 */
export function workoutBrief(calls: readonly ToolCall[]): string | null {
  const call = calls.find((item) => item.name === CREATE_WORKOUT.function.name);
  if (!call) return null;
  let brief: unknown;
  try {
    brief = (JSON.parse(call.arguments) as { brief?: unknown } | null)?.brief;
  } catch {
    return null;
  }
  if (typeof brief !== 'string') return null;
  const text = brief
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REQUEST_CHARS);
  if (text.length < 3 || !screen(text).ok) return null;
  return text;
}
