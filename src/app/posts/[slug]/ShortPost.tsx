"use client";

import { useEffect, useState } from "react";
import type { StatusCard } from "@/lib/status";
import { shortPostImage, type ShortPostMeta } from "./shortPostImage";

// The approved short post, shown as the same image that is sent on WhatsApp, with a download (share sheet on phones).
// The text stays in the page for screen readers and search.
export function ShortPost({ cards, post }: { cards: StatusCard[]; post: ShortPostMeta }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    let url = "";
    shortPostImage(cards, post)
      .then((b) => {
        url = URL.createObjectURL(b);
        setBlob(b);
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [cards, post]);

  async function download() {
    if (!blob) return;
    const file = new File([blob], `short-post-${post.slug}.png`, { type: "image/png" });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = src;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <section id="short" className="short-post" aria-label="הפוסט בקצרה">
      <h2 className="status-title">הפוסט בקצרה, בתמונה אחת</h2>
      <div className="short-post-frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn in the browser as a blob URL */}
        {src ? <img src={src} alt="" width={1080} height={1920} /> : null}
      </div>
      <div className="sr-only">
        {cards.map((c, i) => (
          <p key={i}>
            {c.title ? <strong>{c.title} </strong> : null}
            {c.text}
          </p>
        ))}
      </div>
      <div className="status-download">
        <button type="button" onClick={download} disabled={!blob}>
          הורדת התמונה
        </button>
      </div>
    </section>
  );
}
