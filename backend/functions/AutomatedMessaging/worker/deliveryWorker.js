import { buildBookingVariables } from "../business/automationService.js";
import { renderTemplate } from "../renderer/templateRenderer.js";
import { calculateStayScheduledFor } from "../business/scheduleCalculator.js";
import { APPROVED_VARIABLES, AUTOMATION_TRIGGERS, STAY_SEND_GRACE_MS } from "../util/constants.js";

const isPaid = (booking) => String(booking?.status || "").trim().toLowerCase() === "paid";
const isStayTrigger = (triggerType) =>
  triggerType === AUTOMATION_TRIGGERS.CHECK_IN || triggerType === AUTOMATION_TRIGGERS.CHECK_OUT;
const idsEqual = (left, right) => String(left || "") === String(right || "");

const missingValuesReason = (error) => {
  const missing = Array.isArray(error?.details?.missingVariables) ? error.details.missingVariables : [];
  const approvedMissing = missing.filter((variable) => APPROVED_VARIABLES.includes(variable));
  return approvedMissing.length ? `Missing values: ${approvedMissing.join(", ")}` : null;
};

const safeFailureReason = (error) => {
  if (error?.code === "BAD_REQUEST") return missingValuesReason(error) || "Approved template values are missing.";
  if (error?.code === "DOMITS_DIRECT_DELIVERY_FAILED") return "Domits Direct delivery failed.";
  return "Automated message delivery failed.";
};

export default class DeliveryWorker {
  constructor({ deliveryRepository, automationRepository, bookingContextRepository, unifiedMessagingClient }) {
    this.deliveries = deliveryRepository;
    this.automations = automationRepository;
    this.bookings = bookingContextRepository;
    this.messaging = unifiedMessagingClient;
  }

  async sendWithReconciliation(payload) {
    try {
      return await this.messaging.sendAutomatedDomitsMessage(payload);
    } catch {
      return this.messaging.sendAutomatedDomitsMessage(payload);
    }
  }

  async cancel(delivery, reason) {
    await this.deliveries.markCancelled(delivery.id, reason);
    return { id: delivery.id, status: "CANCELLED" };
  }

  async verifyStaySchedule(delivery, automation, context, now) {
    let schedule;
    try {
      schedule = calculateStayScheduledFor({
        triggerType: automation.triggerType,
        offsetAmount: automation.offsetAmount,
        offsetUnit: automation.offsetUnit,
        offsetDirection: automation.offsetDirection,
        sendTime: automation.sendTime,
        booking: context.booking,
        checkIn: context.checkIn,
        now,
      });
    } catch {
      return this.cancel(delivery, "Send time could not be calculated.");
    }

    if (schedule.scheduledFor !== Number(delivery.scheduledFor)) {
      if (schedule.isPast) return this.cancel(delivery, "Stay dates changed and the send time has passed.");
      await this.deliveries.reschedule(delivery.id, schedule.scheduledFor);
      return { id: delivery.id, status: "RESCHEDULED" };
    }

    if (now - Number(delivery.scheduledFor) > STAY_SEND_GRACE_MS) return this.cancel(delivery, "Send time has passed.");
    return null;
  }

  async processDelivery(delivery, now) {
    const automation = await this.automations.getById(delivery.automationId);
    if (automation?.status !== "ACTIVE") {
      await this.deliveries.markCancelled(delivery.id, "Automation is not active.");
      return { id: delivery.id, status: "CANCELLED" };
    }

    const context = await this.bookings.getBookingContext(delivery.bookingId);
    if (!isPaid(context?.booking)) {
      await this.deliveries.markCancelled(delivery.id, "Booking is no longer eligible for this automation.");
      return { id: delivery.id, status: "CANCELLED" };
    }

    if (
      !idsEqual(context.booking.hostid, automation.hostId) ||
      (automation.propertyId && !idsEqual(context.booking.property_id, automation.propertyId))
    ) {
      await this.deliveries.markCancelled(delivery.id, "Booking is outside this automation's ownership scope.");
      return { id: delivery.id, status: "CANCELLED" };
    }

    if (isStayTrigger(automation.triggerType)) {
      const outcome = await this.verifyStaySchedule(delivery, automation, context, now);
      if (outcome) return outcome;
    }

    const { renderedContent } = renderTemplate(delivery.templateSnapshot, buildBookingVariables(context));
    const sendPayload = {
      deliveryId: delivery.id,
      automationId: automation.id,
      bookingId: context.booking.id,
      hostId: automation.hostId,
      propertyId: context.booking.property_id,
      content: renderedContent,
    };
    const authorized = await this.deliveries.authorizeSend({
      deliveryId: delivery.id,
      automationId: automation.id,
      bookingId: context.booking.id,
      hostId: automation.hostId,
      propertyId: context.booking.property_id,
      arrivalDate: context.booking.arrivaldate,
      departureDate: context.booking.departuredate,
      now,
    });
    if (!authorized) {
      await this.deliveries.markCancelled(delivery.id, "Automation or booking became ineligible before sending.");
      return { id: delivery.id, status: "CANCELLED" };
    }

    const sent = await this.sendWithReconciliation(sendPayload);
    await this.deliveries.markSent(delivery.id, {
      messageId: sent.messageId,
      renderedContent,
      sentAt: now,
      diagnostic: sent.diagnostic || null,
    });
    return { id: delivery.id, status: "SENT", messageId: sent.messageId };
  }

  async processDue({ now = Date.now(), limit = 50 } = {}) {
    const due = await this.deliveries.listDue(now, limit);
    const results = [];
    for (const delivery of due) {
      if (!(await this.deliveries.claim(delivery.id, now))) continue;
      try {
        results.push(await this.processDelivery(delivery, now));
      } catch (error) {
        const failureReason = safeFailureReason(error);
        await this.deliveries.markFailed(delivery.id, failureReason);
        results.push({ id: delivery.id, status: "FAILED", failureReason });
      }
    }
    return results;
  }
}
