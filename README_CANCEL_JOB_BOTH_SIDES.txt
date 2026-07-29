CANCEL JOB BOTH SIDES

Adds:
- Pending quote: Rescind quote
- Accepted quote/job: Cancel job
- Tradesperson can cancel if customer is not proceeding after discussion
- Customer can cancel accepted job and choose another quote
- Cancelled status display and filter support
- Job post resets to open after cancellation so customer can accept another quote

No SQL needed unless Supabase gives a status constraint error.
If needed, run OPTIONAL_CANCELLED_STATUS_SQL.sql.
