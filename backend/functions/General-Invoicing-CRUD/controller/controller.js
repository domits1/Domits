import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class Controller {
  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async createInvoice(event) {
    try {
      const user = await this.authManager.authenticateUser(event.headers?.Authorization || event.Authorization);
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const invoice = await this.service.createInvoice(
        body.bookingId,
        user.sub,
        body.totalAmount,
        body.nights,
        body.ratePerNight
      );
      return { statusCode: 201, headers: responseHeaders, body: JSON.stringify(invoice) };
    } catch (error) {
      console.error(error.message);
      return { statusCode: error.statusCode || 500, headers: responseHeaders, body: JSON.stringify({ message: error.message }) };
    }
  }

  async getInvoices(event) {
    try {
      const user = await this.authManager.authenticateUser(event.headers?.Authorization || event.Authorization);
      const invoices = await this.service.getInvoices(user.sub);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(invoices) };
    } catch (error) {
      console.error(error.message);
      return { statusCode: error.statusCode || 500, headers: responseHeaders, body: JSON.stringify({ message: error.message }) };
    }
  }

  async getInvoiceById(event) {
    try {
      const user = await this.authManager.authenticateUser(event.headers?.Authorization || event.Authorization);
      const invoiceId = event.pathParameters?.id || event.queryStringParameters?.id;
      const invoice = await this.service.getInvoice(invoiceId, user.sub);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(invoice) };
    } catch (error) {
      console.error(error.message);
      return { statusCode: error.statusCode || 500, headers: responseHeaders, body: JSON.stringify({ message: error.message }) };
    }
  }
}
