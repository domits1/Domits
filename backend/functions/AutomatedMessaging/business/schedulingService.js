import { AUTOMATION_TRIGGER, AUTOMATION_TRIGGERS } from "../util/constants.js";
import { calculateStayScheduledFor } from "./scheduleCalculator.js";

const OFFSET_FACTORS = {
  MINUTES: 60 * 1000,
  HOURS: 60 * 60 * 1000,
  DAYS: 24 * 60 * 60 * 1000,
};

export const calculateScheduledFor = (occurredAt, offsetAmount, offsetUnit) =>
  Number(occurredAt) + Number(offsetAmount || 0) * OFFSET_FACTORS[offsetUnit];

const safeFailureReason = () => "Booking-paid event processing failed.";

const SEND_TIME_PASSED_REASON = "Send time had already passed when the booking was paid.";
const SEND_TIME_UNCALCULABLE_REASON = "Send time could not be calculated.";

const isStayTrigger = (triggerType) =>
  triggerType === AUTOMATION_TRIGGERS.CHECK_IN || triggerType === AUTOMATION_TRIGGERS.CHECK_OUT;

export default class SchedulingService {
  constructor({
    outboxRepository,
    automationRepository,
    deliveryRepository,
    bookingContextRepository,
    clock = Date.now,
  }) {
    this.outbox = outboxRepository;
    this.automations = automationRepository;
    this.deliveries = deliveryRepository;
    this.bookings = bookingContextRepository;
    this.clock = clock;
  }

  async scheduleStayDelivery(base, automation, booking, checkIn) {
    let schedule;
    try {
      schedule = calculateStayScheduledFor({
        triggerType: automation.triggerType,
        offsetAmount: automation.offsetAmount,
        offsetUnit: automation.offsetUnit,
        offsetDirection: automation.offsetDirection,
        sendTime: automation.sendTime,
        booking,
        checkIn,
        now: this.clock(),
      });
    } catch {
      return this.deliveries.createCancelled({ ...base, scheduledFor: this.clock() }, SEND_TIME_UNCALCULABLE_REASON);
    }

    if (schedule.isPast) {
      return this.deliveries.createCancelled({ ...base, scheduledFor: schedule.scheduledFor }, SEND_TIME_PASSED_REASON);
    }
    return this.deliveries.createScheduled({ ...base, scheduledFor: schedule.scheduledFor });
  }

  async processEvent(event) {
    const booking = await this.bookings.getBooking(event.bookingId);
    if (!booking || String(booking.status).toLowerCase() !== "paid") return [];

    const automations = await this.automations.listActiveForBooking(booking.hostid, booking.property_id);
    const needsCheckIn = automations.some((automation) => isStayTrigger(automation.triggerType));
    const checkIn = needsCheckIn ? await this.bookings.getPropertyCheckIn(booking.property_id) : null;

    const deliveries = [];
    for (const automation of automations) {
      const triggerType = automation.triggerType ?? AUTOMATION_TRIGGER;
      const base = {
        automationId: automation.id,
        bookingId: booking.id,
        eventType: triggerType,
        eventVersion: event.eventVersion,
        templateSnapshot: automation.template,
        idempotencyKey: `${automation.id}:${booking.id}:${triggerType}:${event.eventVersion}`,
      };
      const delivery = isStayTrigger(triggerType)
        ? await this.scheduleStayDelivery(base, automation, booking, checkIn)
        : await this.deliveries.createScheduled({
            ...base,
            scheduledFor: calculateScheduledFor(event.occurredAt, automation.offsetAmount, automation.offsetUnit),
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
