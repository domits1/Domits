import { buildBookingVariables } from "../business/automationService.js";
import { renderTemplate } from "../renderer/templateRenderer.js";

const isPaid = (booking) => String(booking?.status || "").trim().toLowerCase() === "paid";
const idsEqual = (left, right) => String(left || "") === String(right || "");

const safeFailureReason = (error) => {
  if (error?.code === "BAD_REQUEST") return "Approved template values are missing.";
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

  async processDelivery(delivery, now) {
    const automation = await this.automations.getById(delivery.automationId);
    if (!automation || automation.status !== "ACTIVE") {
      await this.deliveries.markCancelled(delivery.id, "Automation is not active.");
      return { id: delivery.id, status: "CANCELLED" };
    }

    const context = await this.bookings.getBookingContext(delivery.bookingId);
    if (!context || !isPaid(context.booking)) {
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
