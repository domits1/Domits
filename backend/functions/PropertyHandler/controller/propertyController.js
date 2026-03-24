import { PropertyBuilder } from "../business/service/propertyBuilder.js";
import { PropertyService } from "../business/service/propertyService.js";
import { AuthManager } from "../auth/authManager.js";
import { SystemManagerRepository } from "../data/repository/systemManagerRepository.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PropertyImageRepository } from "../data/repository/propertyImageRepository.js";
import { PropertyDraftRepository } from "../data/repository/propertyDraftRepository.js";
import { randomUUID } from "node:crypto";

import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };
import { NotFoundException } from "../util/exception/NotFoundException.js";

export class PropertyController {

    propertyService;
    authManager;

    constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
        this.authManager = new AuthManager(dynamoDbClient, systemManagerRepository);
        this.propertyService = new PropertyService(dynamoDbClient, systemManagerRepository);
        this.propertyImageRepository = new PropertyImageRepository(systemManagerRepository);
        this.propertyDraftRepository = new PropertyDraftRepository(systemManagerRepository);
    }

    // -------------------------
    // POST /property
    // -------------------------
    async create(event) {
        try {
            const accessToken = event.headers.Authorization;
            const userId = await this.authManager.authorizeGroupRequest(accessToken, "Host")
            const eventBody = JSON.parse(event.body);
            const imageUploadMode = eventBody?.imageUploadMode || "legacy";
            const propertyId = eventBody?.propertyId;

            if (imageUploadMode === "presigned") {
                if (!propertyId) {
                    return {
                        statusCode: 400,
                        headers: responseHeaders,
                        body: JSON.stringify({ message: "Missing propertyId." })
                    };
                }
                await this.authManager.authorizeDraftOwnerRequest(accessToken, propertyId);
                const readyCount = await this.propertyImageRepository.getReadyImageCountByPropertyId(propertyId);
                if (readyCount < 5) {
                    return {
                        statusCode: 400,
                        headers: responseHeaders,
                        body: JSON.stringify({ message: "Minimum of 5 images required." })
                    };
                }
                if (eventBody?.property) {
                    eventBody.property.id = propertyId;
                }
            }

            const property = await this.createPropertyObject(
                new PropertyBuilder(),
                eventBody,
                userId,
                { skipImages: imageUploadMode === "presigned" }
            );

            await this.propertyService.create(property, { skipImages: imageUploadMode === "presigned" });

            if (imageUploadMode === "presigned" && propertyId) {
                await this.propertyDraftRepository.deleteDraft(propertyId);
            }
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

            await this.authManager.authorizePropertyOrDraftOwnerRequest(accessToken, propertyId);
            await this.propertyDraftRepository.touchDraft(propertyId);

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
            await this.authManager.authorizePropertyOrDraftOwnerRequest(accessToken, propertyId);
            await this.propertyDraftRepository.touchDraft(propertyId);

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
    // DELETE /property/images
    // -------------------------
    async deletePropertyImage(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId;
            const imageId = eventBody.imageId;

            if (!propertyId || typeof propertyId !== "string") {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }

            if (!imageId || typeof imageId !== "string") {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing imageId." })
                };
            }

            await this.authManager.authorizePropertyOrDraftOwnerRequest(accessToken, propertyId);
            await this.propertyService.deleteImage(propertyId, imageId);

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
    // PATCH /property/overview
    // -------------------------
    async updatePropertyOverview(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const rawBody = JSON.parse(event.body || "{}");
            const overviewPayload = this.extractOverviewPayload(rawBody);
            const requestValidationMessage = this.validateOverviewPayload(overviewPayload);
            if (requestValidationMessage) {
                return this.badRequest(requestValidationMessage);
            }

            const normalizedOverviewPayload = this.normalizeOverviewPayload(overviewPayload);

            await this.authManager.authorizeOwnerRequest(accessToken, normalizedOverviewPayload.propertyId);
            await this.propertyService.updatePropertyOverview(
                normalizedOverviewPayload.propertyId,
                normalizedOverviewPayload.title,
                normalizedOverviewPayload.description,
                normalizedOverviewPayload.subtitle,
                {
                    capacity: normalizedOverviewPayload.capacity,
                    location: normalizedOverviewPayload.location,
                    pricing: normalizedOverviewPayload.pricing,
                    availabilityRestrictions: normalizedOverviewPayload.availabilityRestrictions,
                    amenities: normalizedOverviewPayload.amenities,
                    rules: normalizedOverviewPayload.rules,
                }
            );

            return {
                statusCode: 204,
                headers: responseHeaders,
            };
        } catch (error) {
            console.error(error);
            if (this.isOverviewClientError(error)) {
                return this.badRequest(error.message);
            }
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            }
        }
    }

    extractOverviewPayload(body) {
        return {
            propertyId: body.propertyId || body.property,
            title: body.title,
            description: body.description,
            subtitle: body.subtitle,
            capacity: body.capacity,
            location: body.location,
            pricing: body.pricing,
            availabilityRestrictions: body.availabilityRestrictions,
            amenities: body.amenities,
            rules: body.rules,
        };
    }

    validateOverviewPayload(payload) {
        return (
            this.validateOverviewRequiredFields(payload) ||
            this.validateOverviewOptionalObjects(payload) ||
            this.validatePricingPayload(payload.pricing) ||
            this.validateAvailabilityRestrictionsPayload(payload.availabilityRestrictions) ||
            this.validateAmenitiesPayload(payload.amenities) ||
            this.validateRulesPayload(payload.rules) ||
            this.validateOverviewTextContent(payload) ||
            this.validateCapacitySpaceType(payload.capacity) ||
            null
        );
    }

    validateOverviewRequiredFields(payload) {
        if (!payload.propertyId) {
            return "Missing propertyId.";
        }
        if (typeof payload.title !== "string" || typeof payload.description !== "string") {
            return "Title and description must be strings.";
        }
        if (payload.subtitle !== undefined && typeof payload.subtitle !== "string") {
            return "Subtitle must be a string.";
        }
        return null;
    }

    validateOverviewOptionalObjects(payload) {
        if (payload.capacity !== undefined && !this.isPlainObject(payload.capacity)) {
            return "Capacity must be an object.";
        }
        if (payload.location !== undefined && !this.isPlainObject(payload.location)) {
            return "Location must be an object.";
        }
        return null;
    }

    validatePricingPayload(pricing) {
        if (pricing === undefined) {
            return null;
        }
        if (!this.isPlainObject(pricing)) {
            return "Pricing must be an object.";
        }
        if (pricing.roomRate === undefined) {
            return "Pricing roomRate is required.";
        }
        const roomRate = Number(pricing.roomRate);
        if (!Number.isFinite(roomRate) || roomRate < 2) {
            return "Pricing roomRate must be a number greater than or equal to 2.";
        }
        if (pricing.cleaning !== undefined && pricing.cleaning !== null) {
            const cleaning = Number(pricing.cleaning);
            if (!Number.isFinite(cleaning) || cleaning < 0) {
                return "Pricing cleaning must be a number greater than or equal to 0.";
            }
        }
        return null;
    }

    validateAvailabilityRestrictionsPayload(availabilityRestrictions) {
        if (availabilityRestrictions === undefined) {
            return null;
        }
        if (!Array.isArray(availabilityRestrictions)) {
            return "Availability restrictions must be an array.";
        }
        const hasInvalidRestriction = availabilityRestrictions.some(
            (restriction) => !this.isValidAvailabilityRestrictionEntry(restriction)
        );
        if (hasInvalidRestriction) {
            return "Availability restrictions must contain { restriction: string, value: number }.";
        }
        return null;
    }

    isValidAvailabilityRestrictionEntry(restriction) {
        if (!restriction || typeof restriction !== "object" || Array.isArray(restriction)) {
            return false;
        }
        if (typeof restriction.restriction !== "string" || !restriction.restriction.trim()) {
            return false;
        }
        const value = Number(restriction.value);
        return Number.isFinite(value) && value >= 0;
    }

    validateAmenitiesPayload(amenities) {
        if (amenities === undefined) {
            return null;
        }
        if (!Array.isArray(amenities)) {
            return "Amenities must be an array.";
        }
        const hasInvalidAmenityValue = amenities.some(
            (amenityId) => typeof amenityId !== "string" && typeof amenityId !== "number"
        );
        if (hasInvalidAmenityValue) {
            return "Amenities must contain string or number IDs.";
        }
        return null;
    }

    validateRulesPayload(rules) {
        if (rules === undefined) {
            return null;
        }
        if (!Array.isArray(rules)) {
            return "Rules must be an array.";
        }
        const hasInvalidRuleEntry = rules.some((rule) => !this.isValidRulePayloadEntry(rule));
        if (hasInvalidRuleEntry) {
            return "Rules must contain { rule: string, value: boolean }.";
        }
        return null;
    }

    isValidRulePayloadEntry(rule) {
        return (
            rule &&
            typeof rule === "object" &&
            !Array.isArray(rule) &&
            typeof rule.rule === "string" &&
            typeof rule.value === "boolean"
        );
    }

    validateOverviewTextContent(payload) {
        if (!payload.title.trim() || !payload.description.trim()) {
            return "Title and description cannot be empty.";
        }
        return null;
    }

    validateCapacitySpaceType(capacity) {
        if (!capacity || capacity.spaceType === undefined) {
            return null;
        }
        if (typeof capacity.spaceType !== "string" || !capacity.spaceType.trim()) {
            return "Capacity spaceType cannot be empty.";
        }
        return null;
    }

    normalizeOverviewPayload(payload) {
        return {
            propertyId: payload.propertyId,
            title: payload.title.trim(),
            description: payload.description.trim(),
            subtitle: typeof payload.subtitle === "string" ? payload.subtitle.trim() : undefined,
            capacity: payload.capacity ? this.normalizeCapacityPayload(payload.capacity) : undefined,
            location: payload.location ? this.normalizeLocationPayload(payload.location) : undefined,
            pricing: payload.pricing ? this.normalizePricingPayload(payload.pricing) : undefined,
            availabilityRestrictions: Array.isArray(payload.availabilityRestrictions)
                ? this.normalizeAvailabilityRestrictionsPayload(payload.availabilityRestrictions)
                : undefined,
            amenities: Array.isArray(payload.amenities)
                ? Array.from(new Set(payload.amenities.map((amenityId) => String(amenityId).trim()).filter(Boolean)))
                : undefined,
            rules: Array.isArray(payload.rules)
                ? Array.from(
                    new Map(
                        payload.rules
                            .map((rule) => ({
                                rule: String(rule.rule || "").trim(),
                                value: Boolean(rule.value),
                            }))
                            .filter((rule) => rule.rule)
                            .map((rule) => [rule.rule, rule])
                    ).values()
                )
                : undefined,
        };
    }

    normalizePricingPayload(pricing) {
        const roomRate = Number(pricing.roomRate);
        if (!Number.isFinite(roomRate) || roomRate < 2) {
            throw new Error("Pricing roomRate must be a number greater than or equal to 2.");
        }
        const normalizedPricing = {
            roomRate: Math.trunc(roomRate),
        };
        if (pricing.cleaning !== undefined && pricing.cleaning !== null) {
            const cleaning = Number(pricing.cleaning);
            if (!Number.isFinite(cleaning) || cleaning < 0) {
                throw new Error("Pricing cleaning must be a number greater than or equal to 0.");
            }
            normalizedPricing.cleaning = Math.trunc(cleaning);
        }
        return normalizedPricing;
    }

    normalizeAvailabilityRestrictionsPayload(availabilityRestrictions) {
        return Array.from(
            new Map(
                availabilityRestrictions
                    .map((restriction) => ({
                        restriction: String(restriction.restriction || "").trim(),
                        value: Number(restriction.value),
                    }))
                    .filter((restriction) => restriction.restriction && Number.isFinite(restriction.value))
                    .map((restriction) => [
                        restriction.restriction,
                        {
                            restriction: restriction.restriction,
                            value: Math.max(0, Math.trunc(restriction.value)),
                        },
                    ])
            ).values()
        );
    }

    normalizeCapacityPayload(capacity) {
        const normalizedSpaceType = typeof capacity.spaceType === "string" ? capacity.spaceType.trim() : undefined;
        return {
            spaceType: normalizedSpaceType,
            guests: this.normalizeCapacityNumber(capacity.guests, "guests"),
            bedrooms: this.normalizeCapacityNumber(capacity.bedrooms, "bedrooms"),
            beds: this.normalizeCapacityNumber(capacity.beds, "beds"),
            bathrooms: this.normalizeCapacityNumber(capacity.bathrooms, "bathrooms"),
        };
    }

    normalizeCapacityNumber(value, field) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const parsedValue = Number(value);
        if (!Number.isFinite(parsedValue) || parsedValue < 0) {
            throw new Error(`Invalid capacity field: ${field}.`);
        }
        return Math.trunc(parsedValue);
    }

    normalizeLocationPayload(locationPayload) {
        const street = typeof locationPayload.street === "string" ? locationPayload.street.trim() : "";
        const postalCode = typeof locationPayload.postalCode === "string" ? locationPayload.postalCode.trim() : "";
        const city = typeof locationPayload.city === "string" ? locationPayload.city.trim() : "";
        const country = typeof locationPayload.country === "string" ? locationPayload.country.trim() : "";
        const extensionFromBody =
            typeof locationPayload.houseNumberExtension === "string"
                ? locationPayload.houseNumberExtension.trim()
                : "";

        const houseNumberRaw = locationPayload.houseNumber;
        let houseNumber = null;
        let houseNumberExtension = extensionFromBody;
        if (typeof houseNumberRaw === "number" && Number.isFinite(houseNumberRaw)) {
            houseNumber = Math.trunc(houseNumberRaw);
        } else if (typeof houseNumberRaw === "string") {
            const parsedHouseNumber = this.parseHouseNumberString(houseNumberRaw);
            if (!parsedHouseNumber) {
                throw new Error("Location houseNumber must start with a number.");
            }
            houseNumber = parsedHouseNumber.houseNumber;
            if (!houseNumberExtension) {
                houseNumberExtension = parsedHouseNumber.houseNumberExtension;
            }
        }

        if (!street || !postalCode || !city || !country || !Number.isFinite(houseNumber)) {
            throw new Error("Location requires street, houseNumber, postalCode, city and country.");
        }

        return {
            street,
            houseNumber,
            houseNumberExtension,
            postalCode,
            city,
            country,
        };
    }

    parseHouseNumberString(houseNumberValue) {
        const normalizedValue = String(houseNumberValue || "").trim();
        if (!normalizedValue) {
            return null;
        }

        let digitEndIndex = 0;
        while (
            digitEndIndex < normalizedValue.length &&
            normalizedValue[digitEndIndex] >= "0" &&
            normalizedValue[digitEndIndex] <= "9"
        ) {
            digitEndIndex += 1;
        }

        if (digitEndIndex === 0) {
            return null;
        }

        const parsedHouseNumber = Number(normalizedValue.slice(0, digitEndIndex));
        if (!Number.isFinite(parsedHouseNumber)) {
            return null;
        }

        return {
            houseNumber: Math.trunc(parsedHouseNumber),
            houseNumberExtension: normalizedValue.slice(digitEndIndex).trim(),
        };
    }

    isPlainObject(value) {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    isOverviewClientError(error) {
        return (
            error?.message?.startsWith("Invalid capacity field:") ||
            error?.message?.startsWith("Location ") ||
            error?.message?.startsWith("Pricing ") ||
            error?.message?.startsWith("Unknown availability restrictions:") ||
            error?.message?.startsWith("Unknown amenity IDs:") ||
            error?.message?.startsWith("Unknown policy rules:")
        );
    }

    badRequest(message) {
        return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message }),
        };
    }

    // -------------------------
    // PATCH /property
    // -------------------------
    async activateProperty(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId || eventBody.property;
            const requestedStatus = typeof eventBody.status === "string" ? eventBody.status.toUpperCase() : null;
            const allowedStatuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);

            if (!propertyId || typeof propertyId !== "string") {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }
            if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Invalid property status." })
                };
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            if (requestedStatus) {
                await this.propertyService.updatePropertyStatus(propertyId, requestedStatus);
            } else {
                await this.propertyService.activateProperty(propertyId);
            }
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
    // GET /property/bookingEngine/filter
    // -------------------------
    async getFilteredPropertyCards(event) {
        try {
            const filters = {
                minPrice: event.queryStringParameters?.minPrice ? Number.parseInt(event.queryStringParameters.minPrice) : undefined,
                maxPrice: event.queryStringParameters?.maxPrice ? Number.parseInt(event.queryStringParameters.maxPrice) : undefined,
                facilities: event.queryStringParameters?.facilities ? event.queryStringParameters.facilities.split(",") : undefined,
                type: event.queryStringParameters?.type ? event.queryStringParameters.type : undefined,
                seasons: event.queryStringParameters?.seasons ? event.queryStringParameters.seasons.split(",") : undefined,
                ecoScore: event.queryStringParameters?.ecoScore ? Number.parseInt(event.queryStringParameters.ecoScore) : undefined,
                country: event.queryStringParameters?.country ? event.queryStringParameters.country : undefined,
                guests: event.queryStringParameters?.guests ? Number.parseInt(event.queryStringParameters.guests) : undefined,
            };

            const properties = await this.propertyService.getFilteredPropertyCards(filters);
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
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId || eventBody.property;
            const reasons = Array.isArray(eventBody.reasons) ? eventBody.reasons : [];

            if (!propertyId || typeof propertyId !== "string") {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }

            const ownerId = await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const deletionResult = await this.propertyService.deleteProperty(propertyId, {
                reasons,
                actorId: ownerId,
            });
            if (deletionResult?.result === "archived") {
                return {
                    statusCode: 200,
                    headers: responseHeaders,
                    body: JSON.stringify({
                        result: "archived",
                        propertyId,
                        message: "Listing has booking history and was archived.",
                    }),
                };
            }
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
    // POST /property/draft
    // -------------------------
    async createDraft(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const userId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const propertyId = await this.propertyDraftRepository.createDraft(userId);
            return {
                statusCode: 201,
                headers: responseHeaders,
                body: JSON.stringify({ propertyId }),
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
    // DELETE /property/draft
    // -------------------------
    async deleteDraft(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = eventBody.propertyId;
            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Missing propertyId." })
                };
            }

            await this.authManager.authorizeDraftOwnerRequest(accessToken, propertyId);
            const existingProperty = await this.propertyService.getBasePropertyInfo(propertyId);
            if (existingProperty) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Property already exists." })
                };
            }

            await this.propertyImageRepository.deleteImagesByPropertyId(propertyId);
            await this.propertyDraftRepository.deleteDraft(propertyId);
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
    // Helper method (internal only)
    // -------------------------
    async createPropertyObject(propertyBuilder, body, userId, { skipImages = false } = {}) {
        let builder =
            await propertyBuilder.addBasePropertyInfo(body.property, body.propertyType.property_type, userId);

        builder = builder
            .addAvailability(body.propertyAvailability)
            .addCheckIn(body.propertyCheckIn)
            .addLocation(body.propertyLocation)
            .addPricing(body.propertyPricing)
            .addPropertyType(body.propertyType)
            .addPropertyTestStatus(body.propertyTestStatus);
        if (!skipImages) {
            builder = builder.addImages(body.propertyImages);
        }

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
