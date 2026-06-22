import Database from "database";
import { randomUUID } from "node:crypto";
import LambdaRepository from "./lambdaRepository.js";
import CreateDate from "../business/model/createDate.js";
import UnableToSearch from "../util/exception/UnableToSearch.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import Forbidden from "../util/exception/Forbidden.js";
import ConflictException from "../util/exception/ConflictException.js";
import { Booking } from "database/models/Booking";
import { Property_Rule } from "database/models/Property_Rule";
import { parseBookingDateToMs } from "../util/bookingDateParser.js";

const NON_BLOCKING_BOOKING_STATUSES = ["Failed", "Declined", "Inquiry", "Cancelled", "Canceled"];
const MIN_CHECK_IN_OUT_GAP_MS = 60 * 60 * 1000;

class ReservationRepository {
  // ---------
  // Booking Create (auth)
  // ---------
  async addBookingToTable(
    requestBody,
    userId,
    hostId,
    cancellationPolicy,
    status = "Awaiting Payment",
    bookingType = "direct"
  ) {
    const date = CreateDate.createUnixTime();
    const id = randomUUID();
    const tempPaymentId = randomUUID();
    const arrivalDate = parseBookingDateToMs(requestBody.general.arrivalDate, "arrivalDate");
    const departureDate = parseBookingDateToMs(requestBody.general.departureDate, "departureDate");
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Booking)
      .values({
        id: id,
        arrivaldate: arrivalDate,
        createdat: date,
        departuredate: departureDate,
        guestid: userId,
        hostid: hostId,
        hostname: "WIP-Host",
        guests: requestBody.general.guests.toString(),
        guestname: requestBody.general.guestName || requestBody.general.guestname || "Guest",
        latepayment: false,
        paymentid: "FAILED: ",
        tempPaymentId,
        property_id: requestBody.identifiers.property_Id,
        status: status,
        bookingtype: bookingType,
      })
      .execute();
    try {
      await this.getBookingById(id);
    } catch (error) {
      console.error(`During creation of the booking, verifying if the property exists failed. ${error}`);
      throw new NotFoundException("Failed to validate if booking exits.");
    }
    return {
      statusCode: 201,
      hostId: hostId,
      bookingId: id,
      propertyId: requestBody.identifiers.property_Id,
      dates: {
        arrivalDate: requestBody.general.arrivalDate,
        departureDate: requestBody.general.departureDate,
      },
    };
  }

  async assertNoBookingConflict({ propertyId, arrivalDateMs, departureDateMs, excludeBookingId = null }) {
    const client = await Database.getInstance();
    const bufferedArrivalDate = arrivalDateMs - MIN_CHECK_IN_OUT_GAP_MS;
    const bufferedDepartureDate = departureDateMs + MIN_CHECK_IN_OUT_GAP_MS;

    const query = client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :property_id", { property_id: propertyId })
      .andWhere("booking.status NOT IN (:...excludedStatuses)", { excludedStatuses: NON_BLOCKING_BOOKING_STATUSES })
      .andWhere("booking.arrivaldate < :bufferedDepartureDate", { bufferedDepartureDate })
      .andWhere("booking.departuredate > :bufferedArrivalDate", { bufferedArrivalDate });

    if (excludeBookingId) {
      query.andWhere("booking.id != :excludeBookingId", { excludeBookingId });
    }

    const conflictCount = await query.getCount();

    if (conflictCount > 0) {
      throw new ConflictException("Selected dates are no longer available.");
    }
  }
  // ---------
  // Read bookings by propertyID
  // ---------
  async readByPropertyId(property_Id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :property_id", { property_id: property_Id })
      .getMany();

    if (query < 1) {
      console.error("No bookings found for property ", property_Id);
      return { response: null };
    }
    return {
      response: query,
    };
  }

  // ---------
  // Read bookings by guest_ID (gets userid from auth token)
  // ---------
  async readByGuestId(guest_Id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.guestid = :guestid", { guestid: guest_Id })
      .getMany();

    if (!query) {
      throw new UnableToSearch();
    } else if (query.length < 1) {
      throw new NotFoundException("No booking found.");
    }
    return {
      response: query,
      statusCode: 200,
    };
  }
  // ---------
  // Read bookings by date created at + property_Id (auth-less)
  // ---------
  async readByDate(createdAt, property_id) {
    //only returns arrivaldate and departureDate
    const client = await Database.getInstance();
    const startOfDay = new Date(Number(createdAt));
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = startOfDay.getTime() + 24 * 60 * 60 * 1000;

    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")

      .select(["booking.arrivaldate", "booking.departuredate", "booking.cancellation_policy"])
      .where("booking.property_id = :property_id", { property_id: property_id })
      .andWhere("booking.createdat >= :startOfDay", { startOfDay: startOfDay.getTime() })
      .andWhere("booking.createdat < :endOfDay", { endOfDay })

      .getMany();
    if (!query) {
      throw new UnableToSearch();
    } else if (query.length < 1) {
      throw new NotFoundException("No booking found.");
    }
    return {
      response: query,
      statusCode: 200,
    };
  }
  // ---------
  // Read bookings by payment_Id (auth)
  // ---------

  async readByPaymentId(paymentID) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.paymentid = :paymentid", { paymentid: paymentID })
      .getMany();

    if (!query) {
      throw new UnableToSearch();
    } else if (query.length < 1) {
      throw new NotFoundException("No booking found.");
    }
    return {
      response: query,
      statusCode: 200,
    };
  }

  // ---------
  // Read bookings by HostID
  // ---------
  async readByHostId(host_Id) {
    this.lambdaRepository = new LambdaRepository();
    const propertiesOutput = await this.lambdaRepository.getPropertiesFromHostId(host_Id);
    const properties = propertiesOutput.map((item) => ({
      id: item.id,
      title: item.title,
      rate: item.rate,
      city: item.city,
      country: item.country,
      rules: item.rules || [],
    }));

    const client = await Database.getInstance();

    const buildPropertyRules = (bookings, fallbackRules = []) => {
      const joinedRules = bookings.flatMap((booking) => booking.rules || []);
      const uniqueRules = joinedRules.filter(
        (rule, index, list) =>
          list.findIndex(
            (candidate) => candidate?.rule === rule?.rule && String(candidate?.value) === String(rule?.value)
          ) === index
      );

      return uniqueRules.length > 0 ? uniqueRules : fallbackRules;
    };

    const results = await Promise.all(
      properties.map(async (property) => {
        const bookings = await client
          .getRepository(Booking)
          .createQueryBuilder("booking")
          .leftJoinAndMapMany(
            "booking.rules",
            Property_Rule,
            "property_rule",
            "property_rule.property_id = booking.property_id"
          )
          .where("booking.property_id = :property_id", { property_id: property.id })
          .getMany();

        const rules = buildPropertyRules(bookings, property.rules || []);
        const normalizedBookings = bookings.map(({ rules: bookingRules, ...booking }) => booking);

        return {
          ...property,
          rules,
          res: { response: normalizedBookings },
        };
      })
    );
    return {
      response: results,
      statusCode: 200,
    };
  }

  // ---------
  // Read bookings by HostID (single property) - Used for the Calender as of now.
  // ---------
  async readByHostIdSingleProperty(host_id, property_Id) {
    const lambdaRepository = new LambdaRepository();
    const pricing = await lambdaRepository.getPropertyPricingById(property_Id);

    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.hostid = :hostid", { hostid: host_id })
      .andWhere("booking.property_id = :property_id", { property_id: property_Id })
      .getMany();

    if (query.length < 1) {
      throw new NotFoundException("No bookings found with given property_id and hostid.");
    }

    return {
      response: {
        query,
        pricing,
      },
      statusCode: 200,
    };
  }
  // ---------
  // Read bookings by departureDate + property_Id (auth-less) (this is for the guests)
  // ---------
  async readByDepartureDate(departureDate, property_Id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")

      .select(["booking.arrivaldate", "booking.departuredate", "booking.cancellation_policy"])
      .where("booking.property_id = :property_id", { property_id: property_Id })
      .andWhere("booking.departuredate = :departuredate", { departuredate: departureDate })

      .getMany();

    if (!query) {
      throw new UnableToSearch();
    } else if (query.length < 1) {
      throw new NotFoundException("No booking found.");
    }
    return {
      response: query,
      statusCode: 200,
    };
  }

  async getBlockedDatesByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const results = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(["booking.arrivaldate", "booking.departuredate"])
      .where("booking.property_id = :propertyId", { propertyId })
      .andWhere("booking.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: NON_BLOCKING_BOOKING_STATUSES,
      })
      .getMany();

    return {
      statusCode: 200,
      response: results.map((b) => ({
        arrivaldate: b.arrivaldate,
        departuredate: b.departuredate,
      })),
    };
  }

  async getBookingById(id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select([
        "booking.id",
        "booking.arrivaldate",
        "booking.departuredate",
        "booking.createdat",
        "booking.guestid",
        "booking.guests",
        "booking.hostid",
        "booking.latepayment",
        "booking.paymentid",
        "booking.property_id",
        "booking.status",
        "booking.guestname",
        "booking.hostname",
        "booking.cancellation_policy",
        "booking.bookingtype",
        "booking.total_price",
        "booking.refunded_amount",
        "booking.stripe_refund_id",
        "booking.refund_error",
      ])
      .where("booking.id = :id", { id: id })
      .getOne();

    if (!query) {
      return {
        message: "No bookings found",
        statusCode: 204,
      };
    }
    return {
      response: query,
      statusCode: 200,
    };
  }

  async getBookingByPaymentId(paymentid) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.paymentid = :paymentid", { paymentid: paymentid })
      .getOne();

    if (!query) {
      throw new NotFoundException(
        `NotFoundException occurred: Tried to reference the database for the paymentid while no results were given back.`
      );
    }
    return query;
  }

  async updateBookingStatus(id, status) {
    const client = await Database.getInstance();
    const query = await client
      .createQueryBuilder()
      .update(Booking)
      .set({ status: status })
      .where("id = :id ", { id: id })
      .execute();

    if (query.length < 1) {
      return {
        message: "An unexpected error occurred. The booking could not be updated. Please contact the devs.",
        statusCode: 204,
      };
    }
    return {
      response: query,
      statusCode: 200,
    };
  }

  async getOverlappingInquiries({ propertyId, arrivalDateMs, departureDateMs, excludeBookingId }) {
    const client = await Database.getInstance();
    return await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :propertyId", { propertyId })
      .andWhere("booking.status = :status", { status: "Inquiry" })
      .andWhere("booking.id != :excludeBookingId", { excludeBookingId })
      .andWhere("booking.arrivaldate < :departureDateMs", { departureDateMs })
      .andWhere("booking.departuredate > :arrivalDateMs", { arrivalDateMs })
      .getMany();
  }

  async updateBookingDates(id, arrivalDateMs, departureDateMs) {
    const client = await Database.getInstance();
    const query = await client
      .createQueryBuilder()
      .update(Booking)
      .set({
        arrivaldate: Number.parseFloat(arrivalDateMs),
        departuredate: Number.parseFloat(departureDateMs),
      })
      .where("id = :id", { id })
      .execute();

    return {
      response: query,
      statusCode: 200,
    };
  }

  async cancelBookingByGuest(id, guestId, refundInfo = {}) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.id = :id", { id })
      .getOne();

    if (!existing) {
      throw new NotFoundException("Booking not found.");
    }

    if (existing.guestid !== guestId) {
      throw new Forbidden("Only the guest of this booking may cancel this booking.");
    }

    const updateData = { status: "Cancelled" };
    if (refundInfo.refundedAmount !== undefined) {
      updateData.refunded_amount = refundInfo.refundedAmount;
    }
    if (refundInfo.stripeRefundId) {
      updateData.stripe_refund_id = refundInfo.stripeRefundId;
    }
    if (refundInfo.refundError) {
      updateData.refund_error = refundInfo.refundError;
    }

    await client.createQueryBuilder().update(Booking).set(updateData).where("id = :id", { id }).execute();

    const updated = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.id = :id", { id })
      .getOne();

    return {
      response: updated,
      statusCode: 200,
    };
  }
}

export default ReservationRepository;
