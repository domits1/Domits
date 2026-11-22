import { ReviewGuestAlertCandidateService } from "./reviewGuestAlertCandidateService.js";
import { ReviewAdminAlertCandidateService } from "./reviewAdminAlertCandidateService.js";
import { ReviewAlertRules, responseOverdueHours } from "../model/reviewAlertRules.js";
import { readTrendPolicy } from "../model/ratingTrends.js";
import { ReviewAlertWorkRepository, adminReviewAlertWorkId, guestReviewAlertWorkId } from "../../data/reviewAlertWorkRepository.js";
import { ReviewAlertNotificationService } from "./reviewAlertNotificationService.js";
const DAY = 86400000;

export class ReviewAlertProcessingService {
  constructor({ repository = new ReviewAlertWorkRepository(), delivery = new ReviewAlertNotificationService(), adminCandidates = new ReviewAdminAlertCandidateService(), guestCandidates = new ReviewGuestAlertCandidateService(), now = Date.now } = {}) {
    Object.assign(this, { repository, delivery, adminCandidates, guestCandidates, now });
  }
  async afterGuestEvent(type, reviewId, responseId) {
    try {
      const job = await this.repository.find(guestReviewAlertWorkId(type, reviewId, responseId));
      if (job && job.due_at != null) await this.process(job);
    } catch { this.log(); }
  }
  async afterAdminEvent(type, reviewId, flagId) {
    try {
      const job = await this.repository.find(adminReviewAlertWorkId(type, reviewId, flagId));
      if (job && job.due_at != null) await this.process(job);
    } catch { this.log(); } // Durable work remains available to the scheduled worker.
  }
  async afterPublication(review) {
    try {
      const job = await this.repository.find(review.id);
      if (job && JSON.parse(job.payload).phase === "publication") await this.process(job);
    } catch { this.log(); } // Committed publication must survive notification failure.
  }
  async run() {
    await this.repository.seed(Math.floor(this.now() / DAY) * DAY);
    const jobs = await this.repository.due(this.now());
    for (const job of jobs) await this.process(job);
    return { processed: jobs.length };
  }
  log() { console.error(JSON.stringify({ event: "REVIEW_ALERT_PROCESSING_FAILED", requiresReconciliation: true })); }
  async send(event, isEligible) {
    if (!event) return;
    const results = await this.delivery.deliver(event, { isEligible });
    if (!results.length || results.some(result => result.status === "FAILED")) throw new Error("Alert delivery incomplete.");
  }
  async process(job) {
    const payload = JSON.parse(job.payload), now = this.now();
    try {
      if (payload.phase === "guest") {
        for (const event of await this.guestCandidates.evaluate(payload)) await this.send(
          { ...event, ...(payload.responseId ? { responseId: payload.responseId } : {}) }, async () =>
            (await this.guestCandidates.evaluate(payload)).some(fresh => fresh.eventKey === event.eventKey));
        return await this.repository.advance(job, payload, null);
      }
      if (payload.phase === "admin") {
        const candidates = await this.adminCandidates.evaluate(payload);
        let failed = false;
        for (const event of candidates) {
          try {
            await this.send({ ...event, ...(payload.flagId ? { flagId: payload.flagId } : {}) }, async () =>
              (await this.adminCandidates.evaluate(payload)).some(fresh => fresh.eventKey === event.eventKey));
          } catch { failed = true; }
        }
        if (failed) throw new Error("Administrator alert delivery incomplete.");
        return await this.repository.advance(job, payload, null);
      }
      if (!payload.reviewId) return await this.scan(job, payload, now);
      const hours = responseOverdueHours(process.env.REVIEW_RESPONSE_OVERDUE_HOURS);
      const input = { ...await this.repository.context(payload.reviewId, now), publishedAt: payload.publishedAt, now, overdueHours: hours };
      const rules = payload.phase === "publication" ? ["newReview", "lowRating"] : ["responseOverdue"];
      for (const rule of rules) {
        const event = ReviewAlertRules[rule](input);
        if (!event) continue;
        await this.send({ ...event, overallRating: input.review.overall_rating }, async () => {
          const fresh = { ...input, ...await this.repository.context(payload.reviewId, this.now()), now: this.now() };
          return ReviewAlertRules[rule](fresh)?.eventKey === event.eventKey;
        });
      }
      const deadline = payload.publishedAt + hours * 3600000;
      const due = payload.phase === "publication" || now < deadline ? Math.max(deadline, now + 1) : null;
      await this.repository.advance(job, { ...payload, phase: "overdue" }, due);
    } catch {
      this.log();
      await this.repository.advance(job, payload, now + 60000); // Replays cannot resend a claimed email.
    }
  }
  async scan(job, payload, now) {
    const host = payload.host ?? await this.repository.nextHost(payload.afterHost);
    if (!host) return this.repository.advance(job, payload, null);
    const options = { ...readTrendPolicy(), endExclusive: payload.end, currentStart: payload.end - 30 * DAY,
      previousStart: payload.end - 60 * DAY, offset: 0, afterProperty: payload.afterProperty, status: "DECLINING" };
    const rows = await this.repository.trend(host, options);
    for (const trend of rows.slice(0, 25)) {
      const make = value => ReviewAlertRules.decliningRating({ trend: value, recipientUserId: host, ...options });
      const event = make(trend);
      if (!event) continue;
      await this.send({ ...event, previousRating: trend.previous_average_rating, currentRating: trend.current_average_rating }, async () => {
        const [fresh] = await this.repository.trend(host, { ...options, offset: 0, propertyId: trend.property_id });
        return make(fresh)?.eventKey === make(trend)?.eventKey;
      });
    }
    await this.repository.advance(job, rows.length > 25 ? { ...payload, host, afterProperty: rows[24].property_id } :
      { end: payload.end, afterHost: host }, now + 1);
  }
}
