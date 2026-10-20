# שליפת פוסט לסוכנים

`GET /api/posts/<slug>` מחזיר פוסט שפורסם: `id`, `slug`, `post_version_id`, `version_no`, `title`, `body`, `summary`, `masechet_id`, `daf`, `published_on`, ו-`gemara_pages`.

- הנקודה פתוחה, כי היא מחזירה רק את מה שהאתר הציבורי מציג כבר (פוסט שפורסם, הגרסה הנוכחית שלו).
- טיוטה או פוסט שלא קיים: 404 עם `{"error":"not_found"}`.
- סוכן שמכין תוצר שומר את `post_version_id`. אישור תקף רק לגרסה הזו (חוק 3 בתפיסת הפתרון).
