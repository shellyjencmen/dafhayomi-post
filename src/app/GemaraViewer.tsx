"use client";

import { useState } from "react";

export type GemaraImageView = { id: string; url: string; label: string | null; alt: string | null };

export function GemaraViewer({ images }: { images: GemaraImageView[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  if (!current) return null;
  return (
    <div className="gemara-viewer">
      <div className="side-title">
        <strong>דף הגמרא לעיון</strong>
        <span className="muted">רפרנס לטקסט</span>
      </div>
      {images.length > 1 ? (
        <div className="gemara-tabs" role="tablist" aria-label="עמודי הגמרא">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={i === active ? "chip chip-on" : "chip"}
              onClick={() => setActive(i)}
            >
              {image.label || `עמוד ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <figure className="gemara-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt ?? current.label ?? "דף גמרא"} />
      </figure>
      <a className="muted zoom" href={current.url} target="_blank" rel="noreferrer">
        הגדלת התמונה בחלון חדש
      </a>
    </div>
  );
}
