"""Build the email draft for a post (MVP2 pilot, Issue #106).

Input: the JSON of GET /api/posts/<slug> plus the masechet name.
Output: subject, HTML body (RTL) and plain text body, as approved by Shelly on 29.10.2026:
  subject  "רעיון אחד על הדף היומי, כל שבוע - <masechet> <daf> - <title>"
  opening  the title only, then the full post as written, then a link to the post with ?src=email.
Internal lines such as "עמוד א׳" at the end of the body are left out.
The script only builds text. It never creates or sends an email.

Usage: python3 -I build_email.py post.json "בכורות" https://<site> > email.json
"""
import html
import json
import re
import sys

SUBJECT_PREFIX = "רעיון אחד על הדף היומי, כל שבוע"
LINK_TEXT = "אפשר לראות את הפוסט עם דפי הגמרא באתר"
LETTERS = [("ק", 100), ("צ", 90), ("פ", 80), ("ע", 70), ("ס", 60), ("נ", 50), ("מ", 40), ("ל", 30), ("כ", 20),
           ("י", 10), ("ט", 9), ("ח", 8), ("ז", 7), ("ו", 6), ("ה", 5), ("ד", 4), ("ג", 3), ("ב", 2), ("א", 1)]
INTERNAL_LINE = re.compile(r"^עמוד\s*[אב][׳']?$")
INLINE = re.compile(r"\[([^\]\n]+)\]\((https?://[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*")


def format_daf(n):
    """31 -> ל"א, 2 -> ב', 15 -> ט"ו (same letters as src/lib/daf.ts, with gershayim)."""
    out, rest = "", n
    for letter, value in LETTERS:
        while rest >= value:
            out += letter
            rest -= value
    out = re.sub("יה$", "טו", out)
    out = re.sub("יו$", "טז", out)
    return out + "'" if len(out) == 1 else out[:-1] + '"' + out[-1]


def subject(masechet, daf, title):
    return f"{SUBJECT_PREFIX} - {masechet} {format_daf(daf)} - {title.strip()}"


def paragraphs(body):
    paras = [p.strip() for p in body.replace("\r\n", "\n").split("\n\n") if p.strip()]
    while paras and INTERNAL_LINE.match(paras[-1]):
        paras.pop()
    return paras


def inline_html(text):
    out, rest = "", text
    while rest:
        m = INLINE.search(rest)
        if not m:
            return out + html.escape(rest)
        out += html.escape(rest[: m.start()])
        if m.group(2):
            out += f'<a href="{html.escape(m.group(2))}">{inline_html(m.group(1))}</a>'
        elif m.group(3) is not None:
            out += f"<b>{inline_html(m.group(3))}</b>"
        else:
            out += f"<i>{inline_html(m.group(4))}</i>"
        rest = rest[m.end():]
    return out


def inline_text(text):
    return INLINE.sub(lambda m: m.group(1) or f"*{m.group(3) or m.group(4)}*", text)


def build(post, masechet, site_url):
    link = f"{site_url.rstrip('/')}/posts/{post['slug']}?src=email"
    paras = paragraphs(post["body"])
    body_html = "".join("<p>" + "<br>".join(inline_html(l) for l in p.split("\n")) + "</p>" for p in paras)
    html_body = (
        '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;max-width:640px">'
        f"<h2>{html.escape(post['title'].strip())}</h2>{body_html}"
        f'<p><a href="{html.escape(link)}">{LINK_TEXT}</a></p></div>'
    )
    text_body = "\n\n".join([post["title"].strip(), *(inline_text(p) for p in paras), f"{LINK_TEXT}\n{link}"])
    return {
        "post_version_id": post["post_version_id"],
        "subject": subject(masechet, post["daf"], post["title"]),
        "html": html_body,
        "text": text_body,
        "link": link,
    }


if __name__ == "__main__":
    post_file, masechet, site = sys.argv[1:4]
    with open(post_file, encoding="utf-8") as f:
        post = json.load(f)
    json.dump(build(post, masechet, site), sys.stdout, ensure_ascii=False, indent=1)
