export default class WhatsAppProviderAdapter {
  async sendText() {
    throw new Error("WhatsApp outbound provider adapter is not implemented yet.");
  }

  async sendTemplate() {
    throw new Error("WhatsApp template provider adapter is not implemented yet.");
  }

  async sendMedia() {
    throw new Error("WhatsApp media provider adapter is not implemented yet.");
  }
}