EMERGENCY ROLLBACK PACKAGE

This restores the last confirmed stable version with:
- Reviews UI
- Tradesperson profile page
- Mobile polish
- Hamburger navigation
- Quotes Sent working

Do this now:
1. Deploy this unzipped folder to Netlify.
2. Hard refresh.
3. Confirm the site loads.
4. If signup still says "Profile could not load", run EMERGENCY_PROFILE_RLS_FIX.sql in Supabase SQL Editor.

No code signup/profile experiments are included in this rollback.
