import IngestionService from "../business/ingestionService.js";

const safeJson = (v) => {
  try {
    if (!v) return null;
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};

const extractIntegrationId = (path) => {
  const m = String(path || "").match(/\/integrations\/([^/]+)/);
  return m?.[1] || null;
};

class IngestionController {
  constructor() {
    this.ingestionService = new IngestionService();
  }

  async ingestMessages(event) {
    const integrationAccountId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};

    const payload = {
      ...body,
      integrationAccountId,
    };

    return await this.ingestionService.ingestExternalThread(payload);
  }
}

export default IngestionController;