import {
  APPROVED_VARIABLES,
  AUTOMATION_CHANNEL,
  AUTOMATION_TRIGGER,
  OFFSET_UNITS,
  SAFE_PREVIEW_VALUES,
} from "../util/constants.js";
import { badRequest, forbidden, notFound } from "../util/httpErrors.js";
import { renderTemplate, validateTemplate } from "../renderer/templateRenderer.js";

const normalizeNullableId = (value) => {
  if (value === null || value === "") return null;
  return value === undefined ? undefined : String(value).trim() || null;
};

const normalizeOffset = (amount, unit) => {
  const normalizedAmount = Number(amount ?? 0);
  const normalizedUnit = String(unit || "MINUTES").trim().toUpperCase();
  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 0 || normalizedAmount > 365) {
    throw badRequest("offsetAmount must be an integer between 0 and 365.");
  }
  if (!OFFSET_UNITS.has(normalizedUnit)) throw badRequest("Unsupported offsetUnit.");
  return { offsetAmount: normalizedAmount, offsetUnit: normalizedAmount === 0 ? "MINUTES" : normalizedUnit };
};

const formatDate = (value) => {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const buildBookingVariables = ({ booking, property }) => ({
  guestName: booking?.guestname || "",
  propertyName: property?.title || "",
  checkInDate: formatDate(booking?.arrivaldate),
  checkOutDate: formatDate(booking?.departuredate),
});

const toAutomationDto = (automation) =>
  automation && {
    id: automation.id,
    propertyId: automation.propertyId ?? null,
    name: automation.name,
    triggerType: automation.triggerType,
    offsetAmount: automation.offsetAmount,
    offsetUnit: automation.offsetUnit,
    template: automation.template,
    channel: automation.channel,
    status: automation.status,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
  };

const toDeliveryDto = (delivery) => ({
  id: delivery.id,
  automationId: delivery.automationId,
  bookingId: delivery.bookingId,
  scheduledFor: delivery.scheduledFor,
  status: delivery.status,
  messageId: delivery.messageId ?? null,
  failureReason: delivery.failureReason ?? null,
  createdAt: delivery.createdAt,
  updatedAt: delivery.updatedAt,
  sentAt: delivery.sentAt ?? null,
});

export default class AutomationService {
  constructor({ automationRepository, deliveryRepository, bookingContextRepository }) {
    this.automations = automationRepository;
    this.deliveries = deliveryRepository;
    this.bookings = bookingContextRepository;
  }

  async assertPropertyOwnership(hostId, propertyId) {
    if (propertyId && !(await this.bookings.hostOwnsProperty(hostId, propertyId))) {
      throw forbidden("The selected property does not belong to the authenticated host.");
    }
  }

  async getAccessibleAutomation(hostId, id) {
    const automation = await this.automations.getByIdForHost(id, hostId);
    if (!automation) throw notFound("Automation not found.");
    await this.assertPropertyOwnership(hostId, automation.propertyId);
    return automation;
  }

  normalizeDefinition(input, { partial = false } = {}) {
    const patch = {};
    if (!partial || input.name !== undefined) {
      const name = String(input.name || "").trim();
      if (!name) throw badRequest("Automation name is required.");
      patch.name = name;
    }
    if (!partial || input.template !== undefined) patch.template = validateTemplate(input.template).template;
    if (!partial || input.offsetAmount !== undefined || input.offsetUnit !== undefined) {
      Object.assign(patch, normalizeOffset(input.offsetAmount, input.offsetUnit));
    }

    if (input.triggerType !== undefined && input.triggerType !== AUTOMATION_TRIGGER) {
      throw badRequest("Only the BOOKING_PAID trigger is supported.");
    }
    if (input.channel !== undefined && input.channel !== AUTOMATION_CHANNEL) {
      throw badRequest("Only DOMITS_DIRECT is supported.");
    }

    if (!partial || input.propertyId !== undefined) patch.propertyId = normalizeNullableId(input.propertyId);
    patch.triggerType = AUTOMATION_TRIGGER;
    patch.channel = AUTOMATION_CHANNEL;
    return patch;
  }

  async list(hostId) {
    const automations = await this.automations.listByHost(hostId);
    const accessible = [];
    for (const automation of automations) {
      if (!automation.propertyId || await this.bookings.hostOwnsProperty(hostId, automation.propertyId)) {
        accessible.push(toAutomationDto(automation));
      }
    }
    return accessible;
  }

  async get(hostId, id) {
    return toAutomationDto(await this.getAccessibleAutomation(hostId, id));
  }

  async create(hostId, input) {
    const definition = this.normalizeDefinition(input);
    await this.assertPropertyOwnership(hostId, definition.propertyId);
    return toAutomationDto(await this.automations.create({ ...definition, hostId, status: "DRAFT" }));
  }

  async update(hostId, id, input) {
    const existing = await this.getAccessibleAutomation(hostId, id);
    const patch = this.normalizeDefinition({ ...existing, ...input });
    await this.assertPropertyOwnership(hostId, patch.propertyId);
    return toAutomationDto(await this.automations.update(id, hostId, patch));
  }

  async setStatus(hostId, id, status) {
    const existing = await this.getAccessibleAutomation(hostId, id);
    if (status === "ACTIVE") this.normalizeDefinition(existing);
    return toAutomationDto(await this.automations.update(id, hostId, { status }));
  }

  async preview(hostId, input, automationId = null) {
    const existing = automationId ? await this.getAccessibleAutomation(hostId, automationId) : null;
    const template = input.template ?? existing?.template;
    validateTemplate(template);
    const propertyScope = input.propertyId ?? existing?.propertyId ?? null;
    await this.assertPropertyOwnership(hostId, propertyScope);

    let values = SAFE_PREVIEW_VALUES;
    if (input.bookingId) {
      const context = await this.bookings.getBookingContext(input.bookingId);
      if (!context) throw notFound("Booking not found.");
      if (String(context.booking.hostid) !== String(hostId)) throw forbidden("Booking does not belong to this host.");
      if (propertyScope && String(propertyScope) !== String(context.booking.property_id)) {
        throw forbidden("Booking is outside this automation's property scope.");
      }
      values = buildBookingVariables(context);
    }

    return { ...renderTemplate(template, values, { missingPolicy: "marker" }), approvedVariables: APPROVED_VARIABLES };
  }

  async listDeliveries(hostId, automationId) {
    await this.getAccessibleAutomation(hostId, automationId);
    return (await this.deliveries.listByAutomation(automationId)).map(toDeliveryDto);
  }
}
