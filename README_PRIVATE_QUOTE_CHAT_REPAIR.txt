KonnectATradie private quote chat repair
========================================

Changed files
-------------
- supabase/migrations/202609020001_quote_scoped_marketplace_messages.sql
- src/main.jsx
- src/theme.css
- netlify/functions/notify-email.js

Deployment order
----------------
1. Commit or otherwise preserve the current local worktree.
2. Run the new migration in the Supabase SQL Editor.
3. Verify the migration query below.
4. Deploy the frontend and Netlify function immediately after the migration.
5. Run the private-chat tests below.

Migration verification
----------------------
select
  count(*) filter (where job_post_id is not null and quote_id is null)
    as unsafe_marketplace_messages,
  count(*) filter (where job_post_id is not null and quote_id is not null)
    as scoped_marketplace_messages,
  count(*) filter (where job_request_id is not null and quote_id is null)
    as direct_booking_messages
from public.job_messages;

Expected: unsafe_marketplace_messages = 0.

Security tests
--------------
1. Customer creates a job.
2. Tradesperson A and Tradesperson B each submit a quote.
3. Customer opens A's private chat and sends an A-only message.
4. Customer opens B's private chat and sends a B-only message.
5. A can read/reply only to A's conversation.
6. B can read/reply only to B's conversation.
7. Customer can switch between both conversations.
8. Accept A's quote; A's conversation remains available.
9. B must never see A's messages.
10. Confirm direct-booking chat still works after a booking is accepted.

Visual checks
-------------
- Public profile empty Customer Reviews text is clearly readable.
- Public search-card review/photo/verification metadata is clearly readable.

Rollback note
-------------
Do not drop quote_id after new quote-scoped messages exist. If deployment must
be rolled back, restore the previous frontend and policies from the verified
database/code backup, or prepare a data-aware rollback migration first.
