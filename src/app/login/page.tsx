"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);
  return (
    <main>
      <h1>כניסה</h1>
      <form action={formAction}>
        <p>
          <label>
            אימייל <input name="email" type="email" autoComplete="email" required />
          </label>
        </p>
        <p>
          <label>
            סיסמה <input name="password" type="password" autoComplete="current-password" required />
          </label>
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          כניסה
        </button>
      </form>
    </main>
  );
}
