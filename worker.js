// worker.js
// ---------------------------------------------------------------------------
// A Cloudflare Worker that:
//   1. PROXIES push requests, so the OneSignal REST key lives here as a secret
//      instead of in config.js (where anyone can read it).
//   2. REMEMBERS unanswered questions in Workers KV and, from a cron trigger that
//      runs every minute, sends a nudge push when one is due (every 5 minutes),
//      even if the parent's app is closed.
//
// BINDINGS you must configure in Cloudflare (the README walks through them):
//   Secret   ONESIGNAL_REST_API_KEY   your OneSignal REST API key
//   Secret   ONESIGNAL_APP_ID         your OneSignal app ID (or a plain variable)
//   Variable ALLOWED_ORIGIN           e.g. https://yourname.github.io  (no path, no trailing slash)
//   KV       NUDGES                   a KV namespace, bound under exactly that name
//   Cron     * * * * *                every minute
// ---------------------------------------------------------------------------

// ---- Settings you may edit ------------------------------------------------
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications"; // same endpoint as config.js
const AUTH_SCHEME = "Basic";                      // matches push.js; newer OneSignal keys may need "Key"
const NUDGE_INTERVAL_MS = 5 * 60 * 1000;          // a question is re-nudged every 5 minutes
const MAX_NUDGES = 12;                            // stop after 12 nudges (~1 hour) as a safety net
const ITEM_TTL_MS = 24 * 60 * 60 * 1000;          // forget any question after 24 hours
const MAX_QUEUE_ITEMS = 100;                      // keeps the single KV value small
const NUDGE_TITLE = "Still waiting for your answer"; // English; the Worker has no t(), so edit this by hand to translate

const QUEUE_KEY = "queue";                        // the ONE KV key that holds every pending item

export default {
  // ---- Runs for every HTTP request (the app calls this like OneSignal's API) ----
  async fetch(request, env) {
    const cors = corsHeaders(env);

    // Browsers send an OPTIONS "preflight" request before a cross-origin POST.
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply({ error: "Use POST" }, 405, cors);

    // Only requests from your site are accepted. This stops casual misuse from other
    // websites, but it is NOT strong security: anyone can fake the Origin header
    // from a script. See the README note.
    if (env.ALLOWED_ORIGIN && request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      return reply({ error: "Origin not allowed" }, 403, cors);
    }

    let incoming;
    try {
      incoming = await request.json();
    } catch (_) {
      return reply({ error: "Body must be JSON" }, 400, cors);
    }

    // Build a clean payload from a whitelist of fields. We never forward the caller's
    // app_id or anything unexpected, so this Worker can't be used as a general OneSignal relay.
    const clean = sanitize(incoming, env);
    if (!clean) return reply({ error: "Invalid push payload" }, 400, cors);

    const type = incoming.data && incoming.data.type;
    const questionId = incoming.data && incoming.data.questionId;

    // An answer ends the nudging, even if the push itself fails afterwards.
    if (type === "answer" && questionId) await updateQueue(env, (items) => items.filter((i) => i.questionId !== questionId));

    // Forward to OneSignal and pass its answer straight back to the app.
    const result = await sendToOneSignal(env, clean);

    if (result.ok && questionId) {
      const now = Date.now();
      if (type === "question") {
        // Remember one item per recipient, due in 5 minutes.
        await updateQueue(env, (items) => {
          const rest = items.filter((i) => i.questionId !== questionId);
          const added = clean.include_player_ids.map((playerId) => ({
            questionId,
            playerId,
            dueAt: now + NUDGE_INTERVAL_MS,
            expiresAt: now + ITEM_TTL_MS,
            count: 0,
            body: clean.contents.en,
            url: clean.url || null,
          }));
          return [...rest, ...added].slice(-MAX_QUEUE_ITEMS);
        });
      } else if (type === "nudge") {
        // A nudge sent from the app (manual or automatic) restarts the 5-minute timer.
        await updateQueue(env, (items) =>
          items.map((i) => (i.questionId === questionId ? { ...i, dueAt: now + NUDGE_INTERVAL_MS } : i))
        );
      }
    }

    return new Response(result.text, {
      status: result.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },

  // ---- Runs on the cron schedule (every minute) ----
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDueNudges(env));
  },
};

// ---------------------------------------------------------------------------
// Cron work
// ---------------------------------------------------------------------------
async function sendDueNudges(env) {
  const items = await loadQueue(env);                 // ONE KV read per run; nothing else when idle
  if (items.length === 0) return;

  const now = Date.now();
  let changed = false;
  const keep = [];

  for (const item of items) {
    if (item.expiresAt <= now) { changed = true; continue; }     // too old: drop it
    if (item.dueAt > now) { keep.push(item); continue; }         // not due yet

    // Due: nudge this recipient.
    await sendToOneSignal(env, {
      app_id: env.ONESIGNAL_APP_ID,
      include_player_ids: [item.playerId],
      headings: { en: NUDGE_TITLE },
      contents: { en: item.body },
      data: { questionId: item.questionId, type: "nudge" },
      ...(item.url ? { url: item.url } : {}),
    });
    changed = true;

    const count = item.count + 1;
    if (count < MAX_NUDGES) keep.push({ ...item, count, dueAt: now + NUDGE_INTERVAL_MS });
  }

  if (changed) await saveQueue(env, keep);
}

// ---------------------------------------------------------------------------
// The queue: one JSON array stored under one KV key.
// (Reading one key every minute is far cheaper on Cloudflare's free KV limits than
// listing many keys. "Last write wins" if two requests update at the same moment, which
// for a two-device family app is acceptable.)
// ---------------------------------------------------------------------------
async function loadQueue(env) {
  const raw = await env.NUDGES.get(QUEUE_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (_) {
    return [];
  }
}

async function saveQueue(env, items) {
  if (items.length === 0) await env.NUDGES.delete(QUEUE_KEY);
  else await env.NUDGES.put(QUEUE_KEY, JSON.stringify(items));
}

// Read, change, write.
async function updateQueue(env, change) {
  await saveQueue(env, change(await loadQueue(env)));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function sendToOneSignal(env, body) {
  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${AUTH_SCHEME} ${env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, status: 502, text: JSON.stringify({ error: "Could not reach OneSignal" }) };
  }
}

// Returns a safe payload, or null if the incoming one is not what push.js sends.
function sanitize(p, env) {
  if (!p || typeof p !== "object") return null;
  const ids = p.include_player_ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10) return null;
  if (!ids.every((id) => typeof id === "string" && id.length > 0 && id.length <= 64)) return null;

  const title = p.headings && p.headings.en;
  const body = p.contents && p.contents.en;
  if (typeof title !== "string" || typeof body !== "string") return null;
  if (title.length > 200 || body.length > 500) return null;

  const clean = {
    app_id: env.ONESIGNAL_APP_ID,
    include_player_ids: ids,
    headings: { en: title },
    contents: { en: body },
  };
  if (p.data && typeof p.data === "object" && JSON.stringify(p.data).length <= 1000) clean.data = p.data;
  if (typeof p.url === "string" && /^(https:\/\/|http:\/\/localhost)/.test(p.url) && p.url.length <= 300) clean.url = p.url;
  return clean;
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function reply(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
