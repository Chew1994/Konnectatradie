import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 400, body: JSON.stringify({ error: "Stripe is not configured yet." }) };
    const { jobRequestId } = JSON.parse(event.body || "{}");
    const { data: job, error } = await supabaseAdmin.from("job_requests").select("id, deposit_amount_eur, trade, county").eq("id", jobRequestId).single();
    if (error || !job) return { statusCode: 404, body: JSON.stringify({ error: "Job request not found" }) };
    const siteUrl = process.env.URL || "http://localhost:8888";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", unit_amount: Number(job.deposit_amount_eur || 5) * 100, product_data: { name: "KonnectATradie booking fee", description: `${job.trade || "Trade"} request in ${job.county || "Ireland"}` } }, quantity: 1 }],
      metadata: { job_request_id: job.id },
      success_url: `${siteUrl}/?payment=success&job=${job.id}`,
      cancel_url: `${siteUrl}/?payment=cancelled&job=${job.id}`
    });
    await supabaseAdmin.from("job_requests").update({ stripe_checkout_session_id: session.id }).eq("id", job.id);
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
