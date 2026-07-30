import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
function getBearerToken(event) {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization;

  if (!auth?.startsWith("Bearer ")) {
    return null;
  }

  return auth.slice(7);
}

async function authenticateUser(event) {
  const token = getBearerToken(event);
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !url || !serviceKey) {
    return null;
  }

  const result = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!result.ok) {
    return null;
  }

  return result.json();
}


export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    const user = await authenticateUser(event);

  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "Authentication required."
      })
    };
  }
  try {
    if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 400, body: JSON.stringify({ error: "Stripe is not configured yet." }) };
    const { jobRequestId } = JSON.parse(event.body || "{}");
    const { data: job, error } = await supabaseAdmin.from("job_requests").select("id, customer_id, deposit_amount_eur, trade, county").eq("id", jobRequestId).single();
    if (error || !job) return { statusCode: 404, body: JSON.stringify({ error: "Job request not found" }) };
    if (job.customer_id !== user.id) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      error: "You are not allowed to create checkout for this booking request."
    })
  };
}
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
