import { PropertyBuilder } from "../business/service/propertyBuilder.js";
import { PropertyService } from "../business/service/propertyService.js";
import { AuthManager } from "../auth/authManager.js";
import { SystemManagerRepository } from "../data/repository/systemManagerRepository.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PropertyImageRepository } from "../data/repository/propertyImageRepository.js";
import { randomUUID } from "crypto";

import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };
import { NotFoundException } from "../util/exception/NotFoundException.js";

export class PropertyController {

    propertyService;
    authManager;

    constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
        this.authManager = new AuthManager(dynamoDbClient, systemManagerRepository);
        this.propertyService = new PropertyService(dynamoDbClient, systemManagerRepository);
        this.propertyImageRepository = new PropertyImageRepository(systemManagerRepository);
    }

    // -------------------------
    // POST /property
    // -------------------------
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

    // -------------------------
    // POST /property/images/presign
    // -------------------------
    async createImageUploadUrls(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId;
            const files = Array.isArray(eventBody.files) ? eventBody.files : [];

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            if (files.length === 0) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "No files provided." })
                };
            }

            if (files.length > 30) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Maximum of 30 images allowed." })
                };
            }

            const existingCount = await this.propertyImageRepository.getImageCountByPropertyId(propertyId);
            if (existingCount + files.length > 30) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Maximum of 30 images allowed." })
                };
            }

            const uploads = [];
            for (const file of files) {
                const contentType = file?.contentType || "";
                const sizeBytes = Number(file?.size || 0);
                if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
                    throw new Error("Invalid file size.");
                }
                if (sizeBytes > 5 * 1024 * 1024) {
                    throw new Error("Image exceeds maximum upload size.");
                }
                const imageId = randomUUID();
                const presign = await this.propertyImageRepository.createPresignedOriginalUpload(
                    propertyId,
                    imageId,
                    contentType
                );
                uploads.push({
                    imageId,
                    key: presign.key,
                    url: presign.url,
                    contentType,
                    size: sizeBytes,
                });
            }

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify({ uploads })
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

    // -------------------------
    // POST /property/images/confirm
    // -------------------------
    async confirmImageUploads(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId;
            const images = Array.isArray(eventBody.images) ? eventBody.images : [];

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            if (images.length === 0) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "No images provided." })
                };
            }

            const processed = [];
            for (const image of images) {
                const imageId = image?.imageId;
                const originalKey = image?.originalKey;
                const sortOrder = Number(image?.sortOrder || 0);
                if (!imageId || !originalKey) {
                    throw new Error("Missing imageId or originalKey.");
                }
                const result = await this.propertyImageRepository.processUploadedImage({
                    propertyId,
                    imageId,
                    originalKey,
                    sortOrder
                });
                processed.push(result);
            }

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify({ images: processed })
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

    // -------------------------
    // PATCH /property/images/order
    // -------------------------
    async updateImageOrder(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId;
            const images = Array.isArray(eventBody.images) ? eventBody.images : [];

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            if (images.length === 0) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "No images provided." })
                };
            }

            const normalized = images.map((image, index) => ({
                image_id: image.imageId,
                sort_order: Number.isFinite(Number(image.sortOrder))
                    ? Number(image.sortOrder)
                    : index,
            }));

            await this.propertyImageRepository.updateImageOrder(propertyId, normalized);

            return {
                statusCode: 204,
                headers: responseHeaders,
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

    // -------------------------
    // PATCH /property
    // -------------------------
    async activateProperty(event) {
        try {
            const accessToken = event.headers.Authorization;
            const eventBody = JSON.parse(event.body);
            const propertyId = eventBody.property
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId)
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

    // -------------------------
    // GET /property/hostDashboard/all
    // -------------------------
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

    // -------------------------
    // GET /property/hostDashboard/single
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/byType
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/all
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/country
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/byHostId
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/set
    // -------------------------
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

    // -------------------------
    // GET /property/bookingEngine/listingDetails
    // -------------------------
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
    // -------------------------
    // GET /property/bookingEngine/booking
    // -------------------------
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

    // -------------------------
    // DELETE /property
    // -------------------------
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

    // -------------------------
    // Helper method (internal only)
    // -------------------------
    async createPropertyObject(propertyBuilder, body, userId) {
        let builder =
            await propertyBuilder.addBasePropertyInfo(body.property, body.propertyType.property_type, userId);

        builder = builder
            .addAvailability(body.propertyAvailability)
            .addCheckIn(body.propertyCheckIn)
            .addLocation(body.propertyLocation)
            .addPricing(body.propertyPricing)
            .addImages(body.propertyImages)
            .addPropertyType(body.propertyType)
            .addPropertyTestStatus(body.propertyTestStatus);

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