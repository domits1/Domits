import { PropertyBuilder } from "../business/service/propertyBuilder.js";
import { PropertyService } from "../business/service/propertyService.js";
import { AuthManager } from "../auth/authManager.js";
import { SystemManagerRepository } from "../data/repository/systemManagerRepository.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };
import { NotFoundException } from "../util/exception/NotFoundException.js";

export class PropertyController {

    propertyService;
    authManager;

    constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
        this.authManager = new AuthManager(dynamoDbClient, systemManagerRepository);
        this.propertyService = new PropertyService(dynamoDbClient, systemManagerRepository);
    }

  
    async create(event) {
        try {
            const accessToken = event.headers.Authorization;
            const userId = await this.authManager.authorizeGroupRequest(accessToken, "Host")
            const eventBody = JSON.parse(event.body);
            const property = await this.createPropertyObject(new PropertyBuilder(), eventBody, userId);
            await this.propertyService.create(property);
            return {
                statusCode: 201,
                headers: responseHeaders,
                body: property.property.id
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

   
    async activateProperty(event) {
        try {
            const accessToken = event.headers.Authorization;
            const eventBody = JSON.parse(event.body);
            const propertyId = eventBody.property;

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            if (eventBody.automatedWelcomeMessage !== undefined || eventBody.automatedCheckinMessage !== undefined) {
                await this.propertyService.updateAutomatedMessages(
                    propertyId, 
                    eventBody.automatedWelcomeMessage, 
                    eventBody.automatedCheckinMessage
                );
                return {
                    statusCode: 200,
                    headers: responseHeaders,
                    body: JSON.stringify("Automated messages updated successfully.")
                }
            }

            await this.propertyService.activateProperty(propertyId);
            return {
                statusCode: 204,
                headers: responseHeaders
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }


    async getFullOwnedProperties(event) {
        try {
            const accessToken = event.headers.Authorization;
            const userId = await this.authManager.authorizeGroupRequest(accessToken, "Host")
            const properties = await this.propertyService.getFullPropertiesByHostId(userId)
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

    
    async getFullOwnedPropertyById(event) {
        try {
            const propertyId = event.queryStringParameters.property;
            await this.authManager.authorizeOwnerRequest(event.headers.Authorization, propertyId);
            const property = await this.propertyService.getFullPropertyByIdAsHost(propertyId);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(property)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

    async getActivePropertiesCardByType(event) {
        try {
            const type = event.queryStringParameters.type;
            if (type) {
                await this.propertyService.validatePropertyType(type);
            } else {
                throw new NotFoundException("No property type found.")
            }
            const properties = await this.propertyService.getActivePropertyCardsByType(type);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }


    async getActivePropertiesCard(event) {
        try {
            const lastEvaluatedKey = {
                createdAt: parseFloat(event.queryStringParameters?.lastEvaluatedKeyCreatedAt),
                id: event.queryStringParameters?.lastEvaluatedKeyId
            }
            const properties = await this.propertyService.getActivePropertyCards(lastEvaluatedKey);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }


    async getActivePropertiesCardByCountry(event) {
        try {
            const country = event.queryStringParameters.country;
            const lastEvaluatedKey = {
                id: event.queryStringParameters?.lastEvaluatedKeyId,
                city: event.queryStringParameters?.lastEvaluatedKeyCity
            }
            const properties = await this.propertyService.getActivePropertyCardsByCountry(country, lastEvaluatedKey)
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

   
    async getActivePropertiesCardByHostId(event) {
        try {
            const hostId = event.queryStringParameters.hostId;
            const properties = await this.propertyService.getActivePropertyCardsByHostId(hostId)
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

    async getActivePropertiesCardById(event) {
        try {
            const propertyIds = event.queryStringParameters.properties.split(",");
            if (propertyIds.length > 12) {
                throw new Error("You may only request 12 properties.")
            }
            const properties = await Promise.all(
                propertyIds.map(async propertyId => await this.propertyService.getActivePropertyCardById(propertyId))
            );
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

  
    async getFullActivePropertyById(event) {
        try {
            const propertyId = event.queryStringParameters.property;
            const property = await this.propertyService.getFullActivePropertyById(propertyId)
            const hostId = property.property.hostId
            const userInfo = await this.authManager.getUserInfoFromId(hostId);
            property.property.username = userInfo.userName;
            property.property.familyname = userInfo.familyName;

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(property)
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }
   
    async getFullPropertyByBookingId(event) {
        try {
            const bookingId = event.queryStringParameters.bookingId;
            await this.authManager.authorizeBookingGuestRequest(event.headers.Authorization, bookingId);
            const property = await this.propertyService.getFullPropertyByBookingId(bookingId);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(property)
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

  
    async delete(event) {
        try {
            const accessToken = event.headers.Authorization;
            const eventBody = JSON.parse(event.body);
            const propertyId = eventBody.property;
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            return {
                statusCode: 204,
                headers: responseHeaders,
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

   
    async createPropertyObject(propertyBuilder, body, userId) {
        let builder =
            await propertyBuilder.addBasePropertyInfo(body.property, body.propertyType.property_type, userId);

        builder = builder
            .addAvailability(body.propertyAvailability)
            .addCheckIn(body.propertyCheckIn)
            .addLocation(body.propertyLocation)
            .addPricing(body.propertyPricing)
            .addImages(body.propertyImages)
            .addPropertyType(body.propertyType);

        builder = await builder.addAmenities(body.propertyAmenities);
        builder = await builder.addGeneralDetails(body.propertyGeneralDetails);
        builder = await builder.addRules(body.propertyRules);
        builder = await builder.addAvailabilityRestrictions({restriction: "MaximumNightsPerYear", value: 30});

        if (builder.propertyType.property_type === "Boat" || builder.propertyType.property_type === "Camper") {
            builder = await builder.addTechnicalDetails(body.propertyTechnicalDetails)
        }

        return builder.build();
    }

}