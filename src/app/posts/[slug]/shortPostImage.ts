import type { StatusCard } from "@/lib/status";
import { COLORS, FOOT_TOP, PAD, SERIF, W, drawHeader, drawQrFooter, loadFonts, newCanvas, toBlob, wrap, type ImagePost } from "./imageCanvas";

export type ShortPostMeta = ImagePost;

// Draws the short post as one 1080x1920 PNG (a phone screen, so it reads without scrolling), in the site's design.
// The opening card (no title) sits in a cream box with a gold edge; each titled section gets the gold side line.
// A QR code leads to the post.
type Block = { lead: boolean; title: string[]; body: string[]; height: number };

// Lays the cards out at font size f; returns null when they do not fit the body area.
function layout(ctx: CanvasRenderingContext2D, cards: StatusCard[], f: number, top: number): Block[] | null {
  const blocks: Block[] = [];
  let total = 0;
  for (const card of cards) {
    const lead = !card.title;
    const width = W - 2 * PAD - (lead ? 10 + 1.6 * f : 36);
    let title: string[] = [];
    if (!lead) {
      ctx.font = `700 ${Math.round(f * 1.05)}px ${SERIF}`;
      title = wrap(ctx, card.title, width);
    }
    ctx.font = `${lead ? 700 : 500} ${f}px ${SERIF}`;
    const body = wrap(ctx, card.text, width);
    const height = title.length * f * 1.05 * 1.3 + body.length * f * 1.5 + (lead ? 1.2 * f : 0);
    blocks.push({ lead, title, body, height });
    total += height + f * 0.8;
  }
  return total <= FOOT_TOP - top - 40 ? blocks : null;
}

async function draw(cards: StatusCard[], post: ShortPostMeta): Promise<HTMLCanvasElement> {
  const [canvas, ctx] = newCanvas();
  const right = W - PAD;
  const top = drawHeader(ctx, post, "הפוסט בקצרה");

  let f = 50;
  let blocks = layout(ctx, cards, f, top);
  while (!blocks && f > 24) blocks = layout(ctx, cards, (f -= 1), top);
  let y = top;
  for (const b of blocks ?? []) {
    if (b.lead) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.roundRect(PAD, y, W - 2 * PAD, b.height, 20);
      ctx.fill();
      ctx.fillStyle = COLORS.tint;
      ctx.beginPath();
      ctx.roundRect(PAD, y, W - 2 * PAD - 10, b.height, [20, 0, 0, 20]);
      ctx.fill();
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(right - 8, y, 8, b.height);
    }
    const x = right - (b.lead ? 10 + 0.8 * f : 36);
    const titleSize = Math.round(f * 1.05);
    ctx.fillStyle = COLORS.accent;
    ctx.font = `700 ${titleSize}px ${SERIF}`;
    let ty = b.lead ? y + 0.6 * f : y;
    for (const line of b.title) {
      ctx.fillText(line, x, ty);
      ty += titleSize * 1.3;
    }
    ctx.fillStyle = COLORS.ink;
    ctx.font = `${b.lead ? 700 : 500} ${f}px ${SERIF}`;
    for (const line of b.body) {
      ctx.fillText(line, x, ty + f * 0.2);
      ty += f * 1.5;
    }
    y += b.height + f * 0.8;
  }

  await drawQrFooter(ctx, post, "short");
  return canvas;
}

export async function shortPostImage(cards: StatusCard[], post: ShortPostMeta): Promise<Blob> {
  await loadFonts();
  return toBlob(await draw(cards, post));
}
