"use client";

import { useEffect } from "react";

const FIELDS = ["masechet_id", "daf", "title", "summary", "body"];

/**
 * Keeps what was typed in the post form. A validation error sends the owner back to the form,
 * and without this the whole post would be lost. Fields are saved on submit and restored after an error.
 */
export function FormKeeper({ formKey, restore, clear }: { formKey: string; restore: boolean; clear: boolean }) {
  useEffect(() => {
    const storageKey = `post-form-${formKey}`;
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    try {
      if (clear) sessionStorage.removeItem(storageKey);
      if (restore) {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as Record<string, string> | null;
        if (saved) {
          for (const name of FIELDS) {
            const el = form.elements.namedItem(name) as HTMLInputElement | null;
            if (el && typeof saved[name] === "string") el.value = saved[name];
          }
        }
      }
    } catch {}
    const save = () => {
      try {
        const data: Record<string, string> = {};
        for (const name of FIELDS) {
          const el = form.elements.namedItem(name) as HTMLInputElement | null;
          if (el) data[name] = el.value;
        }
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
    };
    form.addEventListener("submit", save);
    return () => form.removeEventListener("submit", save);
  }, [formKey, restore, clear]);
  return null;
}
