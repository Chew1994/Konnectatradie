# KonnectATradie Go-Live Checklist

## Database
- Run `GOLIVE_TRUST_UPGRADE.sql`
- Confirm these tables exist:
  - profiles
  - tradesperson_profiles
  - tradesperson_documents
  - portfolio_photos
  - job_requests
  - job_posts
  - job_quotes
  - job_messages
  - reviews

## Supabase Storage
Confirm buckets exist:
- portfolio — public
- verification-documents — private

## Authentication
For launch testing:
- Email confirmation can be off
For public launch:
- Turn email confirmation on
- Add proper email provider / higher email limits

## Admin
Create or mark your own account as:
```sql
update profiles
set role = 'admin'
where email = 'YOUR_EMAIL_HERE';
```

## Tradesperson verification
Ask tradespeople to upload:
- public liability insurance
- trade certificates
- ID / vetting document where relevant
- licence number if applicable

## Launch safety
- Do not show exact customer addresses publicly
- Use county/town until job is accepted
- Manually verify first tradespeople before approving public listing
