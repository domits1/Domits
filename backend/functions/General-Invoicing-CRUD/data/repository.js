import Database from "database";
import { Invoice } from "database/models/Invoice";
import { Booking } from "database/models/Booking";
import { DatabaseException } from "../util/exception/databaseException.js";
import { BadRequestException } from "../util/exception/badRequestException.js";

const COMMISSION_RATE = 0.10;

function generateInvoiceNumber(sequenceNumber) {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(6, "0");
  return `INV-${year}-${padded}`;
}

async function getNextSequenceNumber(client) {
  const result = await client
    .getRepository(Invoice)
    .createQueryBuilder("invoice")
    .select("COUNT(invoice.id)", "count")
    .getRawOne();
  return parseInt(result?.count || "0", 10) + 1;
}

export class Repository {
  async createInvoiceForBooking(bookingId, hostId, totalAmount, nights, ratePerNight) {
    const client = await Database.getInstance();

    const booking = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.id = :id", { id: bookingId })
      .getOne();

    if (!booking) {
      throw new BadRequestException("Booking not found.");
    }
    if (booking.hostid !== hostId) {
      throw new BadRequestException("You are not the host of this booking.");
    }

    const existing = await client
      .getRepository(Invoice)
      .createQueryBuilder("invoice")
      .where("invoice.booking_id = :bookingId", { bookingId })
      .getOne();

    if (existing) {
      return existing;
    }

    const grossAmount = parseFloat(Number(totalAmount).toFixed(2));
    const commissionAmount = parseFloat((grossAmount * COMMISSION_RATE).toFixed(2));
    const netAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));

    const sequenceNumber = await getNextSequenceNumber(client);
    const invoiceNumber = generateInvoiceNumber(sequenceNumber);

    const result = await client
      .createQueryBuilder()
      .insert()
      .into(Invoice)
      .values({
        invoice_number: invoiceNumber,
        host_id: hostId,
        booking_id: bookingId,
        property_id: booking.property_id,
        property_name: booking.hostname || "Property",
        guest_name: booking.guestname,
        arrival_date: Number(booking.arrivaldate),
        departure_date: Number(booking.departuredate),
        nights: Number(nights),
        rate_per_night: parseFloat(Number(ratePerNight).toFixed(2)),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        status: "finalized",
        created_at: Date.now(),
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  async getInvoicesByHostId(hostId) {
    const client = await Database.getInstance();
    return await client
      .getRepository(Invoice)
      .createQueryBuilder("invoice")
      .where("invoice.host_id = :hostId", { hostId })
      .orderBy("invoice.created_at", "DESC")
      .getMany();
  }

  async getInvoiceById(invoiceId, hostId) {
    const client = await Database.getInstance();
    const invoice = await client
      .getRepository(Invoice)
      .createQueryBuilder("invoice")
      .where("invoice.id = :invoiceId", { invoiceId })
      .getOne();

    if (!invoice) {
      throw new DatabaseException("Invoice not found.");
    }
    if (invoice.host_id !== hostId) {
      throw new BadRequestException("Access denied.");
    }
    return invoice;
  }
}
