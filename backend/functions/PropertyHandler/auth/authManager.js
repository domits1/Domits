import { Unauthorized } from "../util/exception/Unauthorized.js";
import { Forbidden } from "../util/exception/Forbidden.js";
import { NotFoundException } from "../util/exception/NotFoundException.js";

import { CognitoRepository } from "../data/repository/cognitoRepository.js";
import { PropertyRepository } from "../data/repository/propertyRepository.js";
import { BookingRepository } from "../data/repository/bookingRepository.js";
import { PropertyDraftRepository } from "../data/repository/propertyDraftRepository.js";

export class AuthManager {

    cognitoRepository;
    propertyRepository;
    bookingRepository;
    propertyDraftRepository;

    constructor(dynamoDbClient, systemManagerRepository) {
        this.cognitoRepository = new CognitoRepository();
        this.propertyRepository = new PropertyRepository(dynamoDbClient, systemManagerRepository);
        this.bookingRepository = new BookingRepository(dynamoDbClient, systemManagerRepository);
        this.propertyDraftRepository = new PropertyDraftRepository(systemManagerRepository);
    }

    async getAuthorizedUser(accessToken) {
        try {
            return await this.cognitoRepository.getUserByAccessToken(accessToken);
        } catch (error) {
            const unauthorized = new Unauthorized("You must be logged in.");
            unauthorized.cause = error;
            throw unauthorized;
        }
    }

    async authorizeGroupRequest(accessToken, group) {
        const user = await this.getAuthorizedUser(accessToken);
        const groupAttribute = user.UserAttributes.find((attribute) => attribute.Name === "custom:group");
        if (groupAttribute.Value !== group) {
            throw new Forbidden(`You must be a ${group}.`);
        }
        return user.Username;
    }

    async authorizeOwnerRequest(accessToken, id) {
        const user = await this.getAuthorizedUser(accessToken);
        const property = await this.propertyRepository.getPropertyById(id)
        if (!property) {
            throw new NotFoundException("Property not found.")
        }
        if (property.hostId !== user.Username) {
            throw new Forbidden("You must be the owner of the property to access it.")
        }
    }

    async authorizeDraftOwnerRequest(accessToken, draftId) {
        const user = await this.getAuthorizedUser(accessToken);
        const draft = await this.propertyDraftRepository.getDraftById(draftId);
        if (!draft) {
            throw new NotFoundException("Property draft not found.");
        }
        if (draft.host_id !== user.Username) {
            throw new Forbidden("You must be the owner of the property draft to access it.");
        }
        return user.Username;
    }

    async authorizePropertyOrDraftOwnerRequest(accessToken, id) {
        const user = await this.getAuthorizedUser(accessToken);
        const property = await this.propertyRepository.getPropertyById(id);
        if (property) {
            if (property.hostId !== user.Username) {
                throw new Forbidden("You must be the owner of the property to access it.");
            }
            return { ownerId: user.Username, type: "property" };
        }

        const draft = await this.propertyDraftRepository.getDraftById(id);
        if (!draft) {
            throw new NotFoundException("Property not found.");
        }
        if (draft.host_id !== user.Username) {
            throw new Forbidden("You must be the owner of the property draft to access it.");
        }
        return { ownerId: user.Username, type: "draft" };
    }

    async authorizeBookingGuestRequest(accessToken, bookingId) {
        const user = await this.getAuthorizedUser(accessToken);
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

    async getUserInfoFromId(id){
        try {
        const userData = await this.cognitoRepository.getUserById(id);
        const givenUserName = userData.UserAttributes.find(a => a.Name === "given_name")?.Value;
        const givenFamilyName = userData.UserAttributes.find(a => a.Name === "family_name")?.Value;
        return {
            userName: givenUserName,
            familyName: givenFamilyName
        }
        } catch (error) {
            console.error(error);
            throw new NotFoundException("Could not request the property's userid.");
        }


    }
}