import { AUTOMATION_TRIGGER } from "../util/constants.js";

const OFFSET_FACTORS = {
  MINUTES: 60 * 1000,
  HOURS: 60 * 60 * 1000,
  DAYS: 24 * 60 * 60 * 1000,
};

export const calculateScheduledFor = (occurredAt, offsetAmount, offsetUnit) =>
  Number(occurredAt) + Number(offsetAmount || 0) * OFFSET_FACTORS[offsetUnit];

const safeFailureReason = () => "Booking-paid event processing failed.";

export default class SchedulingService {
  constructor({ outboxRepository, automationRepository, deliveryRepository, bookingContextRepository }) {
    this.outbox = outboxRepository;
    this.automations = automationRepository;
    this.deliveries = deliveryRepository;
    this.bookings = bookingContextRepository;
  }

  async processEvent(event) {
    const booking = await this.bookings.getBooking(event.bookingId);
    if (!booking || String(booking.status).toLowerCase() !== "paid") return [];

    const automations = await this.automations.listActiveForBooking(booking.hostid, booking.property_id);
    const deliveries = [];
    for (const automation of automations) {
      const idempotencyKey = `${automation.id}:${booking.id}:${AUTOMATION_TRIGGER}:${event.eventVersion}`;
      const delivery = await this.deliveries.createScheduled({
        automationId: automation.id,
        bookingId: booking.id,
        eventType: AUTOMATION_TRIGGER,
        eventVersion: event.eventVersion,
        scheduledFor: calculateScheduledFor(event.occurredAt, automation.offsetAmount, automation.offsetUnit),
        templateSnapshot: automation.template,
        idempotencyKey,
      });
      if (delivery) deliveries.push(delivery);
    }
    return deliveries;
  }

  async processOutbox({ limit = 50 } = {}) {
    const events = await this.outbox.listProcessable(limit);
    const results = [];

    for (const event of events) {
      if (!(await this.outbox.claim(event.id))) continue;
      try {
        const deliveries = await this.processEvent(event);
        await this.outbox.markProcessed(event.id);
        results.push({ eventId: event.id, scheduled: deliveries.length });
      } catch {
        await this.outbox.markFailed(event.id, safeFailureReason());
        results.push({ eventId: event.id, scheduled: 0, failed: true });
      }
    }

    return results;
  }
}
