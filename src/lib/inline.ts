/**
 * Inline markup in post bodies: [text](https://link), **bold**, *italic*.
 * "***text***" is bold and italic: the bold match may not stop right before another "*",
 * so it takes the whole "*text*" and the italic is found inside it.
 * The email builder (docs/runbook/email/build_email.py) uses the same pattern.
 */
export const INLINE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*(?!\*)|\*(.+?)\*/;
