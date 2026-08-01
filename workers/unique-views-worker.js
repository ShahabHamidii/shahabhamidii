/**
 * Cloudflare Worker to count unique profile views using a cookie + KV namespace.
 *
 * In Cloudflare Workers dashboard, bind your KV namespace as:
 *   Variable name: VISIT_KV
 */
const COOKIE_NAME = "profile_viewed";
const COOKIE_DAYS = 365;
const COUNT_KEY = "unique_count";

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : null;
}

function renderBadge(count) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="20" role="img" aria-label="unique views: ${count}"><linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><mask id="m"><rect width="140" height="20" rx="3" fill="#fff"/></mask><g mask="url(#m)"><rect width="80" height="20" fill="#555"/><rect x="80" width="60" height="20" fill="#2563eb"/><rect width="140" height="20" fill="url(#g)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="40" y="15">views</text><text x="110" y="15">${count}</text></g></svg>`;
}

export default {
  async fetch(request, env) {
    const cookieHeader = request.headers.get("Cookie");
    const hasSeen = Boolean(getCookieValue(cookieHeader, COOKIE_NAME));

    let count = Number.parseInt(await env.VISIT_KV.get(COUNT_KEY), 10) || 0;

    if (!hasSeen) {
      count += 1;
      await env.VISIT_KV.put(COUNT_KEY, String(count));
    }

    const headers = new Headers({
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    });

    if (!hasSeen) {
      headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=1; Max-Age=${COOKIE_DAYS * 24 * 60 * 60}; Path=/; HttpOnly; Secure; SameSite=Lax`
      );
    }

    return new Response(renderBadge(count), { headers });
  },
};
