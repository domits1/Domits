import { Unauthorized } from "../util/exception/Unauthorized.js";
import { Forbidden } from "../util/exception/Forbidden.js";
import { NotFoundException } from "../util/exception/NotFoundException.js";

import { CognitoRepository } from "../data/repository/cognitoRepository.js";
import { PropertyRepository } from "../data/repository/propertyRepository.js";
import { BookingRepository } from "../data/repository/bookingRepository.js";

export class AuthManager {

    cognitoRepository;
    propertyRepository;
    bookingRepository;

    constructor(dynamoDbClient, systemManagerRepository) {
        this.cognitoRepository = new CognitoRepository();
        this.propertyRepository = new PropertyRepository(dynamoDbClient, systemManagerRepository);
        this.bookingRepository = new BookingRepository(dynamoDbClient, systemManagerRepository);
    }

    async authorizeGroupRequest(accessToken, group) {
        let user;
        try {
            user = await this.cognitoRepository.getUserByAccessToken(accessToken);
        } catch (error) {
            throw new Unauthorized("You must be logged in.");
        }
        const groupAttribute = user.UserAttributes.find((attribute) => attribute.Name === "custom:group");
        if (groupAttribute.Value !== group) {
            throw new Forbidden(`You must be a ${group}.`);
        }
        return user.Username;
    }

    async authorizeOwnerRequest(accessToken, id) {
        let user;
        try {
            user = await this.cognitoRepository.getUserByAccessToken(accessToken);
        } catch (error) {
            throw new Unauthorized("You must be logged in.");
        }
        let property;
        try {
            property = await this.propertyRepository.getPropertyById(id)
        } catch (error) {
            throw new NotFoundException("Property not found.");
        }
        if (property.hostId !== user.Username) {
            throw new Forbidden("You must be the owner of the property to access it.")
        }
    }

    async authorizeBookingGuestRequest(accessToken, bookingId) {
        let user;
        try {
            user = await this.cognitoRepository.getUserByAccessToken(accessToken);
        } catch (error) {
            throw new Unauthorized("You must be logged in.");
        }
        let booking;
        try {
            booking = await this.bookingRepository.getBookingById(bookingId)
        } catch (error) {
            throw new Forbidden("Booking not found.")
        }
        if (booking.guestId !== user.Username) {
            throw new Forbidden("You must be the guest of this booking to access it.")
        }
    }
}