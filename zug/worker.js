// Zug — online game storage. A Cloudflare Worker with one KV namespace bound as GAMES.
// Paste this whole file into the Worker's code editor in the Cloudflare dashboard.
//
// Each game is stored under its ID. Each side has a secret key that only appears in
// that player's link, so only White can move White and only Black can move Black.
// Links without a key can only read (spectators).
//
//   POST /games                 {name, side:'w'|'b', player}      -> {game, key, inviteKey}
//   GET  /games/:id[?key=]      -> {game, side?}
//   POST /games/:id/join        {key, player}                     -> {game, side}
//   POST /games/:id/move        {key, move:'e2e4', expect:n}      -> {game}
//   POST /games/:id/undo        {key, expect:n}                   -> {game}
//   POST /games/:id/resign      {key}                             -> {game}

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const MAX_MOVES = 1000;
const KEEP_SECONDS = 60 * 60 * 24 * 365 * 2; // games untouched for two years expire

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
const fail = (status, error, game) => json(game ? { error, game: publicGame(game) } : { error }, status);

function token(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, x => ALPH[x % ALPH.length]).join('');
}
const cleanName = s => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
const publicGame = g => ({ id: g.id, name: g.name, w: g.w, b: g.b, moves: g.moves, resign: g.resign || '', created: g.created, updated: g.updated });
const sideOf = (g, key) => (key && key === g.keys.w ? 'w' : key && key === g.keys.b ? 'b' : null);
const turn = g => (g.moves.length % 2 === 0 ? 'w' : 'b');

async function load(env, id) {
  if (!/^[A-Za-z0-9]{4,12}$/.test(id)) return null;
  return env.GAMES.get('g:' + id, 'json');
}
async function save(env, g) {
  g.updated = Date.now();
  await env.GAMES.put('g:' + g.id, JSON.stringify(g), { expirationTtl: KEEP_SECONDS });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!env.GAMES) return fail(500, 'Storage is not connected: add a KV binding named GAMES');

    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts.length === 0 || parts[0] === 'health') return json({ ok: true, service: 'zug' });
    if (parts[0] !== 'games') return fail(404, 'Not found');

    let body = {};
    if (req.method === 'POST') {
      const text = await req.text();
      if (text.length > 4000) return fail(413, 'Too large');
      try { body = text ? JSON.parse(text) : {}; } catch { return fail(400, 'Bad JSON'); }
    }

    // Create a game
    if (parts.length === 1 && req.method === 'POST') {
      const side = body.side === 'b' ? 'b' : 'w';
      const player = cleanName(body.player);
      if (!player) return fail(400, 'Your name is missing');
      let id;
      for (let i = 0; i < 5; i++) { id = token(6); if (!(await env.GAMES.get('g:' + id))) break; }
      const g = {
        id, name: cleanName(body.name) || 'Untitled game',
        w: side === 'w' ? player : '', b: side === 'b' ? player : '',
        moves: [], resign: '', keys: { w: token(16), b: token(16) }, created: Date.now(),
      };
      await save(env, g);
      return json({ game: publicGame(g), side, key: g.keys[side], inviteKey: g.keys[side === 'w' ? 'b' : 'w'] }, 201);
    }

    const g = await load(env, parts[1]);
    if (!g) return fail(404, 'Game not found');

    if (parts.length === 2 && req.method === 'GET') {
      return json({ game: publicGame(g), side: sideOf(g, url.searchParams.get('key')) });
    }
    if (req.method !== 'POST' || parts.length !== 3) return fail(404, 'Not found');

    const side = sideOf(g, body.key);
    if (!side) return fail(403, 'This link can only watch the game');
    const action = parts[2];

    if (action === 'join') {
      const player = cleanName(body.player);
      if (!player) return fail(400, 'Your name is missing');
      g[side] = player;
      await save(env, g);
      return json({ game: publicGame(g), side });
    }

    if (g.resign) return fail(409, 'The game is over', g);
    if (typeof body.expect === 'number' && body.expect !== g.moves.length) return fail(409, 'The game has moved on', g);

    if (action === 'move') {
      if (!MOVE.test(body.move || '')) return fail(400, 'Bad move');
      if (turn(g) !== side) return fail(409, "It isn't your turn", g);
      if (g.moves.length >= MAX_MOVES) return fail(409, 'Game too long', g);
      g.moves.push(body.move);
      await save(env, g);
      return json({ game: publicGame(g) });
    }
    if (action === 'undo') {
      // You can take back your own last move until your opponent has replied.
      if (!g.moves.length || turn(g) === side) return fail(409, 'Nothing of yours to take back', g);
      g.moves.pop();
      await save(env, g);
      return json({ game: publicGame(g) });
    }
    if (action === 'resign') {
      g.resign = side;
      await save(env, g);
      return json({ game: publicGame(g) });
    }
    return fail(404, 'Not found');
  },
};
