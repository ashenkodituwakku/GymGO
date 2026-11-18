/**
 * Ask GymPal one short question, to see that it answers on this machine:
 *   pnpm --filter @gymgo/server gympal:check
 *
 * Uses the same settings as the server (apps/server/.env.local): the Groq
 * and OpenRouter keys and model lists. Says which model answered, or why none did.
 * Never prints the key. One question uses one of the day's free questions.
 */
import { GROQ_API_KEY, GYMPAL_GROQ_MODELS, GYMPAL_MODELS, LEFTOVER_GITHUB_MODELS_TOKEN, OPENROUTER_API_KEY } from './config';
import { GYMPAL_PLANS, GymPal, GymPalError } from './gymPal';

if (LEFTOVER_GITHUB_MODELS_TOKEN) {
  console.log('GITHUB_MODELS_TOKEN does nothing: GitHub retired GitHub Models on 30 July 2026. Delete that line from apps/server/.env.local and revoke the token on github.com.\n');
}
const gymPal = new GymPal({ key: OPENROUTER_API_KEY, models: GYMPAL_MODELS, checkModels: true, groq: { key: GROQ_API_KEY, models: GYMPAL_GROQ_MODELS }, log: (line) => console.log(line) });
if (!gymPal.on) {
  console.error('GymPal is off: set GROQ_API_KEY (a free key from console.groq.com) or OPENROUTER_API_KEY (openrouter.ai) in apps/server/.env.local first; see README, "GymPal".');
  process.exit(1);
}
console.log(`Asking GymPal through ${gymPal.service}…`);
try {
  const reply = await gymPal.ask([{ role: 'user', content: 'In one short sentence, what can you help me with in GymGO?' }], { replyTokens: GYMPAL_PLANS.free.replyTokens });
  console.log(`Answered by ${gymPal.answeredBy}:\n\n${reply}\n\nGymPal works.`);
} catch (error) {
  const reason = error instanceof GymPalError ? error.message : String(error);
  console.error(`GymPal didn't answer: ${reason}\n(Any reason from Groq or OpenRouter is in the lines above.)`);
  process.exit(1);
}
