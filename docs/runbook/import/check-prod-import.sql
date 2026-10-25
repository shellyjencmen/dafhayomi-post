-- בדיקה אחרי הייבוא בייצור. מצופה: 68 פוסטים, 68 גרסאות, 54 תמונות, 34 פוסטים עם תמונות.
select
  (select count(*) from posts) as posts,
  (select count(*) from post_versions) as versions,
  (select count(*) from gemara_pages) as images,
  (select count(distinct post_id) from gemara_pages) as posts_with_images,
  (select count(*) from posts where current_version_id is null) as missing_version;
