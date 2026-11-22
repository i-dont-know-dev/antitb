const CHANNEL = 'gdeseychastbiliantiki';
const CACHE_TTL = 30;

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(`${new URL(context.request.url).origin}/api/news`);
  const cached = await cache.match(key);
  if (cached) return cached;

  let body = '';
  let ok = false;
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];
  for (let attempt = 0; attempt < userAgents.length && !ok; attempt++) {
    try {
      const upstream = await fetch(`https://t.me/s/${CHANNEL}`, {
        headers: {
          'user-agent': userAgents[attempt],
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'ru,en;q=0.9'
        },
        cf: {cacheTtl: 0, cacheEverything: false}
      });
      if (!upstream.ok) continue;
      const text = await upstream.text();
      if (!text.includes('tgme_widget_message')) continue;
      body = text;
      ok = true;
    } catch (e) {
    }
  }
// сучка ты шо тут ищешь блядт
  if (!ok) {
    return new Response(JSON.stringify({error: 'upstream error', channel: CHANNEL}), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store'
      }
    });
  }

  const res = new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS'
    }
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400'
    }
  });
}
