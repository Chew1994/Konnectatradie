FINAL PROFILE FIX

Do this in this order:
1. Run FINAL_PROFILE_FIX_RUN_THIS.sql in Supabase SQL Editor.
2. Deploy this unzipped folder to Netlify.
3. Hard refresh.
4. Test signup with a brand new email.

This fixes:
- Profile loading after signup
- Missing profile rows
- RLS blocking profile read/create
- Dashboard stuck after account creation
