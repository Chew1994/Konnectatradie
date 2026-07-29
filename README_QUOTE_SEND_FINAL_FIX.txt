QUOTE SEND FINAL FIX

Fixes:
- Quotes not submitting
- Quotes not appearing in Quotes Sent
- No confirmation after sending
- Avoids risky owner_id/profile_id detection

What happens now:
- Send quote
- Button shows "Sending quote..."
- Quote is inserted
- Data refreshes
- User is taken to Quotes Sent
- Success popup/message should show "Quote sent."

No SQL needed unless Supabase gives an RLS/permission error.
If that happens, run OPTIONAL_QUOTE_POLICY_FIX.sql.
