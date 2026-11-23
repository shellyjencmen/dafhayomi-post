-- One optional video link per post version (PRD addition, 22.11.2026). Part of the version, like the title and body.
-- A YouTube link shows as a player on the post page; any other https link shows as a "watch the video" button.
alter table post_versions add column video_url text
  check (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 500));
