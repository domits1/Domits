import { Repository } from "../../data/repository.js";

export class Service {
  constructor() {
    this.repository = new Repository();
  }

  async createInvoice(bookingId, hostId, totalAmount, nights, ratePerNight) {
    return await this.repository.createInvoiceForBooking(bookingId, hostId, totalAmount, nights, ratePerNight);
  }

  async getInvoices(hostId) {
    return await this.repository.getInvoicesByHostId(hostId);
  }

  async getInvoice(invoiceId, hostId) {
    return await this.repository.getInvoiceById(invoiceId, hostId);
  }
}
