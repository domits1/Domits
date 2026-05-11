import { RoomPriceGenieService } from "../business/service/roompricegenieService.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export default class Controller {
  constructor() {
    this.service = new RoomPriceGenieService();
  }

  async connect(event)       { return this._run(() => this.service.connect(event)); }
  async disconnect(event)    { return this._run(() => this.service.disconnect(event)); }
  async getStatus(event)     { return this._run(() => this.service.getStatus(event)); }
  async sendInventory(event) { return this._run(() => this.service.sendInventory(event)); }
  async pushAvailability(event) { return this._run(() => this.service.pushAvailability(event)); }
  async pushRates(event)     { return this._run(() => this.service.pushRates(event)); }
  async updateSettings(event) { return this._run(() => this.service.updateSettings(event)); }

  // Webhook: called by RPG to push price recommendations to Domits
  async receivePrices(event) { return this._run(() => this.service.receivePriceRecommendations(event)); }

  async _run(fn) {
    try {
      const result = await fn();
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(result) };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: error.message || "Something went wrong" }),
      };
    }
  }
}
