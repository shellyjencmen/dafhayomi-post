import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatDaf } from "@/lib/daf";
import { masechetName } from "@/lib/posts";
import { sessionClient } from "@/lib/supabase-server";
import { loadStatus } from "@/lib/status-admin";
import { PHASE_TITLES, type Phase, type StatusCard } from "@/lib/status-agent";
import { SITE_LABEL, STEPS, WHATSAPP_LABEL, currentStep } from "@/lib/status-state";
import { approveAction, approveContent, editCard, markShared, prepareStatus } from "./actions";
import { ShareTools } from "./ShareTools";
import admin from "../../../admin.module.css";
import styles from "./status.module.css";

export const dynamic = "force-dynamic";

const ALT_NAME = { a: "חלופה א", b: "חלופה ב" } as const;

function heading(card: Partial<StatusCard>) {
  const phase = card.phase ? PHASE_TITLES[card.phase as Phase] : "";
  if (!phase) return card.title ?? "";
  return card.title && card.title !== phase ? `${phase}: ${card.title}` : phase;
}

export default async function StatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string; alt?: string; confirm?: string }>;
}) {
  const { id } = await params;
  const { msg, error, alt: altParam, confirm } = await searchParams;
  const db = await sessionClient();
  const s = await loadStatus(db, id);
  if (!s) notFound();
  const { post, version, current, summary } = s;
  const published = post.publish_state === "published" && version;
  const { step, next } = currentStep(summary);

  const approved = current?.alternatives.find((a) => a.id === summary.approvedAlternativeId);
  const label = altParam === "b" || altParam === "a" ? altParam : (approved?.label ?? "a");
  const alt = current?.alternatives.find((a) => a.label === label);
  const locked = summary.content === "action_approved" || summary.content === "content_approved";
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const postUrl = `${origin}/posts/${post.slug}?src=status`;
  const m = masechetName(post.masechtot);

  return (
    <main className={admin.pageWide}>
      <p>
        <Link href="/admin/posts">› לרשימת הפוסטים</Link>
      </p>
      <h1>
        סטטוס: {m ? `מסכת ${m}, דף ${formatDaf(post.daf)}` : version?.title}
        {version ? <span className="muted"> (גרסה {version.version_no})</span> : null}
      </h1>
      {msg && <p className={admin.message} role="status">{msg}</p>}
      {error && <p className={admin.error} role="alert">{error}</p>}

      {!published ? (
        <p>אפשר להכין סטטוס רק לפוסט שפורסם.</p>
      ) : (
        <>
          <ol className={styles.steps} aria-label="שלבים">
            {STEPS.map((name, i) => {
              const cls = i < step ? styles.done : i === step ? styles.now : "";
              return (
                <li key={name} className={cls} aria-current={i === step ? "step" : undefined}>
                  <span>{i < step ? "✓" : i + 1}</span>
                  {name}
                </li>
              );
            })}
          </ol>
          <div className={styles.next}>
            <p style={{ margin: 0 }}>
              <strong>הצעד הבא:</strong> {next}
            </p>
            <div className={styles.pills}>
              <span className={styles.pill}>
                אתר: <strong>{SITE_LABEL[summary.site]}</strong>
              </span>
              <span className={styles.pill}>
                וואטסאפ: <strong>{WHATSAPP_LABEL[summary.whatsapp]}</strong>
                {s.sharedAt ? ` (${new Date(s.sharedAt).toLocaleDateString("he-IL")})` : ""}
              </span>
            </div>
          </div>

          {!current ? (
            <form action={prepareStatus.bind(null, id)}>
              <button className={admin.primary}>{summary.content === "needs_review" ? "הכן מחדש" : "הכנת חלופות"}</button>
            </form>
          ) : (
            <>
              <div className={styles.tabs} role="group" aria-label="בחירת חלופה">
                {current.alternatives.map((a) => (
                  <Link key={a.id} className={styles.tab} href={`?alt=${a.label}`} aria-current={a.label === label ? "true" : undefined}>
                    {ALT_NAME[a.label]}
                    {a.id === summary.approvedAlternativeId ? " ✓" : ""}
                  </Link>
                ))}
              </div>
              {alt && (
                <div className={styles.cards}>
                  {alt.cards.map((c, i) => {
                    const total = alt.cards.length;
                    const phase = (c.phase ?? "middle") as Phase;
                    const edit = (kind: "option" | "move" | "delete") => editCard.bind(null, id, alt.id, i, kind);
                    return (
                      <article key={i} className={`${styles.card} ${styles[phase]}`}>
                        <div className={styles.cardHead}>
                          <strong>{heading(c)}</strong>
                          <span className="muted">
                            {i + 1} מתוך {total}
                          </span>
                        </div>
                        <p className={styles.cardText}>{c.text}</p>
                        <div className={styles.strip} aria-hidden="true">
                          {alt.cards.map((_, j) => (
                            <i key={j} className={j <= i ? "on" : ""} />
                          ))}
                        </div>
                        <form className={styles.cardActions}>
                          <button formAction={edit("option")} disabled={!c.options?.length} aria-label={`ניסוח אחר לכרטיס ${i + 1}`}>
                            ניסוח אחר
                          </button>
                          <button formAction={edit("move")} aria-label={`הזזת כרטיס ${i + 1} מקום אחד קדימה`}>
                            הזזה
                          </button>
                          <button formAction={edit("delete")} disabled={total <= 3} aria-label={`מחיקת כרטיס ${i + 1}`}>
                            מחיקה
                          </button>
                        </form>
                      </article>
                    );
                  })}
                </div>
              )}
              {locked && <p className="muted">תיקון של כרטיס מבטל את האישור, וצריך לאשר מחדש.</p>}

              {alt && summary.content !== "content_approved" && summary.content !== "action_approved" && (
                <div className={styles.footer}>
                  <form action={approveContent.bind(null, id, alt.id)}>
                    <button className={admin.primary}>אישור התוכן של {ALT_NAME[alt.label]}</button>
                  </form>
                  <span className="muted">אישור התוכן עדיין לא מציג ולא משתף דבר.</span>
                </div>
              )}

              {approved && summary.content === "content_approved" &&
                (confirm ? (
                  <section className={styles.confirm} aria-label="אישור הפעולה">
                    <h2>מה יקרה באישור הפעולה</h2>
                    <dl>
                      <dt>פוסט</dt>
                      <dd>{version.title}</dd>
                      <dt>גרסה</dt>
                      <dd>{version.version_no}</dd>
                      <dt>חלופה</dt>
                      <dd>{ALT_NAME[approved.label]}, {approved.cards.length} כרטיסים</dd>
                      <dt>יעד</dt>
                      <dd>הצגת הסטטוס באתר, בעמוד הפוסט ובבית</dd>
                    </dl>
                    <div className={styles.share}>
                      <div>
                        <form action={approveAction.bind(null, id, approved.id)}>
                          <button className={admin.primary}>אישור הפעולה</button>
                        </form>
                        <Link className={admin.secondary} href={`?alt=${approved.label}`}>
                          ביטול
                        </Link>
                      </div>
                    </div>
                  </section>
                ) : (
                  <div className={styles.footer}>
                    <Link className={admin.primary} href={`?alt=${approved.label}&confirm=1`}>
                      לאישור הפעולה
                    </Link>
                    <button className={admin.secondary} disabled>
                      הורדה כתמונות
                    </button>
                  </div>
                ))}

              {approved && summary.content === "action_approved" && (
                <>
                  <ShareTools cards={approved.cards} postTitle={version.title} postUrl={postUrl} />
                  <div className={styles.footer}>
                    {summary.whatsapp === "shared" ? (
                      <span>
                        <strong>סומן כשותף.</strong>
                      </span>
                    ) : (
                      <form action={markShared.bind(null, id)}>
                        <button className={admin.primary}>סימון כשותף</button>
                      </form>
                    )}
                    <span className="muted">ההעלאה לסטטוס בוואטסאפ ידנית, מהטלפון.</span>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
