
-- ACCEPTED / COMPLETED JOB LIFECYCLE SAFETY FIX
-- Run this only if "Mark completed" gives a check constraint error.
-- Safe to run multiple times.

alter table job_quotes drop constraint if exists job_quotes_status_check;
alter table job_quotes
add constraint job_quotes_status_check
check (status in ('pending','accepted','declined','rescinded','completed'));

alter table job_posts drop constraint if exists job_posts_status_check;
alter table job_posts
add constraint job_posts_status_check
check (status in ('open','quote_accepted','declined','closed','completed'));
