"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Never show technical text to the reader; the details stay in the server log.
  return (
    <main className="page state">
      <h1 className="post-title">משהו השתבש</h1>
      <p>לא הצלחנו לטעון את העמוד. אפשר לנסות שוב, או לחזור לעמוד הבית.</p>
      <div className="state-actions">
        <button type="button" className="button-link" onClick={reset}>
          לנסות שוב
        </button>
        <Link className="button-link outline" href="/">לעמוד הבית</Link>
      </div>
    </main>
  );
}
