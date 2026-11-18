/**
 * Ask GymPal one short question, to see that it answers on this machine:
 *   pnpm --filter @gymgo/server gympal:check
 *
 * Uses the same settings as the server (apps/server/.env.local):
 * GITHUB_MODELS_TOKEN and/or OPENROUTER_API_KEY, and the model lists. Says
 * which service and model answered, or why none did. Never prints the token
 * or key. One question uses one of the day's free questions.
 */
import { GITHUB_MODELS_TOKEN, GYMPAL_GITHUB_MODELS, GYMPAL_MODELS, OPENROUTER_API_KEY } from './config';
import { GymPal, GymPalError } from './gymPal';

const gymPal = new GymPal({
  key: OPENROUTER_API_KEY,
  models: GYMPAL_MODELS,
  github: { token: GITHUB_MODELS_TOKEN, models: GYMPAL_GITHUB_MODELS },
  log: (line) => console.log(line),
});
if (!gymPal.on) {
  console.error('GymPal is off: set GITHUB_MODELS_TOKEN (or OPENROUTER_API_KEY) in apps/server/.env.local first; see README, "GymPal".');
  process.exit(1);
}
console.log(`Asking GymPal through ${gymPal.service}…`);
try {
  const reply = await gymPal.ask([{ role: 'user', content: 'In one short sentence, what can you help me with in GymGO?' }], { replyTokens: 120 });
  console.log(`Answered by ${gymPal.answeredBy}:\n\n${reply}\n\nGymPal works.`);
} catch (error) {
  const reason = error instanceof GymPalError ? error.message : String(error);
  console.error(`GymPal didn't answer: ${reason}\n(Any reason from GitHub or OpenRouter is in the lines above.)`);
  process.exit(1);
}
