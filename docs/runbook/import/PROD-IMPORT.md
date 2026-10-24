<div dir="rtl">

# ייבוא הפוסטים לייצור

העתקה חד פעמית של 68 הפוסטים המיובאים ו-54 תמונות הגמרא מפרויקט הבדיקות לפרויקט הייצור. פרויקט הבדיקות הוא המקור, כי שם הגוף כבר כולל את העיצוב (מודגש, נטוי, קישורים). פוסטים שנוצרו בבדיקות (בכורות דף לא, פוסט הדוגמה) לא מועתקים.

## לפני
1. בפרויקט הייצור, ב-SQL Editor: הרצת `prod-setup-0001-0005.sql` (מיגרציות 0001 עד 0005 ברצף), פעם אחת.
2. משתני סביבה (לא בקוד ולא בצ'אט): `TEST_SUPABASE_URL`, `TEST_SUPABASE_SECRET_KEY`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_SECRET_KEY`.

## הרצה
מתיקיית המאגר, אחרי `npm install`:

    node docs/runbook/import/copy-posts-test-to-prod.mjs <posts.json> <posts2.json>          # בדיקה יבשה, לא כותב
    node docs/runbook/import/copy-posts-test-to-prod.mjs <posts.json> <posts2.json> --run    # כתיבה לייצור, כטיוטות

`--publish` מעלה אותם כמפורסמים במקום טיוטות. פוסט שכבר קיים בייצור (לפי slug) מדולג, כך שאפשר להריץ שוב.
הסקריפט עוצר אם רשימת המסכתות שונה בין הפרויקטים, כי ה-slug כולל את מספר המסכת.

## אחרי
`check-prod-import.sql` ב-SQL Editor של הייצור. מצופה: 68 פוסטים, 68 גרסאות, 54 תמונות, 34 פוסטים עם תמונות.
</div>
