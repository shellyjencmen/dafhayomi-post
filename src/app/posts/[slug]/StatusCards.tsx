"use client";

import { useState } from "react";

export type StatusCard = { title: string; text: string };

export function StatusCards({ cards }: { cards: StatusCard[] }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const last = index === cards.length - 1;

  return (
    <section className="status-cards" aria-label="הרעיון בקצרה">
      <div className="status-head">
        <h2 className="status-title">לא מצליחים להעמיק בפוסט? הרעיון בקצרה</h2>
        <span className="status-count muted">
          {index + 1} מתוך {cards.length}
        </span>
      </div>
      <div className="status-strip" aria-hidden="true">
        {cards.map((_, i) => (
          <i key={i} className={i <= index ? "on" : ""} />
        ))}
      </div>
      <div className="status-card" aria-live="polite">
        {card.title ? <h3 className="status-card-title">{card.title}</h3> : null}
        <p>{card.text}</p>
      </div>
      <div className="status-nav">
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          › הקודם
        </button>
        <button type="button" onClick={() => setIndex(index + 1)} disabled={last}>
          הבא ‹
        </button>
      </div>
      <a className="status-more" href="#post-top">
        מעוניינים להעמיק? לקריאת הפוסט המלא ‹
      </a>
    </section>
  );
}
