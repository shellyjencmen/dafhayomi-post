"use client";

import { useState } from "react";
import styles from "./status.module.css";
import admin from "../../../admin.module.css";

type Card = { phase?: string; title: string; text: string };

const PHASE_COLOR: Record<string, string> = { opening: "#1e4d6b", middle: "#8a5a00", closing: "#2d6a3e" };
const W = 1080;
const H = 1920;

/** Breaks text into lines that fit `width`, word by word. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** One card as a WhatsApp status image (1080x1920), drawn in the browser so Hebrew shaping and RTL are right. */
async function cardImage(card: Card, index: number, total: number, postTitle: string): Promise<Blob> {
  await document.fonts.load('700 64px "Frank Ruhl Libre"').catch(() => undefined);
  await document.fonts.load('400 52px "Heebo"').catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const color = PHASE_COLOR[card.phase ?? ""] ?? "#1e4d6b";
  ctx.fillStyle = "#fbf8f3";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, 24);
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  const right = W - 96;

  // Progress strip: where the reader is.
  const gap = 16;
  const seg = (W - 192 - gap * (total - 1)) / total;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i <= index ? color : "#e7e0d4";
    ctx.fillRect(right - (i + 1) * seg - i * gap, 140, seg, 12);
  }

  ctx.fillStyle = "#6b6459";
  ctx.font = '400 40px "Heebo", Arial, sans-serif';
  ctx.fillText(`${index + 1} מתוך ${total}`, right, 240);

  let y = 420;
  if (card.title) {
    ctx.fillStyle = color;
    ctx.font = '700 72px "Frank Ruhl Libre", Georgia, serif';
    for (const l of wrap(ctx, card.title, W - 192)) {
      ctx.fillText(l, right, y);
      y += 96;
    }
    y += 40;
  }
  ctx.fillStyle = "#1c1b19";
  ctx.font = '400 56px "Heebo", Arial, sans-serif';
  for (const l of wrap(ctx, card.text, W - 192)) {
    ctx.fillText(l, right, y);
    y += 92;
  }

  ctx.fillStyle = "#6b6459";
  ctx.font = '500 40px "Heebo", Arial, sans-serif';
  for (const [i, l] of wrap(ctx, postTitle, W - 192).slice(0, 2).entries()) ctx.fillText(l, right, H - 220 + i * 56);
  ctx.fillStyle = color;
  ctx.font = '700 44px "Heebo", Arial, sans-serif';
  ctx.fillText("לפוסט המלא באתר הדף היומי", right, H - 100);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

function cardText(card: Card) {
  return card.title ? `${card.title}\n${card.text}` : card.text;
}

export function ShareTools({ cards, postTitle, postUrl }: { cards: Card[]; postTitle: string; postUrl: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function images() {
    return Promise.all(cards.map((c, i) => cardImage(c, i, cards.length, postTitle)));
  }

  async function download() {
    setBusy(true);
    try {
      const blobs = await images();
      blobs.forEach((b, i) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `status-${i + 1}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      });
      setNote(`הורדו ${blobs.length} תמונות. מעלים אותן לסטטוס בוואטסאפ לפי הסדר.`);
    } catch {
      setNote("ההורדה נכשלה. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(i: number) {
    const text = i === cards.length - 1 ? `${cardText(cards[i])}\n${postUrl}` : cardText(cards[i]);
    try {
      await navigator.clipboard.writeText(text);
      setNote(`כרטיס ${i + 1} הועתק.`);
    } catch {
      setNote("ההעתקה נכשלה. אפשר לסמן את הטקסט ולהעתיק ידנית.");
    }
  }

  async function share() {
    if (!navigator.share) {
      setNote("השיתוף זמין מהטלפון. במחשב אפשר להוריד את התמונות או להעתיק כל כרטיס.");
      return;
    }
    setBusy(true);
    try {
      const files = (await images()).map((b, i) => new File([b], `status-${i + 1}.png`, { type: "image/png" }));
      const data = navigator.canShare?.({ files }) ? { files } : { text: `${cards.map(cardText).join("\n\n")}\n${postUrl}` };
      await navigator.share(data);
      setNote("אחרי ההעלאה לסטטוס בוואטסאפ, לוחצים \"סימון כשותף\".");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("השיתוף נכשל. אפשר להוריד את התמונות במקום.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.share} aria-label="שיתוף">
      <div>
        <button type="button" className={admin.primary} onClick={download} disabled={busy}>
          הורדה כתמונות
        </button>
        <button type="button" className={admin.secondary} onClick={share} disabled={busy}>
          שתף
        </button>
      </div>
      <div>
        {cards.map((_, i) => (
          <button key={i} type="button" className={styles.small} onClick={() => copy(i)}>
            העתק כרטיס {i + 1}
          </button>
        ))}
      </div>
      {note && (
        <p className={admin.message} role="status">
          {note}
        </p>
      )}
    </section>
  );
}
