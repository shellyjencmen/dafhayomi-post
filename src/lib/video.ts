// A post's video link: YouTube plays inside the page, any other https link opens in a new tab.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** The YouTube video id of a link, or null when the link is not a YouTube video. */
export function youtubeId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

/** Start time in seconds from t= or start= (e.g. 90, 90s, 1m30s), or 0. */
export function youtubeStart(link: string): number {
  try {
    const url = new URL(link.trim());
    const t = url.searchParams.get("t") ?? url.searchParams.get("start");
    if (!t) return 0;
    if (/^\d+$/.test(t)) return Number(t);
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
  } catch {
    return 0;
  }
}

/** Cleans a typed link: empty means no video; anything else must be a valid https link. */
export function normalizeVideoUrl(raw: string): { ok: true; url: string | null } | { ok: false } {
  const text = raw.trim();
  if (!text) return { ok: true, url: null };
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || text.length > 500) return { ok: false };
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false };
  }
}
