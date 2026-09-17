function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function firstItem(items) {
  return Array.isArray(items) && items.length ? items[0] : {};
}

function bookingSummary(booking) {
  const items = Array.isArray(booking.items_json) ? booking.items_json : [];
  const item = firstItem(items);
  return {
    ref: booking.ref || "—",
    name: booking.customer_name || "Guest",
    phone: booking.customer_phone || "—",
    altPhone: booking.alt_phone || "",
    city: booking.city || item.city || "—",
    total: formatINR(booking.total),
    event: item.eventType || "Custom Celebration",
    date: item.eventDate || "—",
    time: item.timeSlot || "Not specified",
    venue: item.address || "Not specified",
    location: item.locationType || "Not specified",
    notes: booking.notes || item.notes || "",
    items,
  };
}

function plainText(booking) {
  const s = bookingSummary(booking);
  const lines = [
    "NEW BOOKING RECEIVED",
    "",
    `Booking Reference: ${s.ref}`,
    `Customer: ${s.name}`,
    `Phone: ${s.phone}`,
    s.altPhone ? `Alternate Phone: ${s.altPhone}` : null,
    `Event: ${s.event}`,
    `Date: ${s.date}`,
    `Time: ${s.time}`,
    `Venue: ${s.venue}`,
    `Location: ${s.location}`,
    `City: ${s.city}`,
    `Estimated Total: ${s.total}`,
    s.notes ? `Notes: ${s.notes}` : null,
    "",
    "Booking details:",
    ...s.items.map((item) => {
      const addons = Array.isArray(item.addons) && item.addons.length
        ? ` | Add-ons: ${item.addons.map((a) => a.name).join(", ")}`
        : "";
      return `- ${item.name || "Event item"} ×${item.quantity || 1}${addons}`;
    }),
  ];
  return lines.filter((line) => line !== null).join("\n");
}

function html(booking) {
  const s = bookingSummary(booking);
  const rows = [
    ["Booking Reference", s.ref],
    ["Customer", s.name],
    ["Phone", s.phone],
    s.altPhone ? ["Alternate Phone", s.altPhone] : null,
    ["Event", s.event],
    ["Date", s.date],
    ["Time", s.time],
    ["Venue", s.venue],
    ["Location", s.location],
    ["City", s.city],
    ["Estimated Total", s.total],
  ].filter(Boolean);

  const itemRows = s.items.map((item) => `
    <li style="margin:0 0 8px">${escapeHtml(item.name || "Event item")} ×${Number(item.quantity || 1)}${Array.isArray(item.addons) && item.addons.length ? ` — Add-ons: ${escapeHtml(item.addons.map((a) => a.name).join(", "))}` : ""}</li>
  `).join("");

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
    <h2 style="margin-bottom:4px">New Booking Received</h2>
    <p style="margin-top:0;color:#667085">Next Level Events</p>
    <table cellpadding="7" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
      ${rows.map(([label, value]) => `<tr><td style="font-weight:700;border-bottom:1px solid #eee;width:180px">${escapeHtml(label)}</td><td style="border-bottom:1px solid #eee">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    ${s.notes ? `<h3>Notes</h3><p>${escapeHtml(s.notes).replace(/\n/g, "<br>")}</p>` : ""}
    <h3>Booking Items</h3><ul>${itemRows || "<li>No items recorded</li>"}</ul>
    <p style="margin-top:24px;color:#667085">This notification was generated automatically after the booking was saved.</p>
  </body></html>`;
}

async function sendEmail(booking) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const to = String(process.env.BOOKING_NOTIFICATION_EMAIL || "nextlevel.events25@gmail.com").trim();
  const from = String(process.env.BOOKING_FROM_EMAIL || "").trim();
  if (!apiKey || !to || !from) return { status: "skipped", reason: "Email notification is not configured." };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `booking-${booking.id}-email`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New Booking ${booking.ref} — ${booking.customer_name || "Guest"}`,
      html: html(booking),
      text: plainText(booking),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.name || "Email provider rejected the notification.");
  return { status: "sent", providerMessageId: data?.id || null };
}

async function sendWhatsApp(booking) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const recipient = String(process.env.WHATSAPP_NOTIFICATION_TO || "").replace(/\D/g, "");
  const templateName = String(process.env.WHATSAPP_TEMPLATE_NAME || "new_booking_alert").trim();
  const language = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US").trim();
  const version = String(process.env.WHATSAPP_GRAPH_VERSION || "").trim();

  if (!token || !phoneNumberId || !recipient || !version) {
    return { status: "skipped", reason: "WhatsApp notification is not configured." };
  }

  const s = bookingSummary(booking);
  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: s.ref },
            { type: "text", text: s.name },
            { type: "text", text: s.phone },
            { type: "text", text: s.event },
            { type: "text", text: s.date },
            { type: "text", text: s.time },
            { type: "text", text: s.city },
            { type: "text", text: s.venue },
            { type: "text", text: s.total },
          ],
        }],
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error?.error_data?.details || "WhatsApp provider rejected the notification.";
    throw new Error(detail);
  }
  return { status: "sent", providerMessageId: data?.messages?.[0]?.id || null };
}

export async function notifyBooking(booking, db) {
  const channels = [
    ["email", sendEmail],
    ["whatsapp", sendWhatsApp],
  ];

  const results = await Promise.allSettled(channels.map(async ([channel, sender]) => {
    const result = await sender(booking);
    return { channel, ...result };
  }));

  for (let i = 0; i < results.length; i += 1) {
    const channel = channels[i][0];
    const result = results[i];
    const status = result.status === "fulfilled" ? result.value : { status: "failed", reason: result.reason?.message || "Notification failed." };
    try {
      await db.query("booking_notifications", {
        method: "POST",
        body: {
          booking_id: booking.id,
          channel,
          status: status.status,
          provider_message_id: status.providerMessageId || null,
          error_message: status.status === "failed" || status.status === "skipped" ? status.reason || null : null,
          sent_at: status.status === "sent" ? new Date().toISOString() : null,
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    } catch (dbError) {
      console.error(`Booking notification log failed (${channel}):`, dbError);
    }
    if (status.status === "failed") console.error(`Booking ${booking.ref} ${channel} notification failed:`, status.reason);
  }
}

function inquirySummary(inquiry) {
  return {
    id: inquiry.id,
    name: inquiry.name || "—",
    phone: inquiry.phone || "—",
    event: inquiry.event_type || "—",
    date: inquiry.event_date || "—",
    time: inquiry.event_time || "—",
    venue: inquiry.event_venue || "—",
    location: inquiry.event_location || inquiry.city || "—",
    guests: inquiry.guest_count || "—",
    message: inquiry.message || "—",
  };
}

function inquiryText(inquiry) {
  const s = inquirySummary(inquiry);
  return [
    "NEW INQUIRY RECEIVED",
    "",
    `Inquiry ID: ${s.id}`,
    `Customer: ${s.name}`,
    `Phone: ${s.phone}`,
    `Event Type: ${s.event}`,
    `Event Date: ${s.date}`,
    `Event Time: ${s.time}`,
    `Venue: ${s.venue}`,
    `Location: ${s.location}`,
    `Guest Count: ${s.guests}`,
    "",
    "Vision / Requirements:",
    s.message,
  ].join("\n");
}

function inquiryHtml(inquiry) {
  const s = inquirySummary(inquiry);
  const rows = [
    ["Inquiry ID", s.id], ["Customer", s.name], ["Phone", s.phone],
    ["Event Type", s.event], ["Event Date", s.date], ["Event Time", s.time],
    ["Venue", s.venue], ["Location", s.location], ["Guest Count", s.guests],
  ];
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
    <h2>New Inquiry Received</h2><p style="color:#667085">Next Level Events CRM</p>
    <table cellpadding="7" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
      ${rows.map(([label,value]) => `<tr><td style="font-weight:700;border-bottom:1px solid #eee;width:180px">${escapeHtml(label)}</td><td style="border-bottom:1px solid #eee">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <h3>Vision / Requirements</h3><p>${escapeHtml(s.message).replace(/\n/g,"<br>")}</p>
    <p style="color:#667085">This inquiry was automatically added to the CRM.</p>
  </body></html>`;
}

async function sendInquiryEmail(inquiry) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const to = String(process.env.BOOKING_NOTIFICATION_EMAIL || "nextlevel.events25@gmail.com").trim();
  const from = String(process.env.BOOKING_FROM_EMAIL || "").trim();
  if (!apiKey || !to || !from) return { status: "skipped", reason: "Email notification is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `inquiry-${inquiry.id}-email` },
    body: JSON.stringify({ from, to: [to], subject: `New Inquiry — ${inquiry.event_type || "Event"} — ${inquiry.name || "Client"}`, html: inquiryHtml(inquiry), text: inquiryText(inquiry) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.name || "Email provider rejected the notification.");
  return { status: "sent", providerMessageId: data?.id || null };
}

async function sendInquiryWhatsApp(inquiry) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const recipient = String(process.env.WHATSAPP_NOTIFICATION_TO || "").replace(/\D/g, "");
  const templateName = String(process.env.WHATSAPP_INQUIRY_TEMPLATE_NAME || "new_inquiry_alert").trim();
  const language = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US").trim();
  const version = String(process.env.WHATSAPP_GRAPH_VERSION || "").trim();
  if (!token || !phoneNumberId || !recipient || !version) return { status: "skipped", reason: "WhatsApp notification is not configured." };
  const s = inquirySummary(inquiry);
  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: recipient, type: "template",
      template: { name: templateName, language: { code: language }, components: [{ type: "body", parameters: [
        { type: "text", text: s.name }, { type: "text", text: s.phone }, { type: "text", text: s.event },
        { type: "text", text: s.date }, { type: "text", text: s.time }, { type: "text", text: s.venue },
        { type: "text", text: s.location }, { type: "text", text: s.guests },
      ] }] },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.error?.error_data?.details || "WhatsApp provider rejected the notification.");
  return { status: "sent", providerMessageId: data?.messages?.[0]?.id || null };
}

export async function notifyInquiry(inquiry, db) {
  const channels = [["email", sendInquiryEmail], ["whatsapp", sendInquiryWhatsApp]];
  const results = await Promise.allSettled(channels.map(async ([channel, sender]) => ({ channel, ...(await sender(inquiry)) })));
  for (let i = 0; i < results.length; i += 1) {
    const channel = channels[i][0];
    const result = results[i];
    const status = result.status === "fulfilled" ? result.value : { status: "failed", reason: result.reason?.message || "Notification failed." };
    try {
      await db.query("inquiry_notifications", {
        method: "POST",
        body: { inquiry_id: inquiry.id, channel, status: status.status, provider_message_id: status.providerMessageId || null, error_message: status.status === "failed" || status.status === "skipped" ? status.reason || null : null, sent_at: status.status === "sent" ? new Date().toISOString() : null },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    } catch (dbError) { console.error(`Inquiry notification log failed (${channel}):`, dbError); }
    if (status.status === "failed") console.error(`Inquiry ${inquiry.id} ${channel} notification failed:`, status.reason);
  }
}
