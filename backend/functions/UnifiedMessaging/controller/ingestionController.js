import IngestionService from "../business/ingestionService.js";
import { extractIntegrationId, safeJson } from "./controllerUtils.js";

class IngestionController {
  constructor() {
    this.ingestionService = new IngestionService();
  }

  async ingestMessages(event) {
    const integrationAccountId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};
    return await this.ingestionService.ingestExternalThread({
      ...body,
      integrationAccountId,
    });
  }
}

export default IngestionController;
