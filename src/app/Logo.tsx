// The site mark: a Gemara page, the main text in gold with the commentary lines around it.
// The same shape is drawn on the WhatsApp images (drawLogo in posts/[slug]/imageCanvas.ts) and is src/app/icon.svg.
const LEFT_LINES = [12, 17, 22, 27, 32, 37, 42, 47, 52];
const RIGHT_LINES = [12, 17, 22, 27, 32, 37];

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="52" height="56" rx="5" fill="var(--tint)" stroke="var(--accent)" strokeWidth="3" />
      <rect x="22" y="12" width="20" height="26" rx="1.5" fill="var(--gold)" />
      {LEFT_LINES.map((y) => (
        <rect key={`l${y}`} x="12" y={y} width={y < 40 ? 7 : 40} height="2.4" rx="1.2" fill="var(--accent)" />
      ))}
      {RIGHT_LINES.map((y) => (
        <rect key={`r${y}`} x="45" y={y} width="7" height="2.4" rx="1.2" fill="var(--accent)" />
      ))}
    </svg>
  );
}
