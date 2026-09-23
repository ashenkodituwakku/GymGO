/**
 * Make an existing account a moderator, so it can approve reviews:
 *   pnpm --filter @gymgo/server make-moderator you@example.com
 */
import { DB_PATH } from './config';
import { openDb } from './db';

const [command, email] = process.argv.slice(2);
if (command !== 'moderator' || !email) {
  console.error('Usage: make-moderator <email>');
  process.exit(1);
}
const db = openDb(DB_PATH);
const result = db.prepare(`update users set role = 'moderator' where email = ? and role in ('member', 'owner')`).run(email.trim().toLowerCase());
console.log(result.changes === 1 ? `${email} is now a moderator.` : `No member account found for ${email}.`);
db.close();
