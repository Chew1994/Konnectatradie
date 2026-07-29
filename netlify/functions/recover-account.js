
const headers = { "Content-Type": "application/json" };

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function sendEmail(to, loginEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL || "KonnectATradie <onboarding@resend.dev>";

  if (!apiKey) return { skipped: true };

  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your KonnectATradie login email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111827">
          <div style="font-weight:800;font-size:20px;margin-bottom:20px">KonnectATradie</div>
          <h1 style="font-size:28px;margin:0 0 12px">Login email reminder</h1>
          <p style="font-size:16px;line-height:1.55;color:#4b5563">The email used to log in to your KonnectATradie account is:</p>
          <div style="font-size:20px;font-weight:800;background:#fff7ed;border:1px solid #fed7aa;padding:16px;border-radius:12px">${loginEmail}</div>
          <p style="font-size:13px;color:#6b7280;margin-top:20px">If you did not request this reminder, you can ignore this email.</p>
        </div>
      `
    })
  });

  if (!result.ok) throw new Error(await result.text());
  return result.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Method not allowed" });
  }

  const genericMessage = "If the details match an account, a login reminder has been sent to the registered email address.";

  try {
    const { fullName, phone } = JSON.parse(event.body || "{}");
    if (!fullName || !phone) return response(400, { message: "Full name and phone number are required." });

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return response(200, { message: genericMessage });

    const params = new URLSearchParams({
      select: "id,email,full_name,phone",
      full_name: `ilike.*${String(fullName).trim()}*`,
      phone: `eq.${String(phone).trim()}`
    });

    const result = await fetch(`${url}/rest/v1/profiles?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!result.ok) return response(200, { message: genericMessage });

    const rows = await result.json();
    const profile = rows[0];

    if (profile?.email) {
      await sendEmail(profile.email, profile.email);
    }

    return response(200, { message: genericMessage });
  } catch (error) {
    console.error(error);
    return response(200, { message: genericMessage });
  }
};
