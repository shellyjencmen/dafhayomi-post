import type { StatusCard } from "@/lib/status";
import { COLORS, FOOT_TOP, PAD, SANS, SERIF, W, drawHeader, drawQrFooter, loadFonts, newCanvas, toBlob, wrap, type ImagePost } from "./imageCanvas";

// Draws status cards as 1080x1920 PNGs (WhatsApp status size) in the short post's design: the same header,
// the card as a titled section with the gold side line, and on the last card the same QR footer.

// Shrinks the text until title and body fit the body area.
function layout(ctx: CanvasRenderingContext2D, card: StatusCard, width: number, maxHeight: number) {
  for (let size = 60; ; size -= 2) {
    const titleSize = Math.round(size * 1.1);
    ctx.font = `700 ${titleSize}px ${SERIF}`;
    const title = card.title ? wrap(ctx, card.title, width) : [];
    ctx.font = `500 ${size}px ${SERIF}`;
    const body = wrap(ctx, card.text, width);
    const gap = title.length ? size * 0.5 : 0;
    const height = title.length * titleSize * 1.3 + gap + body.length * size * 1.55;
    if (height <= maxHeight || size <= 32) return { size, titleSize, title, body, gap, height };
  }
}

// Position dots in the footer of every card but the last, which carries the QR code instead.
function drawDots(ctx: CanvasRenderingContext2D, n: number, total: number) {
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(PAD, FOOT_TOP, W - 2 * PAD, 2);
  const step = 40;
  const start = W / 2 + ((total - 1) * step) / 2;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i === n - 1 ? COLORS.gold : COLORS.line;
    ctx.beginPath();
    ctx.arc(start - i * step, FOOT_TOP + 110, i === n - 1 ? 11 : 8, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 30px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("המשך בכרטיס הבא", W / 2, FOOT_TOP + 160);
  ctx.textAlign = "right";
}

async function draw(card: StatusCard, n: number, total: number, post: ImagePost): Promise<HTMLCanvasElement> {
  const [canvas, ctx] = newCanvas();
  const bodyTop = drawHeader(ctx, post, `הרעיון בקצרה · ${n} מתוך ${total}`);

  const right = W - PAD;
  const inset = 36;
  const fit = layout(ctx, card, W - 2 * PAD - inset, FOOT_TOP - bodyTop - 120);
  const top = bodyTop + (FOOT_TOP - bodyTop - fit.height) / 2 - 20;
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(right - 8, top, 8, fit.height);
  let y = top;
  ctx.fillStyle = COLORS.accent;
  ctx.font = `700 ${fit.titleSize}px ${SERIF}`;
  for (const line of fit.title) {
    ctx.fillText(line, right - inset, y);
    y += fit.titleSize * 1.3;
  }
  y += fit.gap;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `500 ${fit.size}px ${SERIF}`;
  for (const line of fit.body) {
    ctx.fillText(line, right - inset, y + fit.size * 0.2);
    y += fit.size * 1.55;
  }

  if (n === total) await drawQrFooter(ctx, post, "status");
  else drawDots(ctx, n, total);
  return canvas;
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

export async function downloadStatusImages(cards: StatusCard[], indexes: number[], post: ImagePost) {
  await loadFonts();
  const files = await Promise.all(
    indexes.map(async (i) => {
      const blob = await toBlob(await draw(cards[i], i + 1, cards.length, post));
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
