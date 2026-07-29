import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !to) {
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    })
  });

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

function customerHtml(status, job, tradieName) {
  const titleMap = {
    requested: "Your booking request has been sent",
    accepted: "Your booking has been accepted",
    declined: "Your booking was declined",
    in_progress: "Your job has started",
    completed: "Your job has been marked complete",
    reviewed: "Thanks for leaving a review"
  };
  const bodyMap = {
    requested: `Your request for ${tradieName} has been sent. You can track it in your dashboard.`,
    accepted: `${tradieName} has accepted your job request. You can now arrange next steps.`,
    declined: `${tradieName} is not available for this job. You can post the job or contact another tradie.`,
    in_progress: `${tradieName} has marked the job as in progress.`,
    completed: `${tradieName} has marked the job complete. Please leave a review if everything is finished.`,
    reviewed: `Thank you for helping other customers by leaving a review.`
  };
  return `<h2>${titleMap[status] || "Booking update"}</h2><p>${bodyMap[status] || "Your booking has been updated."}</p><p><strong>Job:</strong> ${job.job_description || job.trade || "Job request"}</p><p><strong>County:</strong> ${job.county || ""}</p>`;
}

function tradieHtml(status, job, customerName) {
  const titleMap = {
    requested: "New booking request received",
    accepted: "Booking accepted",
    declined: "Booking declined",
    in_progress: "Job started",
    completed: "Job completed",
    reviewed: "Customer review received"
  };
  const bodyMap = {
    requested: `${customerName} has sent you a new booking request. Please accept or decline from your dashboard.`,
    accepted: `You accepted ${customerName}'s job request.`,
    declined: `You declined ${customerName}'s job request.`,
    in_progress: `You marked ${customerName}'s job as in progress.`,
    completed: `You marked ${customerName}'s job complete.`,
    reviewed: `${customerName} left a review.`
  };
  return `<h2>${titleMap[status] || "Booking update"}</h2><p>${bodyMap[status] || "A booking has been updated."}</p><p><strong>Job:</strong> ${job.job_description || job.trade || "Job request"}</p><p><strong>County:</strong> ${job.county || ""}</p>`;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const { jobRequestId, status } = JSON.parse(event.body || "{}");

    const { data: job, error } = await supabaseAdmin
      .from("job_requests")
      .select("*, tradesperson_profiles(business_name, user_id)")
      .eq("id", jobRequestId)
      .single();

    if (error || !job) return { statusCode: 404, body: JSON.stringify({ error: "Job not found" }) };

    const { data: customerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", job.customer_id)
      .maybeSingle();

    const { data: tradieProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", job.tradesperson_profiles?.user_id)
      .maybeSingle();

    const customerEmail = job.customer_email || customerProfile?.email;
    const customerName = job.customer_name || customerProfile?.full_name || "Customer";
    const tradieName = job.tradesperson_profiles?.business_name || "your tradesperson";
    const tradieEmail = tradieProfile?.email;

    const results = [];

    if (customerEmail) {
      results.push(await sendEmail({
        to: customerEmail,
        subject: `Booking update: ${String(status).replaceAll("_", " ")}`,
        html: customerHtml(status, job, tradieName)
      }));
    }

    if (tradieEmail) {
      results.push(await sendEmail({
        to: tradieEmail,
        subject: `KonnectATradie booking update: ${String(status).replaceAll("_", " ")}`,
        html: tradieHtml(status, job, customerName)
      }));
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, results }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
