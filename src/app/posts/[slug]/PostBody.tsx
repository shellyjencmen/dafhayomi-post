"use client";

import { useState, type ReactNode } from "react";

// The post folds after the opening paragraphs, on every screen width, so the side column never moves.
export function PostBody({ intro, rest, restMinutes }: { intro: ReactNode; rest: ReactNode; restMinutes: number }) {
  const [open, setOpen] = useState(false);
  if (!rest) return <div className="post-body">{intro}</div>;

  function toggle() {
    if (open) document.getElementById("post-top")?.scrollIntoView({ behavior: "smooth" });
    setOpen(!open);
  }

  return (
    <>
      <div className="post-body">
        <div className={open ? "" : "fade"}>{intro}</div>
        <div className={open ? "post-more open" : "post-more"}>{rest}</div>
      </div>
      <button type="button" className="button-link wide post-toggle" onClick={toggle}>
        {open ? "חזרה לפוסט המקוצר" : `להמשך הפוסט · עוד ${restMinutes} דקות`}
      </button>
    </>
  );
}
