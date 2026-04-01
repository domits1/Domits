import MessagingContextRepository from "../data/messagingContextRepository.js";
import MessagingTemplateRepository from "../data/messagingTemplateRepository.js";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

const formatTime = (value) => {
  if (!value) return "";
  return String(value).slice(0, 5);
};

const normalizeContent = (value) => String(value || "");

export default class TemplateRenderService {
  constructor() {
    this.contextRepository = new MessagingContextRepository();
    this.templates = new MessagingTemplateRepository();
  }

  buildVariableMap(context = {}) {
    const addressParts = [context.street, context.houseNumber].filter(Boolean);

    return {
      guestName: context.guestName || "Guest",
      propertyName: context.propertyTitle || "",
      checkInDate: formatDate(context.arrivalDate),
      checkOutDate: formatDate(context.departureDate),
      city: context.city || "",
      country: context.country || "",
      street: context.street || "",
      houseNumber: context.houseNumber || "",
      fullAddress: addressParts.join(" "),
      checkInFrom: formatTime(context.checkInFrom),
      checkInTill: formatTime(context.checkInTill),
      checkOutFrom: formatTime(context.checkOutFrom),
      checkOutTill: formatTime(context.checkOutTill),
    };
  }

  interpolate(content, variableMap) {
    let output = normalizeContent(content);

    Object.entries(variableMap || {}).forEach(([key, value]) => {
      const safeValue = value == null ? "" : String(value);
      output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), safeValue);
      output = output.replace(new RegExp(`\\[\\s*${key}\\s*\\]`, "gi"), safeValue);
    });

    return output;
  }

  async renderTemplateById({ templateId, threadId = null, hostId = null, guestId = null, propertyId = null }) {
    const template = await this.templates.getById(templateId);
    if (!template) {
      const error = new Error("Messaging template not found.");
      error.statusCode = 404;
      throw error;
    }

    const context = await this.contextRepository.getConversationContext({ threadId, hostId, guestId, propertyId });
    const variableMap = this.buildVariableMap(context);

    return {
      template,
      context,
      variableMap,
      renderedContent: this.interpolate(template.content, variableMap),
    };
  }

  async renderRawContent({ content, threadId = null, hostId = null, guestId = null, propertyId = null }) {
    const context = await this.contextRepository.getConversationContext({ threadId, hostId, guestId, propertyId });
    const variableMap = this.buildVariableMap(context);

    return {
      context,
      variableMap,
      renderedContent: this.interpolate(content, variableMap),
    };
  }
}
