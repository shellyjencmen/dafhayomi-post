import QRCode from "qrcode";
import type { StatusCard } from "@/lib/status";

// Draws the short post as one 1080x1920 PNG (a phone screen, so it reads without scrolling), in the site's design.
// The opening card (no title) is highlighted; each titled section gets the gold side line. A QR code leads to the post.
const W = 1080;
const H = 1920;
const PAD = 84;
const SERIF = '"Frank Ruhl Libre", Georgia, serif';
const SANS = '"Heebo", system-ui, Arial, sans-serif';
const COLORS = { ground: "#fbf8f3", ink: "#1c1b19", muted: "#6b6459", accent: "#1e4d6b", gold: "#a87b2a", line: "#e7e0d4" };
const BODY_TOP = 380;
const FOOT_TOP = 1584;

export type ShortPostMeta = { slug: string; title: string; meta: string };

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type Block = { lead: boolean; title: string[]; body: string[]; height: number };

// Lays the cards out at font size f; returns null when they do not fit the body area.
function layout(ctx: CanvasRenderingContext2D, cards: StatusCard[], f: number): Block[] | null {
  const blocks: Block[] = [];
  let total = 0;
  for (const card of cards) {
    const lead = !card.title;
    const inset = lead ? 42 : 36;
    const width = W - 2 * PAD - inset;
    let title: string[] = [];
    if (!lead) {
      ctx.font = `700 ${Math.round(f * 1.05)}px ${SERIF}`;
      title = wrap(ctx, card.title, width);
    }
    const size = lead ? Math.round(f * 1.12) : f;
    ctx.font = `${lead ? 700 : 500} ${size}px ${SERIF}`;
    const body = wrap(ctx, card.text, width);
    const height = title.length * f * 1.05 * 1.3 + body.length * size * 1.5;
    blocks.push({ lead, title, body, height });
    total += height + f * (lead ? 1 : 0.7);
  }
  return total <= FOOT_TOP - BODY_TOP - 40 ? blocks : null;
}

async function draw(cards: StatusCard[], post: ShortPostMeta): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, W, H);

  const right = W - PAD;
  ctx.fillStyle = COLORS.accent;
  ctx.font = `700 48px ${SERIF}`;
  ctx.fillText("הדף היומי", right, 80);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(post.meta, right, 146);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 84px ${SERIF}`;
  ctx.fillText(wrap(ctx, post.title, W - 2 * PAD)[0] ?? "", right, 200);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText("הפוסט בקצרה", right, 312);

  let f = 50;
  let blocks = layout(ctx, cards, f);
  while (!blocks && f > 24) blocks = layout(ctx, cards, (f -= 1));
  let y = BODY_TOP;
  for (const b of blocks ?? []) {
    const bar = b.lead ? 14 : 8;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(right - bar, y, bar, b.height);
    const x = right - (b.lead ? 42 : 36);
    const titleSize = Math.round(f * 1.05);
    ctx.fillStyle = COLORS.accent;
    ctx.font = `700 ${titleSize}px ${SERIF}`;
    let ty = y;
    for (const line of b.title) {
      ctx.fillText(line, x, ty);
      ty += titleSize * 1.3;
    }
    const size = b.lead ? Math.round(f * 1.12) : f;
    ctx.fillStyle = b.lead ? COLORS.accent : COLORS.ink;
    ctx.font = `${b.lead ? 700 : 500} ${size}px ${SERIF}`;
    for (const line of b.body) {
      ctx.fillText(line, x, ty + size * 0.2);
      ty += size * 1.5;
    }
    y += b.height + f * (b.lead ? 1 : 0.7);
  }

  // Footer: the link to the full post as a QR code, since a link inside an image cannot be tapped.
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(PAD, FOOT_TOP, W - 2 * PAD, 2);
  const url = `${window.location.origin}/posts/${post.slug}?src=short`;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, { width: 240, margin: 1, color: { dark: COLORS.accent, light: "#ffffff" } });
  ctx.drawImage(qr, PAD, FOOT_TOP + 34, 240, 240);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 46px ${SERIF}`;
  ctx.fillText("לפוסט המלא ולדף הגמרא", right, FOOT_TOP + 60);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText("סרקו את הקוד", right, FOOT_TOP + 130);
  const { host, pathname } = new URL(url);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.accent;
  let size = 24;
  ctx.font = `500 ${size}px ${SANS}`;
  const room = right - (PAD + 240 + 36);
  while (size > 16 && ctx.measureText(host).width > room) ctx.font = `500 ${--size}px ${SANS}`;
  ctx.fillText(host, PAD + 240 + 36, FOOT_TOP + 190);
  ctx.fillText(pathname, PAD + 240 + 36, FOOT_TOP + 190 + size * 1.4);
  return canvas;
}

export async function shortPostImage(cards: StatusCard[], post: ShortPostMeta): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`700 50px ${SERIF}`),
    document.fonts.load(`500 50px ${SERIF}`),
    document.fonts.load(`400 30px ${SANS}`),
  ]).catch(() => undefined);
  const canvas = await draw(cards, post);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
