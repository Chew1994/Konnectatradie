
const headers = { "Content-Type": "application/json" };
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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function supabaseRows(table, query = "") {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  const result = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!result.ok) {
    throw new Error(`Supabase lookup failed for ${table}: ${await result.text()}`);
  }

  return result.json();
}

async function profileById(id) {
  if (!id) return null;
  const rows = await supabaseRows("profiles", `id=eq.${encodeURIComponent(id)}&select=id,email,full_name,role`);
  return rows[0] || null;
}

async function tradieById(id) {
  if (!id) return null;
  const rows = await supabaseRows("tradesperson_profiles", `id=eq.${encodeURIComponent(id)}&select=id,user_id,business_name,contact_name`);
  return rows[0] || null;
}

async function jobById(id) {
  if (!id) return null;
  const rows = await supabaseRows("job_posts", `id=eq.${encodeURIComponent(id)}&select=*`);
  return rows[0] || null;
}

async function quoteById(id) {
  if (!id) return null;
  const rows = await supabaseRows("job_quotes", `id=eq.${encodeURIComponent(id)}&select=*`);
  return rows[0] || null;
}

async function jobRequestById(id) {
  if (!id) return null;
  const rows = await supabaseRows("job_requests", `id=eq.${encodeURIComponent(id)}&select=*`);
  return rows[0] || null;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL || "KonnectATradie <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return { skipped: true, reason: !apiKey ? "RESEND_API_KEY missing" : "Recipient missing" };
  }

  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  if (!result.ok) {
    throw new Error(`Email provider error: ${await result.text()}`);
  }

  return result.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Method not allowed" });
  }

  try {
    const user = await authenticateUser(event);

    if (!user) {
      return response(401, { message: "Authentication required." });
    }

    const body = JSON.parse(event.body || "{}");
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://konnectatradie.netlify.app";

    let recipient = null;
    let subject = "KonnectATradie notification";
    let title = "You have a new update";
    let detail = "Log in to your dashboard to view the latest update.";

    if (body.event === "quote_received") {
  const quote = await quoteById(body.quoteId);

  if (!quote) {
    return response(404, { message: "Quote not found." });
  }

  const tradie = await tradieById(quote.tradesperson_id);

  if (!tradie || tradie.user_id !== user.id) {
    return response(403, { message: "You are not allowed to send this notification." });
  }

  if (body.jobPostId && quote.job_post_id !== body.jobPostId) {
    return response(400, { message: "Quote and job do not match." });
  }

  const job = await jobById(quote.job_post_id);

  if (!job) {
    return response(404, { message: "Job not found." });
  }

  recipient =
    job.customer_email ||
    (await profileById(job.customer_id))?.email;

  subject = "New quote received on KonnectATradie";
  title = `A tradesperson quoted on ${job.job_title || "your job"}`;
  detail =
    "Review the quote, ask questions and accept or decline it from your dashboard.";
}

if (body.event === "quote_accepted") {
  const quote = await quoteById(body.quoteId);

  if (!quote) {
    return response(404, {
      message: "Quote not found."
    });
  }

  const tradie = await tradieById(quote.tradesperson_id);

  if (!tradie) {
    return response(404, {
      message: "Tradesperson not found."
    });
  }

  if (body.jobPostId && quote.job_post_id !== body.jobPostId) {
  return response(400, {
    message: "Quote and job do not match."
  });
}

const job = await jobById(quote.job_post_id);

  if (job.customer_id !== user.id) {
    return response(403, {
      message: "You are not allowed to send this notification."
    });
  }

  recipient = (await profileById(tradie.user_id))?.email;
  subject = "Your quote was accepted";
  title = `Your quote for ${job?.job_title || "a customer job"} was accepted`;
  detail = "Open the job chat to arrange timing, access and the final details.";
}
if (body.event === "booking_request") {
  const request = await jobRequestById(body.requestId);

  if (!request) {
    return response(404, {
      message: "Booking request not found."
    });
  }

  if (request.customer_id !== user.id) {
    return response(403, {
      message: "You are not allowed to send this notification."
    });
  }

  const tradie = await tradieById(request.tradesperson_id);

  if (!tradie) {
    return response(404, {
      message: "Tradesperson not found."
    });
  }

  recipient = (await profileById(tradie.user_id))?.email;
  subject = "New booking request";
  title = `You received a new ${request?.trade || "job"} booking request`;
  detail = "Open your dashboard to review and respond to the customer.";
}

  if (body.event === "message_received") {
  const job = await jobById(body.jobPostId);

  if (!job) {
    return response(404, {
      message: "Job not found."
    });
  }

  const acceptedQuotes = await supabaseRows(
    "job_quotes",
    `job_post_id=eq.${encodeURIComponent(job.id)}&status=eq.accepted&select=id,tradesperson_id&limit=1`
  );

  const acceptedQuote = acceptedQuotes[0];

  if (!acceptedQuote) {
    return response(404, {
      message: "Accepted quote not found."
    });
  }

  const tradie = await tradieById(acceptedQuote.tradesperson_id);

  if (!tradie) {
    return response(404, {
      message: "Tradesperson not found."
    });
  }

  const isCustomer = job.customer_id === user.id;
  const isTradie = tradie.user_id === user.id;

  if (!isCustomer && !isTradie) {
    return response(403, {
      message: "You are not allowed to send this notification."
    });
  }

  const recipientUserId = isCustomer
    ? tradie.user_id
    : job.customer_id;

  const recipientProfile = await profileById(recipientUserId);

  if (!recipientProfile) {
    return response(404, {
      message: "Recipient not found."
    });
  }

  recipient = recipientProfile.email;
  subject = "New message on KonnectATradie";
  title = `New message about ${job.job_title || "your job"}`;

  const cleanMessage = String(body.messageText || "").slice(0, 220);

  detail = cleanMessage
    ? `Message preview: ${cleanMessage}`
    : "Open the job chat to read and reply.";
}

if (body.event === "direct_message_received") {
  const request = await jobRequestById(body.jobRequestId);

  if (!request) {
    return response(404, { message: "Booking request not found." });
  }

  const status = request.lifecycle_status || request.status;
  if (!["accepted", "in_progress", "completed", "reviewed"].includes(status)) {
    return response(403, { message: "This booking conversation is not available." });
  }

  const tradie = await tradieById(request.tradesperson_id);
  if (!tradie) {
    return response(404, { message: "Tradesperson not found." });
  }

  const isCustomer = request.customer_id === user.id;
  const isTradie = tradie.user_id === user.id;
  if (!isCustomer && !isTradie) {
    return response(403, { message: "You are not allowed to send this notification." });
  }

  const recipientUserId = isCustomer ? tradie.user_id : request.customer_id;
  const recipientProfile = await profileById(recipientUserId);
  if (!recipientProfile) {
    return response(404, { message: "Recipient not found." });
  }

  recipient = recipientProfile.email;
  subject = "New direct booking message on KonnectATradie";
  title = `New message about your ${request.trade || "direct booking"}`;

  const cleanMessage = String(body.messageText || "").slice(0, 220);
  detail = cleanMessage
    ? `Message preview: ${cleanMessage}`
    : "Open the direct booking conversation to read and reply.";
}

    if (!recipient) {
      return response(202, { message: "Notification recorded, but no recipient email was found." });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111827">
        <div style="font-weight:800;font-size:20px;margin-bottom:20px">KonnectATradie</div>
        <h1 style="font-size:28px;margin:0 0 12px">${title}</h1>
        <p style="font-size:16px;line-height:1.55;color:#4b5563">${detail}</p>
        <a href="${siteUrl}/#dashboard" style="display:inline-block;background:#f97316;color:white;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;margin-top:12px">Open dashboard</a>
        <p style="font-size:12px;color:#9ca3af;margin-top:28px">You received this because your email is registered with KonnectATradie.</p>
      </div>
    `;

    const sent = await sendEmail({ to: recipient, subject, html });
    return response(200, { message: sent.skipped ? "Email service not configured yet." : "Notification email sent.", sent });
  } catch (error) {
    console.error(error);
    return response(500, { message: error.message || "Notification failed." });
  }
};
