QUOTE SEND UNSTICK FIX

Fixes:
- Send quote button stuck on "Sending quote..."
- No confirmation after quote submit
- No page shift to Quotes Sent

What now happens:
- Button shows "Sending quote..."
- If Supabase hangs, it times out after 12 seconds with a clear message
- If insert succeeds, page immediately moves to Quotes Sent
- Data refreshes in the background

No SQL needed unless you receive a Supabase permission/RLS error.
If you see an RLS/permission error, run OPTIONAL_QUOTE_POLICY_FIX.sql.
