/**
 * Expo's own Metro settings, plus one thing: the GymGO server is reachable
 * through the bundler, at /_gymgo/… on the same address the app's code comes
 * from (forwarded to the server on this computer, port 4000).
 *
 * So any device that can load the app can also sign in and sync: a phone in
 * Expo Go over Wi-Fi, a phone through `gymgo -Tunnel` (which carries only
 * the bundler's port), a debug build from Xcode, or a browser, with no second
 * port for a firewall to block. The app finds it in src/lib/api.ts. A build
 * with EXPO_PUBLIC_API_URL set (a hosted GymGO) talks to that instead.
 */

const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const PREFIX = '/_gymgo';
const SERVER = { host: '127.0.0.1', port: Number(process.env.GYMGO_SERVER_PORT || 4000) };

const config = getDefaultConfig(__dirname);

/** Forwards one request to the GymGO server and streams its answer back. */
function forward(req, res) {
  const headers = { ...req.headers };
  // The server works out links back to itself (Stripe's return page) from
  // Host, which stays the address the device used, so those links come back
  // through here too.
  // …with this prefix in front, which X-Forwarded-Prefix tells it.
  headers['x-forwarded-prefix'] = PREFIX;
  const forwardedFor = [headers['x-forwarded-for'], req.socket.remoteAddress].filter(Boolean).join(', ');
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor;
  const upstream = http.request(
    { ...SERVER, method: req.method, path: req.url.slice(PREFIX.length) || '/', headers },
    (answer) => {
      res.writeHead(answer.statusCode || 502, answer.headers);
      answer.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'The GymGO server isn’t running on this computer. Start GymGO with the launcher.' }));
  });
  req.pipe(upstream);
}

const expoEnhance = config.server.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const next = expoEnhance ? expoEnhance(middleware, server) : middleware;
    return (req, res, fallThrough) => {
      if (req.url === PREFIX || req.url.startsWith(`${PREFIX}/`)) return forward(req, res);
      return next(req, res, fallThrough);
    };
  },
};

module.exports = config;
