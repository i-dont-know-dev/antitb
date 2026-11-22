const CHANNEL = 'gdeseychastbiliantiki';

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(`${new URL(context.request.url).origin}/api/news`);
  const cached = await cache.match(key);
  if (cached) return cached;

  const upstream = await fetch(`https://t.me/s/${CHANNEL}`, {headers: {'user-agent': 'Mozilla/5.0'}});
  if (!upstream.ok) return new Response('upstream error', {status: 502});

  const res = new Response(await upstream.text(), {
    headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=45'}
  });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}
