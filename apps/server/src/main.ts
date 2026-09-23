import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app';
import { ALLOWED_ORIGINS, ATTRIBUTION, DB_PATH, GYM_RECORDS, HOST, PORT } from './config';
import { openDb, seedGyms } from './db';

const db = openDb(DB_PATH);
seedGyms(db, GYM_RECORDS);

const server = createServer(createApp({ db, attribution: ATTRIBUTION, allowedOrigins: ALLOWED_ORIGINS }));

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use. Is GymGO already running?`);
  } else {
    console.error('[server]', error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => `http://${net!.address}:${PORT}`);
  console.log(`[server] GymGO API on http://localhost:${PORT} (database: ${DB_PATH})`);
  if (lan.length > 0) console.log(`[server] Phones on your Wi-Fi reach it at ${lan.join(' or ')}`);
});

const stop = () => {
  server.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
