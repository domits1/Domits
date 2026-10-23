const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export const httpsUrl = value => {
  try {
    const url = new URL(value);

    const isHttps = url.protocol === "https:";
    const isLocalhost =
      url.protocol === "http:" &&
      url.hostname === "localhost";

    return isHttps || isLocalhost ? url.href : null;
  } catch {
    return null;
  }
};

const date = value => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(new Date(timestamp).getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(timestamp));
};

export function buildReviewInvitationEmail({ booking, guestName, propertyTitle, city,
  propertyImageUrl, logoUrl, frontendUrl }) {
  const base = httpsUrl(frontendUrl);
  if (!base) throw new Error("FRONTEND_URL must be an HTTPS URL.");
  const reviewUrl = new URL("/review", base);
  reviewUrl.searchParams.set("bookingId", booking.id);
  const name = guestName?.trim() || booking.guestname?.trim() || "there";
  const title = propertyTitle?.trim() || "your accommodation";
  const arrival = date(booking.arrivaldate);
  const departure = date(booking.departuredate);
  const dates = arrival && departure ? `${arrival} – ${departure}` : null;
  const image = httpsUrl(propertyImageUrl);
  const logo = httpsUrl(logoUrl);
  const subject = "How was your stay?";
  const text = [`Hi ${name},`, "", "Thank you for choosing Domits. We hope you had a great stay!", "",
    `How was your stay at ${title}?`, city?.trim(), dates, "",
    "Your review helps other travelers discover great places to stay and helps hosts improve.", "",
    `Share your experience: ${reviewUrl.href}`, "", "Thank you,", "The Domits Team",
  ].filter(line => line !== null && line !== undefined).join("\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#101940;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Tell us about your stay. Your opinion makes a difference.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6f8;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background-color:#ffffff;border-radius:16px;">
<tr><td style="padding:28px 24px;border-bottom:1px solid #e5e9ef;">
${logo ? `<img src="${escapeHtml(logo)}" width="150" alt="Domits" style="display:block;width:150px;max-width:100%;height:auto;border:0;">` : '<span style="font-size:30px;font-weight:bold;color:#101940;">Domits</span>'}
<p style="margin:12px 0 0;color:#606d86;font-size:14px;">Your stay matters</p></td></tr>
<tr><td style="padding:28px 24px 20px;"><h1 style="margin:0 0 10px;font-size:24px;line-height:32px;">Hi ${escapeHtml(name)},</h1>
<p style="margin:0;color:#606d86;font-size:16px;line-height:26px;">Thank you for choosing Domits. We hope you had a great stay!</p></td></tr>
<tr><td style="padding:0 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f8fc;border-radius:14px;">
${image ? `<tr><td><img src="${escapeHtml(image)}" width="592" alt="${escapeHtml(title)}" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:14px 14px 0 0;"></td></tr>` : ""}
<tr><td style="padding:24px;"><p style="margin:0 0 10px;font-size:13px;font-weight:bold;letter-spacing:1px;color:#606d86;">HOW WAS YOUR STAY AT</p>
<h2 style="margin:0 0 16px;font-size:28px;line-height:36px;">${escapeHtml(title)}</h2>
${city?.trim() ? `<p style="margin:0 0 8px;color:#606d86;font-size:16px;">${escapeHtml(city.trim())}</p>` : ""}
${dates ? `<p style="margin:0 0 18px;color:#606d86;font-size:16px;">${escapeHtml(dates)}</p>` : ""}
<p style="margin:0 0 24px;color:#606d86;font-size:16px;line-height:26px;">Your review helps other travelers discover great places to stay and supports hosts in providing even better stays.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#009f43" style="border-radius:10px;mso-padding-alt:16px 24px;">
<a href="${escapeHtml(reviewUrl.href)}" style="display:inline-block;padding:16px 24px;font-size:17px;line-height:24px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Share your experience &#8594;</a>
</td></tr></table></td></tr></table></td></tr>
<tr><td style="padding:20px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0faf4;border-radius:12px;"><tr><td style="padding:20px;">
<p style="margin:0 0 8px;font-size:17px;font-weight:bold;">Your opinion makes a difference</p>
<p style="margin:0;color:#606d86;font-size:15px;line-height:24px;">Tell us about your stay and help the community discover great places to stay.</p></td></tr></table></td></tr>
<tr><td style="padding:24px;border-top:1px solid #e5e9ef;"><p style="margin:0;color:#606d86;font-size:15px;line-height:24px;">Thank you,<br><strong style="color:#101940;">The Domits Team</strong></p>
<p style="margin:20px 0 0;color:#606d86;font-size:12px;line-height:20px;word-break:break-word;">If the button does not work, open:<br><a href="${escapeHtml(reviewUrl.href)}" style="color:#008b3b;">${escapeHtml(reviewUrl.href)}</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
