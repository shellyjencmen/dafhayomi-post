# חשבון הבעלים

אין הרשמה פתוחה. החשבון של אבי נוצר ידנית, בכל סביבה בנפרד.

1. ב-Supabase: Authentication, Users, Add user. אימייל וסיסמה, עם סימון Auto Confirm User.
2. ב-SQL Editor, הרצת השאילתה (עם האימייל של אבי):

       update profiles set role = 'owner'
       where id = (select id from auth.users where email = 'EMAIL_HERE');

3. כניסה ב-`/login`. אחרי כניסה מגיעים ל-`/admin`.

חשבון בלי role = owner מופנה חזרה לכניסה. הסיסמה לא נשלחת בצ'אט ולא נשמרת במאגר.
