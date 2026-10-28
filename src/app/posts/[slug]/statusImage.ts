import type { StatusCard } from "@/lib/status";

// Draws status cards as 1080x1920 PNGs (WhatsApp status size) in the site's design, in the browser.
const W = 1080;
const H = 1920;
const PAD = 96;
const SERIF = '"Frank Ruhl Libre", Georgia, serif';
const SANS = '"Heebo", system-ui, Arial, sans-serif';
const COLORS = { ground: "#fbf8f3", ink: "#1c1b19", muted: "#6b6459", accent: "#1e4d6b", gold: "#a87b2a", tint: "#f4ecdd" };

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Shrinks the text until title and body fit the card.
function layout(ctx: CanvasRenderingContext2D, card: StatusCard, width: number, maxHeight: number) {
  for (let size = 64; ; size -= 4) {
    const titleSize = Math.round(size * 1.15);
    ctx.font = `700 ${titleSize}px ${SERIF}`;
    const title = card.title ? wrap(ctx, card.title, width) : [];
    ctx.font = `500 ${size}px ${SERIF}`;
    const body = wrap(ctx, card.text, width);
    const gap = title.length ? size * 0.8 : 0;
    const height = title.length * titleSize * 1.35 + gap + body.length * size * 1.6;
    if (height <= maxHeight || size <= 32) return { size, titleSize, title, body, gap, height };
  }
}

function draw(card: StatusCard, n: number, total: number, postTitle: string): HTMLCanvasElement {
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
  ctx.font = `700 56px ${SERIF}`;
  ctx.fillText("הדף היומי", right, 150);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 34px ${SANS}`;
  ctx.fillText(`הרעיון בקצרה · ${n} מתוך ${total}`, right, 230);

  // The card: tint box with the gold right border, like on the site.
  const top = 340;
  const bottom = H - 300;
  ctx.fillStyle = COLORS.tint;
  ctx.beginPath();
  ctx.roundRect(PAD, top, W - 2 * PAD, bottom - top, 36);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(W - PAD - 12, top + 36, 12, bottom - top - 72);

  const inner = 72;
  const textRight = right - inner;
  const textWidth = W - 2 * PAD - 2 * inner;
  const fit = layout(ctx, card, textWidth, bottom - top - 2 * inner);
  let y = top + (bottom - top - fit.height) / 2;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 ${fit.titleSize}px ${SERIF}`;
  for (const line of fit.title) {
    ctx.fillText(line, textRight, y);
    y += fit.titleSize * 1.35;
  }
  y += fit.gap;
  ctx.font = `500 ${fit.size}px ${SERIF}`;
  for (const line of fit.body) {
    ctx.fillText(line, textRight, y + fit.size * 0.25);
    y += fit.size * 1.6;
  }

  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 40px ${SERIF}`;
  ctx.fillText(wrap(ctx, postTitle, W - 2 * PAD)[0] ?? "", right, H - 240);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 32px ${SANS}`;
  ctx.fillText("אבי יוניצמן · הפוסט המלא באתר", right, H - 175);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadStatusImages(cards: StatusCard[], indexes: number[], post: { slug: string; title: string }) {
  await Promise.all([
    document.fonts.load(`700 64px ${SERIF}`),
    document.fonts.load(`500 64px ${SERIF}`),
    document.fonts.load(`400 32px ${SANS}`),
  ]).catch(() => undefined);
  const files = await Promise.all(
    indexes.map(async (i) => {
      const blob = await toBlob(draw(cards[i], i + 1, cards.length, post.title));
      return new File([blob], `status-${post.slug}-${i + 1}.png`, { type: "image/png" });
    }),
  );
  // On phones the share sheet saves to the gallery (or straight to a WhatsApp status); elsewhere a plain download.
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  for (const file of files) {
    save(file);
    await new Promise((r) => setTimeout(r, 300));
  }
}
