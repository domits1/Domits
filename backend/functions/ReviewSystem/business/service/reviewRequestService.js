import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const DEFAULT_LIMIT = 10;

// Review: Generates, claims, sends, retries, and suppresses review invitation emails.
export default class ReviewRequestService {
  constructor({ reviewRepository, clock = Date.now, client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" }) } = {}) {
    this.repository = reviewRepository;
    this.clock = clock;
    this.client = client;
  }

  // Review: Resolve the guest address from the booking or the user information service.
  async getGuestEmail(booking) {
    if (booking.guest_email) return booking.guest_email;
    const response = await this.client.send(new InvokeCommand({
      FunctionName: process.env.REVIEW_USER_INFO_LAMBDA_NAME || "GetUserInfo",
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify({ UserId: booking.guestid })),
    }));
    if (response.FunctionError) throw new Error("Guest contact lookup failed.");
    const result = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString("utf8")) : null;
    if (Number(result?.statusCode) !== 200) throw new Error("Guest contact lookup failed.");
    const body = typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    return body?.[0]?.Attributes?.find((attribute) => attribute.Name === "email")?.Value || null;
  }

  // Review: Send a review invitation or reminder with a link tied to the booking.
  async sendEmail(booking, request, reminder, guestEmail) {
    const url = new URL("/guestdashboard/reviews/new", process.env.REVIEW_FRONTEND_URL || "https://domits.com");
    url.searchParams.set("bookingId", booking.id);
    url.searchParams.set("propertyId", booking.property_id);
    const payload = { body: {
      toEmail: guestEmail,
      subject: reminder ? "Reminder: review your stay on Domits" : "Review your stay on Domits",
      body: `Hello ${booking.guestname || ""},\n\nHow was your stay? You can leave a review until ${new Date(request.expiresAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}.\n\n${url.toString()}\n\nYou can turn off review emails in your review notification preferences.`,
    } };
    const response = await this.client.send(new InvokeCommand({
      FunctionName: process.env.REVIEW_EMAIL_LAMBDA_NAME || "EmailNotificationService",
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload)),
    }));
    if (response.FunctionError) throw new Error("Review email delivery failed.");
    const result = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString("utf8")) : null;
    if (result?.statusCode && Number(result.statusCode) >= 400) throw new Error("Review email delivery failed.");
  }

  // Review: Create missing requests, claim due requests, and deliver eligible reminders.
  async processDue({ limit = DEFAULT_LIMIT } = {}) {
    const now = this.clock();
    const boundedLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 100);
    const bookings = await this.repository.listBookingsNeedingReviewRequests(now, boundedLimit);
    for (const booking of bookings) {
      await this.repository.createReviewRequestForBooking(booking, now);
    }

    const due = await this.repository.listDueReviewRequests(now, boundedLimit);
    const results = [];
    // Review: Process each claimed request once, recording whether it was suppressed, sent, or retried.
    for (const request of due) {
      if (!(await this.repository.claimReviewRequest(request.id, now))) continue;
      try {
        // Review: Recheck the stay, guest preference, and review history before sending an email.
        const booking = await this.repository.getBookingById(request.bookingId);
        const preference = await this.repository.getReviewNotificationPreference(request.guestId);
        const existingReview = await this.repository.getReviewByBookingTypeAndReviewer({
          bookingId: request.bookingId, reviewType: request.reviewType, reviewerUserId: request.guestId,
        });
        // Review: Suppress requests when the stay, review status, or email preference no longer qualifies.
        if (!booking || String(booking.status).toLowerCase() !== "completed" ||
          Number(booking.departuredate) > now || existingReview?.status === "SUBMITTED" ||
          ["VERIFIED", "PENDING_MODERATION", "PUBLISHED", "REJECTED"].includes(existingReview?.status) ||
          !preference.emailEnabled) {
          await this.repository.suppressReviewRequest(request.id, now);
          results.push({ id: request.id, status: "SUPPRESSED" });
          continue;
        }
        // Review: Suppress requests without a reachable guest; successful sends finish the request, failures retry later.
        const guestEmail = await this.getGuestEmail(booking);
        if (!guestEmail) {
          await this.repository.suppressReviewRequest(request.id, now);
          results.push({ id: request.id, status: "SUPPRESSED" });
          continue;
        }
        await this.sendEmail(booking, request, request.sendCount > 0, guestEmail);
        await this.repository.finishReviewRequestSend(request.id, now, true);
        results.push({ id: request.id, status: "SENT" });
      } catch {
        await this.repository.finishReviewRequestSend(request.id, now, false);
        results.push({ id: request.id, status: "FAILED" });
      }
    }
    return { generated: bookings.length, results };
  }
}
