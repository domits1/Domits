import WhatsAppService from "../business/whatsappService.js";

class WhatsAppWebhookController {
  constructor() {
    this.whatsAppService = new WhatsAppService();
  }

  async verifyWebhook(event) {
    return await this.whatsAppService.verifyWebhook(event);
  }

  async handleWebhookEvent(event) {
    return await this.whatsAppService.handleWebhookEvent(event);
  }
}

export default WhatsAppWebhookController;