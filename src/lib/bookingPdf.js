// Tiny dependency-free PDF generator for booking references.
// Keeps the client bundle small and avoids requiring an external PDF service.
function ascii(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/₹/g, "INR");
}

function wrap(text, max = 88) {
  const clean = ascii(text);
  if (!clean) return [""];
  const words = clean.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + (line ? " " : "") + word).length <= max) {
      line += (line ? " " : "") + word;
    } else {
      if (line) lines.push(line);
      if (word.length > max) {
        for (let i = 0; i < word.length; i += max) lines.push(word.slice(i, i + max));
        line = "";
      } else line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdfText(text) {
  return ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePageContent(lines) {
  const out = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"];
  lines.forEach((line, index) => {
    if (index > 0) out.push("T*");
    out.push(`(${escapePdfText(line)}) Tj`);
  });
  out.push("ET");
  return out.join("\n");
}

export function downloadBookingPdf(order) {
  const ref = order?.ref || "NLE-BOOKING";
  const customer = order?.customer || {};
  const lines = [
    "NEXT LEVEL EVENTS",
    "Booking Confirmation",
    "",
    `Booking Reference: ${ref}`,
    `Date: ${new Date(order?.createdAt || Date.now()).toLocaleString("en-IN")}`,
    "",
    `Customer: ${customer.fullName || "-"}`,
    `Phone: ${customer.phone || "-"}`,
    "",
    "BOOKING DETAILS",
  ];

  for (const item of order?.items || []) {
    lines.push(...wrap(`${item.name || "Event item"} x${item.quantity || 1}`));
    if (item.city) lines.push(`City: ${item.city}`);
    if (item.eventType) lines.push(`Event: ${item.eventType}`);
    if (item.eventDate) lines.push(`Date: ${item.eventDate}`);
    if (item.timeSlot) lines.push(`Time: ${item.timeSlot}`);
    if (item.locationType) lines.push(`Location type: ${item.locationType}`);
    if (item.address) lines.push(...wrap(`Venue: ${item.address}`));
    if (Array.isArray(item.addons) && item.addons.length) {
      lines.push("Add-on services:");
      item.addons.forEach((addon) => lines.push(...wrap(`- ${addon.name} — INR ${Number(addon.price || 0).toLocaleString("en-IN")}`)));
    }
    if (item.notes) lines.push(...wrap(`Notes: ${item.notes}`));
    lines.push("");
  }

  lines.push(`Estimated Total: INR ${Number(order?.total || 0).toLocaleString("en-IN")}`);
  lines.push("Payment status: Not required online");
  lines.push("");
  lines.push("Our team will contact you to confirm availability and payment arrangements.");
  lines.push("Next Level Events");

  // Split into compact pages so long carts remain printable.
  const pages = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));

  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalogId = add(null);
  const pagesId = add(null);
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  for (const pageLines of pages) {
    const content = makePageContent(pageLines);
    const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets[i + 1] = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ref}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
