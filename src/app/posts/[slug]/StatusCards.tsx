"use client";

import { useState } from "react";
import Link from "next/link";
import type { StatusCard } from "@/lib/status";
import { downloadStatusImages } from "./statusImage";

// postHref: where "read the full post" goes; omitted on the post page itself (jumps to the top).
// All cards are stacked in one grid cell so the box keeps the height of the tallest card.
export function StatusCards({ cards, post, postHref }: { cards: StatusCard[]; post: { slug: string; title: string }; postHref?: string }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const last = index === cards.length - 1;

  async function download(which: "one" | "all") {
    setBusy(true);
    try {
      await downloadStatusImages(cards, which === "one" ? [index] : cards.map((_, i) => i), post);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="status" className="status-cards" aria-label="הרעיון בקצרה">
      <div className="status-head">
        <h2 className="status-title">הרעיון בקצרה</h2>
        <span className="status-count muted">
          {index + 1} מתוך {cards.length}
        </span>
      </div>
      <div className="status-stack" aria-live="polite">
        {cards.map((card, i) => (
          <div key={i} className={i === index ? "status-card active" : "status-card"} aria-hidden={i !== index}>
            {card.title ? <h3 className="status-card-title">{card.title}</h3> : null}
            <p>{card.text}</p>
          </div>
        ))}
      </div>
      <div className="status-nav">
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          › הקודם
        </button>
        <button type="button" onClick={() => setIndex(index + 1)} disabled={last}>
          הבא ‹
        </button>
      </div>
      <div className="status-download">
        <span className="muted">הורדה כתמונה:</span>
        <button type="button" onClick={() => download("one")} disabled={busy}>
          הכרטיס הזה
        </button>
        <button type="button" onClick={() => download("all")} disabled={busy}>
          כל {cards.length} הכרטיסים
        </button>
      </div>
      {postHref ? (
        <Link className="status-more" href={postHref}>
          לקריאת הפוסט המלא ‹
        </Link>
      ) : (
        <a className="status-more" href="#post-top">
          לקריאת הפוסט המלא ‹
        </a>
      )}
    </section>
  );
}
