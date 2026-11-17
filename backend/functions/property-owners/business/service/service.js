import { Repository } from "../../data/repository.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { ARCHIVED_OWNER_STATUS } from "../../util/ownerConstants.js";
import { assertOwnerId, validateCreateOwner, validatePatchOwner } from "../validation/ownerValidator.js";
import { validateSetShares } from "../validation/shareValidator.js";
import { validateFinancialDataQuery } from "../validation/financialDataValidator.js";

const OWNER_NOT_FOUND_MESSAGE = "Owner not found.";
const PROPERTY_NOT_FOUND_MESSAGE = "Property not found.";
const ARCHIVED_OWNER_SHARES_MESSAGE = "Archived owners cannot receive ownership shares.";
const OWNERSHIP_CHANGED_TODAY_MESSAGE =
  "The ownership of this property already changed today. Choose tomorrow or later.";
const HELD_SHARES_MESSAGE = "This owner still holds ownership shares. Set new shares for these properties first.";
const DAY_MS = 86400000;

const toShare = ({ owner_id, ownership_basis_points, effective_from, effective_to }) => ({
  owner_id,
  ownership_basis_points,
  effective_from,
  effective_to,
});

const isCurrentOn = (today) => (row) =>
  row.effective_from <= today && (row.effective_to === null || row.effective_to > today);

const sharesWritableCheck = (ownerIds) => ({ property, owners, changedToday }) => {
  if (!property) {
    throw new NotFoundException(PROPERTY_NOT_FOUND_MESSAGE);
  }
  const foundOwnerIds = new Set(owners.map((owner) => owner.id));
  if (ownerIds.some((ownerId) => !foundOwnerIds.has(ownerId))) {
    throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
  }
  if (owners.some((owner) => owner.status === ARCHIVED_OWNER_STATUS)) {
    throw new ConflictException(ARCHIVED_OWNER_SHARES_MESSAGE);
  }
  if (changedToday) {
    throw new ConflictException(OWNERSHIP_CHANGED_TODAY_MESSAGE);
  }
};

const assertArchivable = ({ owner, heldShares }) => {
  if (!owner) {
    throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
  }
  if (heldShares.length > 0) {
    throw new ConflictException(HELD_SHARES_MESSAGE);
  }
};

const toProperty = (titles) => ({ property_id, ownership_basis_points, effective_from, effective_to }) => ({
  property_id,
  property_title: titles.get(property_id) ?? null,
  ownership_basis_points,
  effective_from,
  effective_to,
});

const groupPropertiesByOwner = (assignments, titles) => {
  const propertiesByOwner = new Map();
  const toTitledProperty = toProperty(titles);
  for (const assignment of assignments) {
    const properties = propertiesByOwner.get(assignment.owner_id);
    if (properties) {
      properties.push(toTitledProperty(assignment));
    } else {
      propertiesByOwner.set(assignment.owner_id, [toTitledProperty(assignment)]);
    }
  }
  return propertiesByOwner;
};

export class Service {
  constructor({ repository = new Repository(), clock = Date.now } = {}) {
    this.repository = repository;
    this.clock = clock;
  }

  today() {
    return Math.floor(this.clock() / DAY_MS) * DAY_MS;
  }

  async propertyTitles(hostId, assignments) {
    if (assignments.length === 0) {
      return new Map();
    }
    const propertyIds = assignments.map((assignment) => assignment.property_id);
    const properties = await this.repository.findPropertyTitlesByIds(propertyIds, hostId);
    return new Map(properties.map(({ id, title }) => [id, title]));
  }

  async listOwners(hostId) {
    const [owners, assignments] = await Promise.all([
      this.repository.findOwnersByHost(hostId),
      this.repository.findAssignmentsByHost(hostId, this.today()),
    ]);
    const titles = await this.propertyTitles(hostId, assignments);
    const propertiesByOwner = groupPropertiesByOwner(assignments, titles);
    return owners.map((owner) => ({ ...owner, properties: propertiesByOwner.get(owner.id) ?? [] }));
  }

  async getOwner(hostId, id) {
    const ownerId = assertOwnerId(id);
    const owner = await this.repository.findOwnerByIdAndHost(ownerId, hostId);
    if (!owner) {
      throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
    }
    const assignments = await this.repository.findAssignmentsByOwnerAndHost(ownerId, hostId, this.today());
    const titles = await this.propertyTitles(hostId, assignments);
    return { ...owner, properties: assignments.map(toProperty(titles)) };
  }

  async getFinancialSourceData(hostId, query) {
    const { ownerId, periodStartMs, periodEndMs, limit, offset } = validateFinancialDataQuery(query);
    const owner = await this.repository.findOwnerByIdAndHost(ownerId, hostId);
    if (!owner) {
      throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
    }

    const ownershipAssignments = await this.repository.findAssignmentsByOwnerAndHostForPeriod(
      ownerId,
      hostId,
      periodStartMs,
      periodEndMs
    );
    const propertyIds = [...new Set(ownershipAssignments.map((assignment) => assignment.property_id))];
    const sourceRows =
      propertyIds.length === 0
        ? []
        : await this.repository.findBookingFinancialCandidates({
            hostId,
            propertyIds,
            periodStartMs,
            periodEndMs,
            limit,
            offset,
          });
    const hasMore = sourceRows.length > limit;
    const bookingCandidates = sourceRows.slice(0, limit);
    const bookingIds = bookingCandidates.map((booking) => booking.id);
    const invoiceSnapshots =
      bookingIds.length === 0 ? [] : await this.repository.findInvoiceFinancialSnapshots(bookingIds, hostId);
    const missingCurrencyBookingIds = bookingCandidates
      .filter((booking) => !booking.currency)
      .map((booking) => booking.id);
    const missingChannexCurrencyBookingIds = bookingCandidates
      .filter((booking) => String(booking.bookingtype || "").toLowerCase() === "channex" && !booking.currency)
      .map((booking) => booking.id);

    return {
      owner: {
        id: owner.id,
        owner_type: owner.owner_type,
        status: owner.status,
      },
      reportingWindow: {
        startInclusiveMs: periodStartMs,
        endExclusiveMs: periodEndMs,
      },
      candidateSelection: {
        policy: "unresolved",
        includedWhen: [
          "The booking stay overlaps the requested window.",
          "The booking was created inside the requested window.",
        ],
        note: "This union is for source-data discovery only. It is not a decision about revenue attribution.",
      },
      ownershipAssignments: ownershipAssignments.map((assignment) => ({
        ownerId: assignment.owner_id,
        propertyId: assignment.property_id,
        ownershipBasisPoints: assignment.ownership_basis_points,
        effectiveFromMs: assignment.effective_from,
        effectiveToMs: assignment.effective_to,
      })),
      bookingCandidates: bookingCandidates.map((booking) => ({
        bookingId: booking.id,
        propertyId: booking.property_id,
        bookingType: booking.bookingtype,
        bookingSource: booking.booking_source,
        status: booking.status,
        createdAtMs: Number(booking.createdat),
        arrivalDateMs: booking.arrivaldate,
        departureDateMs: booking.departuredate,
        checkedOutAtMs: booking.checked_out_at,
        cancelledAtMs: booking.cancelled_at,
        rawTotalPrice: booking.total_price,
        currency: booking.currency || null,
        paymentReference: booking.paymentid || null,
        rawRefundedAmount: booking.refunded_amount,
        stripeRefundId: booking.stripe_refund_id,
        refundStatus: booking.refund_status,
      })),
      invoiceSnapshots: invoiceSnapshots.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        bookingId: invoice.booking_id,
        propertyId: invoice.property_id,
        arrivalDateMs: invoice.arrival_date,
        departureDateMs: invoice.departure_date,
        grossAmount: invoice.gross_amount,
        commissionAmount: invoice.commission_amount,
        netAmount: invoice.net_amount,
        status: invoice.status,
        createdAtMs: invoice.created_at,
      })),
      pagination: {
        limit,
        offset,
        returned: bookingCandidates.length,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
      dataQuality: {
        missingCurrencyBookingIds,
        missingChannexCurrencyBookingIds,
        limitations: [
          "The accounting-period attribution policy has not been selected. Booking candidates are not final period revenue.",
          "Stripe charge, balance-transaction and payout records are not fetched; only booking payment references and stored refund fields are returned.",
          "There is no persisted property-expense ledger in the current data model.",
          "Invoice records do not store currency and their current creation flow applies a fixed 10% commission; invoice totals are supplemental records, not authoritative owner earnings.",
          "Channex imports currently do not persist the source booking currency.",
          "Taxes, fee responsibility, ownership changes during a stay and rounding rules still require Finance/Product decisions.",
        ],
      },
    };
  }

  async createOwner(hostId, body) {
    const fields = validateCreateOwner(body);
    const now = this.clock();
    const saved = await this.repository.createOwner({
      ...fields,
      host_id: hostId,
      owner_user_id: null,
      created_at: now,
      updated_at: now,
    });
    return { ...saved, properties: [] };
  }

  async updateOwner(hostId, id, body) {
    const ownerId = assertOwnerId(id);
    const owner = await this.repository.findOwnerByIdAndHost(ownerId, hostId);
    if (!owner) {
      throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
    }
    const changes = validatePatchOwner(body, owner);
    const affected = await this.repository.updateOwner(ownerId, hostId, { ...changes, updated_at: this.clock() });
    if (affected === 0) {
      throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
    }
    return await this.getOwner(hostId, ownerId);
  }

  async archiveOwner(hostId, id) {
    const ownerId = assertOwnerId(id);
    await this.repository.archiveOwner({ ownerId, hostId, today: this.today(), now: this.clock(), assertArchivable });
    return await this.getOwner(hostId, ownerId);
  }

  async setShares(hostId, body) {
    const today = this.today();
    const { propertyId, effectiveFrom, shares } = validateSetShares(body, today);
    const now = this.clock();
    const ownerIds = shares.map((share) => share.owner_id);
    const rows = shares.map(({ owner_id, ownership_basis_points }) => ({
      owner_id,
      property_id: propertyId,
      host_id: hostId,
      ownership_basis_points,
      effective_from: effectiveFrom,
      effective_to: null,
      created_at: now,
      updated_at: now,
    }));
    const { property, rows: savedRows } = await this.repository.replacePropertyShares({
      hostId,
      propertyId,
      effectiveFrom,
      today,
      now,
      ownerIds,
      rows,
      assertWritable: sharesWritableCheck(ownerIds),
    });
    return {
      property_id: propertyId,
      property_title: property.title,
      as_of: today,
      current: savedRows.filter(isCurrentOn(today)).map(toShare),
      upcoming: savedRows.filter((row) => row.effective_from > today).map(toShare),
    };
  }
}
