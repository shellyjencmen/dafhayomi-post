"use client";

import { useState, type ReactNode } from "react";

// On phones the post folds after the opening paragraphs; on desktop it is always shown in full (CSS).
export function PostBody({ intro, rest, restMinutes }: { intro: ReactNode; rest: ReactNode; restMinutes: number }) {
  const [open, setOpen] = useState(false);
  if (!rest) return <div className="post-body">{intro}</div>;
  return (
    <>
      <div className="post-body">
        <div className={open ? "" : "fade-mobile"}>{intro}</div>
        <div className={open ? "post-more open" : "post-more"}>{rest}</div>
      </div>
      <button type="button" className="button-link wide mobile-only post-toggle" onClick={() => setOpen(!open)}>
        {open ? "צמצום הפוסט" : `להמשך הפוסט · עוד ${restMinutes} דקות`}
      </button>
    </>
  );
}
