import Database from "database";
import { unmarshall } from "@aws-sdk/util-dynamodb";
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
          guestname: "WIP-Guest",
          latepayment: false,
          paymentid: randomUUID(),
          property_id: requestBody.identifiers.property_Id,
          status: "Awaiting Payment",
        })
        .execute();
        try {
            await this.getBookingById(id);
        } catch (error) {
            console.error(`During creation of the booking, verifying if the property exists failed. ${error}`);
            throw new NotFoundException("Failed to validate if booking exits.")
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
  // Read bookings by propertyID (auth)
  // ---------
  async readByPropertyId(property_Id) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :property_id", { property_id: property_Id })
      .getMany();

    if (!query) {
      throw new UnableToSearch();
    } else if (query.length < 1) {
      throw new NotFoundException("No booking found.");
    }
    return {
      statusCode: 200,
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
  // Read bookings by HostID (auth, depends on property-crud lambdax/)
  // ---------
  async readByHostId(host_Id) {
    this.lambdaRepository = new LambdaRepository();
    const propertiesOutput = await this.lambdaRepository.getPropertiesFromHostId(host_Id);

    const properties = propertiesOutput.id.map((_, i) => ({
      id: propertiesOutput.id[i],
      title: propertiesOutput.title[i],
      rate: propertiesOutput.rate[i],
    }));
    const combined = await Promise.all(
      properties.map(async (property) => {
        const result = await this.readByPropertyId(property.id.toString());
        let items = [];
        if (Array.isArray(result.Items)) {
          items = result.Items.map((rawItem) => unmarshall(rawItem));
        }

        return { ...property, items };
      })
    );
    return {
      message: "Booking returned: ",
      response: combined,
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

  async updateBookingStatus(id, status) {
    const client = await Database.getInstance();
    await client.createQueryBuilder().update(Booking).set({ status: status }).where("id = :id ", { id: id }).execute();

    if (query.length < 1) {
      return {
        message: "Booking couldn't be updated. Please contact the devs.",
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
