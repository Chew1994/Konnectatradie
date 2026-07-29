import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function handler(event) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return { statusCode: 200, body: "Webhook not configured" };
  const sig = event.headers["stripe-signature"];
  let stripeEvent;
  try { stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (err) { return { statusCode: 400, body: `Webhook Error: ${err.message}` }; }
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const jobRequestId = session.metadata?.job_request_id;
    if (jobRequestId) {
      await supabaseAdmin.from("job_requests").update({ deposit_status: "paid", status: "accepted", stripe_checkout_session_id: session.id }).eq("id", jobRequestId);
    }
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
