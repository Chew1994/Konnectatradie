ACCEPTED / COMPLETED JOBS LIFECYCLE

Adds:
- Accepted customer quote jobs now show under Accepted Jobs
- Active quote snapshot only shows pending/open quotes
- Accepted quote jobs have Open chat + Mark completed
- Completed jobs section added
- Completed stat added to dashboard cards

No SQL needed unless Mark completed gives a constraint error.
If that happens, run OPTIONAL_COMPLETED_STATUS_SQL.sql in Supabase.
