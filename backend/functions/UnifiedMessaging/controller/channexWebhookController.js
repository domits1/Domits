import ChannexWebhookService from "../business/channexWebhookService.js";

class ChannexWebhookController {
  constructor() {
    this.channexWebhookService = new ChannexWebhookService();
  }

  async handleWebhookEvent(event) {
    return await this.channexWebhookService.handleWebhookEvent(event);
  }
}

export default ChannexWebhookController;
