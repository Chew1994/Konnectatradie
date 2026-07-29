KONNECTATRADIE MAP VIEW FULL REBUILD

This is a clean full package. It includes:
- Tangerine/black premium theme
- Filtered direct requests and quotes
- Quote accept + decline
- Customer Map
- Tradesperson Job Map
- Privacy-safe county-level map pins
- Existing bookings, profiles, reviews, chat and quotes

IMPORTANT:
Deploy the UNZIPPED folder itself.
When you unzip, you should see these files immediately:
- index.html
- package.json
- netlify.toml
- src folder
- netlify folder

Do NOT upload a folder that only contains another folder inside it.

Deploy steps:
1. Unzip this package.
2. Open the unzipped folder.
3. Confirm you can see index.html and package.json.
4. Drag THAT folder into Netlify Deploys.
5. Wait for deploy complete.
6. Hard refresh with Ctrl + F5.

No SQL needed if you already ran the full rebuild SQL.

Leaflet upgrade included:
- Real OpenStreetMap map
- Free Leaflet package
- County-level privacy-safe pins
- Click pins to filter results


PREMIUM BOOKING LIFECYCLE + EMAIL UPGRADE

New in this version:
- Booking fee language removed for launch
- Booking lifecycle:
  requested → accepted → in_progress → completed → reviewed
  or declined
- Premium status timeline on booking cards
- Action-driven buttons:
  Accept / Decline / Start job / Mark complete / Leave review prompt
- Email notification function added
- Customer/tradie notification panel added in dashboard

IMPORTANT:
Run BOOKING_LIFECYCLE_UPDATE.sql in Supabase before deploying this version.

Email setup:
Emails use Resend if these Netlify variables exist:
RESEND_API_KEY
EMAIL_FROM

If missing, the app still works but email sends are skipped.


ACTION FEEDBACK UPGRADE
- Tradesperson quote submission now changes to Quote sent ✓
- Quote form hides after submit
- Customer accept/decline buttons show Updating...
- Accepted/declined quotes show clear confirmation panels
- Booking lifecycle buttons show updating states
- Chat send button shows sending state


STABLE MINIMAL QUOTES SENT TAB
- Started from last stable action feedback package
- Does not alter Dashboard internals
- Adds a safe Quotes Sent tab
- Adds quote analytics graph and success rate
- Active quotes default filter
- Allows rescind pending quotes
- Allows bin declined/rescinded quotes
No SQL required.


EMERGENCY FIX
- Fixes blank Quotes Sent page.
- Cause: missing SmartActionNotice component.
- No SQL required.


QUOTE POLISH + CUSTOMER CLEANUP
- Tightened quote analytics styling
- Dashboard is focused on urgent requests, active quote snapshot, accepted jobs
- Customer quote screen now defaults to active quotes
- Customer quote screen has quote status summary and filters
- Declined/rescinded quotes are hidden unless selected
No SQL required.


MOBILE HAMBURGER NAV UPDATE
- Mobile nav now shows logo + hamburger button
- Menu opens as dropdown
- Desktop nav unchanged
No SQL required.


HOMEPAGE + ABOUT US UPGRADE
- New mission-led homepage hero
- Added About tab for logged-in users
- Added About Us page with mission and values
- Added How It Works section
No SQL required.


MOBILE POLISH UPGRADE
- Improved mobile tap targets
- Better card stacking
- Cleaner mobile dashboard spacing
- Improved chat/message layout
- Better mobile map height and results layout
- iPhone input zoom prevention
- Mobile form polish
No SQL required.


STRONG REVIEWS UI UPGRADE
- Search cards now show review count, rating, portfolio count and verified status
- Added full tradesperson profile page
- Added customer reviews section
- Added portfolio gallery on profile
- Added trust score cards
No SQL required.
