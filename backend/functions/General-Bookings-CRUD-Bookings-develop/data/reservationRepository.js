import Database from "database";
import { randomUUID } from "crypto";
import LambdaRepository from "./lambdaRepository.js";
import CreateDate from "../business/model/createDate.js";
import UnableToSearch from "../util/exception/UnableToSearch.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import { Booking } from "database/models/Booking";

class ReservationRepository {
  // ---------
  // Booking Create (auth)
  // ---------
  async addBookingToTable(requestBody, userId, hostId) {
    const date = CreateDate.createUnixTime();
    const id = randomUUID();
    const tempPaymentId = randomUUID();
    const arrivalDate = new Date(requestBody.general.arrivalDate).getTime();
    const departureDate = new Date(requestBody.general.departureDate).getTime();
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Booking)
      .values({
        id: id,
        arrivaldate: parseFloat(arrivalDate),
        createdat: date,
        departuredate: parseFloat(departureDate),
        guestid: userId,
        hostid: hostId,
        hostname: "WIP-Host",
        guests: requestBody.general.guests.toString(),
        guestname: requestBody.general.guestName,
        latepayment: false,
        paymentid: "FAILED: ",
        tempPaymentId,
        property_id: requestBody.identifiers.property_Id,
        status: "Awaiting Payment",
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
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(["booking.arrivaldate", "booking.departuredate"])
      .where("booking.property_id = :property_id", { property_id: property_id })
      .andWhere("booking.createdat = :createdAt", { createdAt: createdAt })
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
    // Fetches user's property first, throws error if not found
    this.lambdaRepository = new LambdaRepository();
    const propertiesOutput = await this.lambdaRepository.getPropertiesFromHostId(host_Id);
    const properties = propertiesOutput.map((item) => ({
      id: item.id,
      title: item.title,
      rate: item.rate,
      city: item.city,
      country: item.country,
    }));

    // Proceeds to send a request for every id returning their respective data
    const results = await Promise.all(
      properties.map(async (property) => {
        const res = await this.readByPropertyId(property.id);

        return {
          ...property,
          res,
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
      .select(["booking.arrivaldate", "booking.departuredate"])
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

  async getBookingById(id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
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
}

export default ReservationRepository;
