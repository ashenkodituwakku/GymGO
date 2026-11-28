/**
 * Ask Verity one short question, to see that it answers on this machine:
 *   pnpm --filter @gymgo/server verity:check
 *
 * Uses the same settings as the server (apps/server/.env.local): the
 * OpenRouter and Groq keys and model lists for Free, and the paid service
 * for Pro and Max. Asks each that's set up once, says which model answered,
 * or why none did. Never prints a key. The free question uses one of the
 * day's free questions; the paid one costs a fraction of a cent.
 */
import { GROQ_API_KEY, VERITY_GROQ_MODELS, VERITY_MODELS, LEFTOVER_GITHUB_MODELS_TOKEN, OPENROUTER_API_KEY, VERITY_PAID_API_KEY, VERITY_PAID_MODEL, VERITY_PAID_NAME, VERITY_PAID_URL } from './config';
import { VERITY_PLANS, Verity, VerityError } from './verity';

if (LEFTOVER_GITHUB_MODELS_TOKEN) {
  console.log('GITHUB_MODELS_TOKEN does nothing: GitHub retired GitHub Models on 30 July 2026. Delete that line from apps/server/.env.local and revoke the token on github.com.\n');
}
const verity = new Verity({
  key: OPENROUTER_API_KEY,
  models: VERITY_MODELS,
  checkModels: true,
  groq: { key: GROQ_API_KEY, models: VERITY_GROQ_MODELS },
  paid: { key: VERITY_PAID_API_KEY, url: VERITY_PAID_URL, model: VERITY_PAID_MODEL, name: VERITY_PAID_NAME },
  log: (line) => console.log(line),
});
if (!verity.on) {
  console.error('Verity is off: set OPENROUTER_API_KEY (openrouter.ai, free) or GROQ_API_KEY (console.groq.com, free) for Free accounts, and VERITY_PAID_API_KEY for Pro and Max, in apps/server/.env.local first; see README, "Verity".');
  process.exit(1);
}
let failed = false;
for (const paid of [false, true]) {
  if (paid ? !verity.paidOn : !verity.freeOn) continue;
  console.log(`Asking Verity as ${paid ? 'Pro' : 'Free'} through ${verity.serviceFor(paid)}…`);
  try {
    const reply = await verity.ask([{ role: 'user', content: 'In one short sentence, what can you help me with in GymGO?' }], { replyTokens: VERITY_PLANS.free.replyTokens, paid });
    console.log(`Answered by ${verity.answeredBy}:\n\n${reply}\n`);
  } catch (error) {
    failed = true;
    const reason = error instanceof VerityError ? error.message : String(error);
    console.error(`Verity didn't answer: ${reason}\n(Any reason from the AI service is in the lines above.)\n`);
  }
}
if (failed) process.exit(1);
console.log('Verity works.');
