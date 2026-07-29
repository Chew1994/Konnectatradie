BOOKING REQUEST FIX

This fixes:
- new row for relation "job_requests" violates check constraint "job_requests_deposit_status_check"

Do this:
1. Deploy this folder to Netlify.
2. Hard refresh.
3. Try request booking again.

If it still fails:
4. Run BOOKING_REQUEST_FIX_RUN_IF_NEEDED.sql in Supabase SQL Editor.
