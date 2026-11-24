import Database from "database";
import { Invoice } from "database/models/Invoice";
import { Booking } from "database/models/Booking";
import { DatabaseException } from "../util/exception/databaseException.js";
import { BadRequestException } from "../util/exception/badRequestException.js";
import { formatMinorUnits, getCurrencyFractionDigits, parseDecimalToMinorUnits } from "../../.shared/money/currencyAmount.js";

const COMMISSION_RATE_NUMERATOR = 1n;
const COMMISSION_RATE_DENOMINATOR = 10n;

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
  return Number.parseInt(result?.count || "0", 10) + 1;
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

    const currency =
      String(booking.currency || "").trim().toUpperCase() ||
      (String(booking.bookingtype || "").trim().toLowerCase() === "channex" ? "" : "EUR");
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException("The booking currency is unavailable; an invoice cannot be created safely.");
    }
    if (getCurrencyFractionDigits(currency) > 2) {
      throw new BadRequestException("Invoice compatibility amount fields support currencies with at most two fraction digits.");
    }

    const ratePerNightMinor = BigInt(parseDecimalToMinorUnits(ratePerNight, currency));
    const grossAmountMinor = BigInt(parseDecimalToMinorUnits(totalAmount, currency));
    if (ratePerNightMinor < 0n || grossAmountMinor < 0n) {
      throw new BadRequestException("Invoice amounts must be non-negative.");
    }

    const commissionAmountMinor =
      (grossAmountMinor * COMMISSION_RATE_NUMERATOR + COMMISSION_RATE_DENOMINATOR / 2n) /
      COMMISSION_RATE_DENOMINATOR;
    const netAmountMinor = grossAmountMinor - commissionAmountMinor;
    const ratePerNightAmount = formatMinorUnits(ratePerNightMinor, currency);
    const grossAmount = formatMinorUnits(grossAmountMinor, currency);
    const commissionAmount = formatMinorUnits(commissionAmountMinor, currency);
    const netAmount = formatMinorUnits(netAmountMinor, currency);

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
        currency,
        rate_per_night: ratePerNightAmount,
        rate_per_night_minor: ratePerNightMinor.toString(),
        gross_amount: grossAmount,
        gross_amount_minor: grossAmountMinor.toString(),
        commission_amount: commissionAmount,
        commission_amount_minor: commissionAmountMinor.toString(),
        net_amount: netAmount,
        net_amount_minor: netAmountMinor.toString(),
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
