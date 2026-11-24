const CHANNEL = 'gdeseychastbiliantiki';
const CACHE_TTL = 15;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': '*'
};

async function handleRequest(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, 'access-control-max-age': '86400' }
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...CORS_HEADERS
      }
    });
  }

  const cache = caches.default;
  const cacheKey = new Request('https://internal.cache/api/news', { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let body = '';
  let ok = false;
  for (let attempt = 0; attempt < USER_AGENTS.length && !ok; attempt++) {
    try {
      const upstream = await fetch(`https://t.me/s/${CHANNEL}`, {
        headers: {
          'user-agent': USER_AGENTS[attempt],
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'ru,en;q=0.9'
        },
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      if (!upstream.ok) continue;
      const text = await upstream.text();
      if (!text.includes('tgme_widget_message')) continue;
      body = text;
      ok = true;
    } catch (err) {
      body = '';
    }
  }

  if (!ok) {
    return new Response(JSON.stringify({ error: 'upstream error', channel: CHANNEL }), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...CORS_HEADERS
      }
    });
  }

  const res = new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
      ...CORS_HEADERS
    }
  });
  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export async function onRequest(context) {
  return handleRequest(context.request, context.env, context);
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
