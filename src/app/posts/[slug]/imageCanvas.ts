import QRCode from "qrcode";

// Shared drawing for the images sent on WhatsApp (status cards and short post): one 1080x1920 phone screen
// in the site's design, with the same header and the same QR footer.
export const W = 1080;
export const H = 1920;
export const PAD = 84;
export const SERIF = '"Frank Ruhl Libre", Georgia, serif';
export const SANS = '"Heebo", system-ui, Arial, sans-serif';
export const COLORS = {
  ground: "#fbf8f3",
  ink: "#1c1b19",
  muted: "#6b6459",
  accent: "#1e4d6b",
  gold: "#a87b2a",
  line: "#e7e0d4",
  tint: "#f4ecdd",
};
export const FOOT_TOP = 1584;

export type ImagePost = { slug: string; title: string; meta: string };

export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
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

export function newCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, W, H);
  return [canvas, ctx];
}

// The site mark (src/app/Logo.tsx) at the given top left corner and size.
export function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const u = size / 64;
  const rect = (rx: number, ry: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x + rx * u, y + ry * u, w * u, h * u, r * u);
  };
  rect(6, 4, 52, 56, 5);
  ctx.fillStyle = COLORS.tint;
  ctx.fill();
  ctx.lineWidth = 3 * u;
  ctx.strokeStyle = COLORS.accent;
  ctx.stroke();
  rect(22, 12, 20, 26, 1.5);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.fillStyle = COLORS.accent;
  for (let ly = 12; ly <= 52; ly += 5) {
    rect(12, ly, ly < 40 ? 7 : 40, 2.4, 1.2);
    ctx.fill();
    if (ly <= 37) {
      rect(45, ly, 7, 2.4, 1.2);
      ctx.fill();
    }
  }
}

// Site mark and name, masechet and daf, the post title, and a gold line naming what this image is.
// A long title shrinks to fit two to four lines. Returns where the body starts.
export function drawHeader(ctx: CanvasRenderingContext2D, post: ImagePost, kind: string): number {
  const right = W - PAD;
  ctx.fillStyle = COLORS.accent;
  ctx.font = `700 48px ${SERIF}`;
  drawLogo(ctx, right - 60, 76, 60);
  ctx.fillText("הדף היומי", right - 76, 80);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(post.meta, right, 146);
  ctx.fillStyle = COLORS.ink;
  let titleSize = 84;
  let title: string[] = [];
  for (const [size, maxLines] of [[84, 1], [64, 2], [52, 3], [44, 4]]) {
    titleSize = size;
    ctx.font = `700 ${size}px ${SERIF}`;
    title = wrap(ctx, post.title, W - 2 * PAD);
    if (title.length <= maxLines) break;
  }
  let titleY = 200;
  for (const line of title) {
    ctx.fillText(line, right, titleY);
    titleY += titleSize * 1.15;
  }
  ctx.fillStyle = COLORS.gold;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(kind, right, titleY + 16);
  return titleY + 84;
}

// The link to the full post as a QR code, since a link inside an image cannot be tapped.
export async function drawQrFooter(ctx: CanvasRenderingContext2D, post: ImagePost, src: string) {
  const right = W - PAD;
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(PAD, FOOT_TOP, W - 2 * PAD, 2);
  const url = `${window.location.origin}/posts/${post.slug}?src=${src}`;
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
  ctx.direction = "rtl";
  ctx.textAlign = "right";
}

export async function loadFonts() {
  await Promise.all([
    document.fonts.load(`700 50px ${SERIF}`),
    document.fonts.load(`500 50px ${SERIF}`),
    document.fonts.load(`400 30px ${SANS}`),
  ]).catch(() => undefined);
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
