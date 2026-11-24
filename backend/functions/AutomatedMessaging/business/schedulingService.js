import { AUTOMATION_TRIGGER, AUTOMATION_TRIGGERS, BOOKING_DATES_CHANGED_EVENT } from "../util/constants.js";
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
const STAY_DATES_CHANGED_REASON = "Stay dates changed and the send time has passed.";
const NOT_ELIGIBLE_REASON = "Booking is no longer eligible for this automation.";

const isPaidBooking = (booking) => String(booking?.status).toLowerCase() === "paid";

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

  calculateStaySchedule(automation, booking, checkIn) {
    return calculateStayScheduledFor({
      triggerType: automation.triggerType,
      offsetAmount: automation.offsetAmount,
      offsetUnit: automation.offsetUnit,
      offsetDirection: automation.offsetDirection,
      sendTime: automation.sendTime,
      booking,
      checkIn,
      now: this.clock(),
    });
  }

  async scheduleStayDelivery(base, automation, booking, checkIn) {
    let schedule;
    try {
      schedule = this.calculateStaySchedule(automation, booking, checkIn);
    } catch {
      return this.deliveries.createCancelled({ ...base, scheduledFor: this.clock() }, SEND_TIME_UNCALCULABLE_REASON);
    }

    if (schedule.isPast) {
      return this.deliveries.createCancelled({ ...base, scheduledFor: schedule.scheduledFor }, SEND_TIME_PASSED_REASON);
    }
    return this.deliveries.createScheduled({ ...base, scheduledFor: schedule.scheduledFor });
  }

  async alignScheduledDelivery(delivery, automation, booking, checkIn) {
    let schedule;
    try {
      schedule = this.calculateStaySchedule(automation, booking, checkIn);
    } catch {
      return this.deliveries.cancelScheduled(delivery.id, SEND_TIME_UNCALCULABLE_REASON);
    }

    if (schedule.scheduledFor === Number(delivery.scheduledFor)) return false;
    if (schedule.isPast) return this.deliveries.cancelScheduled(delivery.id, STAY_DATES_CHANGED_REASON);
    return this.deliveries.rescheduleScheduled(delivery.id, schedule.scheduledFor);
  }

  async processDatesChanged(event) {
    const deliveries = await this.deliveries.listScheduledStayByBooking(event.bookingId);
    if (deliveries.length === 0) return 0;

    const booking = await this.bookings.getBooking(event.bookingId);
    let changed = 0;
    if (!isPaidBooking(booking)) {
      for (const delivery of deliveries) {
        if (await this.deliveries.cancelScheduled(delivery.id, NOT_ELIGIBLE_REASON)) changed += 1;
      }
      return changed;
    }

    const checkIn = await this.bookings.getPropertyCheckIn(booking.property_id);
    for (const delivery of deliveries) {
      const automation = await this.automations.getById(delivery.automationId);
      if (automation && (await this.alignScheduledDelivery(delivery, automation, booking, checkIn))) changed += 1;
    }
    return changed;
  }

  async processEvent(event) {
    const booking = await this.bookings.getBooking(event.bookingId);
    if (!booking || !isPaidBooking(booking)) return [];

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

  async handleOutboxEvent(event) {
    if (event.eventType === BOOKING_DATES_CHANGED_EVENT) return { updated: await this.processDatesChanged(event) };
    if (event.eventType === AUTOMATION_TRIGGER) return { scheduled: (await this.processEvent(event)).length };
    return { scheduled: 0 };
  }

  async processOutbox({ limit = 50 } = {}) {
    const events = await this.outbox.listProcessable(limit);
    const results = [];

    for (const event of events) {
      if (!(await this.outbox.claim(event.id))) continue;
      try {
        const outcome = await this.handleOutboxEvent(event);
        await this.outbox.markProcessed(event.id);
        results.push({ eventId: event.id, ...outcome });
      } catch {
        await this.outbox.markFailed(event.id, safeFailureReason());
        results.push({ eventId: event.id, scheduled: 0, failed: true });
      }
    }

    return results;
  }
}
