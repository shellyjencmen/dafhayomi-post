export type Shortcut = { href: string; title: string; sub: string };

// "No time for the whole post?" jump links. A part without content has no shortcut.
export function Shortcuts({ items, className }: { items: Shortcut[]; className?: string }) {
  if (!items.length) return null;
  return (
    <nav className={className ? `jump ${className}` : "jump"} aria-label="קיצורים">
      <p className="muted jump-lead">אין זמן לכל הפוסט? קפצו ישר אל:</p>
      <div className="jump-grid">
        {items.map((item) => (
          <a key={item.href} className="jump-item" href={item.href}>
            <strong>{item.title}</strong>
            <span className="muted">{item.sub}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
