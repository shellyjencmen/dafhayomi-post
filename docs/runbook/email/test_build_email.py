"""Unit tests for build_email.py. Run: python3 -m unittest docs/runbook/email/test_build_email.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from build_email import build, format_daf, subject  # noqa: E402

POST = {
    "slug": "qa-email-test",
    "post_version_id": "v-1",
    "daf": 31,
    "title": " QA-חברים ",
    "body": 'פתיחה עם "מרכאות" & <תג>.\n\n**מודגש** ורגיל *נטוי*\nשורה שנייה\n\nשבת שלום ❤️\n\nעמוד א׳',
}
SITE = "https://example.test/"


class BuildEmailTest(unittest.TestCase):
    def setUp(self):
        self.email = build(POST, "בכורות", SITE)

    def test_daf_letters(self):
        self.assertEqual(format_daf(31), 'ל"א')
        self.assertEqual(format_daf(2), "ב'")
        self.assertEqual(format_daf(15), 'ט"ו')
        self.assertEqual(format_daf(16), 'ט"ז')
        self.assertEqual(format_daf(120), 'ק"כ')

    def test_subject(self):
        self.assertEqual(self.email["subject"], 'רעיון אחד על הדף היומי, כל שבוע - בכורות ל"א - QA-חברים')
        self.assertEqual(subject("ברכות", 2, "א"), "רעיון אחד על הדף היומי, כל שבוע - ברכות ב' - א")

    def test_opening_is_title_only(self):
        self.assertTrue(self.email["html"].startswith('<div dir="rtl"'))
        self.assertIn("<h2>QA-חברים</h2><p>פתיחה", self.email["html"])
        self.assertNotIn("רעיון אחד על הדף", self.email["html"])

    def test_body_verbatim_with_formatting(self):
        h = self.email["html"]
        self.assertIn("<b>מודגש</b> ורגיל <i>נטוי</i><br>שורה שנייה", h)
        self.assertIn("&quot;מרכאות&quot; &amp; &lt;תג&gt;", h)
        self.assertIn("שבת שלום ❤️", h)

    def test_internal_page_line_dropped(self):
        self.assertNotIn("עמוד א", self.email["html"])
        self.assertNotIn("עמוד א", self.email["text"])

    def test_link_with_src_email(self):
        self.assertEqual(self.email["link"], "https://example.test/posts/qa-email-test?src=email")
        self.assertTrue(self.email["html"].endswith(
            '<p><a href="https://example.test/posts/qa-email-test?src=email">אפשר לראות את הפוסט עם דפי הגמרא באתר</a></p></div>'))
        self.assertTrue(self.email["text"].endswith("?src=email"))

    def test_version_is_kept(self):
        self.assertEqual(self.email["post_version_id"], "v-1")

    def test_no_images(self):
        self.assertNotIn("<img", self.email["html"])


if __name__ == "__main__":
    unittest.main()
