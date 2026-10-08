/**
 * Give an existing account a staff role:
 *   pnpm --filter @gymgo/server make-moderator you@example.com   (approves reviews, photos and owners' updates)
 *   pnpm --filter @gymgo/server make-admin you@example.com       (also checks gym ownership claims, which hold personal details)
 */
import { DB_PATH } from './config';
import { openDb } from './db';

const [command, email] = process.argv.slice(2);
if ((command !== 'moderator' && command !== 'admin') || !email) {
  console.error('Usage: make-moderator <email>, or make-admin <email>');
  process.exit(1);
}
const db = openDb(DB_PATH);
const from = command === 'admin' ? `('member', 'owner', 'moderator')` : `('member', 'owner')`;
const result = db.prepare(`update users set role = ? where email = ? and role in ${from}`).run(command, email.trim().toLowerCase());
console.log(result.changes === 1 ? `${email} is now ${command === 'admin' ? 'an admin' : 'a moderator'}.` : `No account found for ${email} that could become ${command === 'admin' ? 'an admin' : 'a moderator'}.`);
db.close();
