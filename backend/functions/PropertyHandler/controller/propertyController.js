import { PropertyBuilder } from "../business/service/propertyBuilder.js";
import { PropertyService } from "../business/service/propertyService.js";
import { AuthManager } from "../auth/authManager.js";
import { SystemManagerRepository } from "../data/repository/systemManagerRepository.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PropertyImageRepository } from "../data/repository/propertyImageRepository.js";
import { PropertyDraftRepository } from "../data/repository/propertyDraftRepository.js";
import { DirectBookingWebsiteDraftRepository } from "../data/repository/directBookingWebsiteDraftRepository.js";
import { DirectBookingWebsiteEventRepository } from "../data/repository/directBookingWebsiteEventRepository.js";
import { DirectBookingWebsiteSiteRepository } from "../data/repository/directBookingWebsiteSiteRepository.js";
import { DirectBookingWebsiteDomainRepository } from "../data/repository/directBookingWebsiteDomainRepository.js";
import { randomUUID } from "node:crypto";
import { PriceLabsCalendarNotifier } from "../business/service/priceLabsCalendarNotifier.js";
import ChannexCalendarChangeSyncClient, {
    createCalendarChangeFallbackEvidence,
} from "../business/service/channexCalendarChangeSyncClient.js";

import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };
import { NotFoundException } from "../util/exception/NotFoundException.js";
import {
    getDirectBookingWebsiteFallbackDomainSuffix,
    isDirectBookingWebsiteFallbackDomain,
    isDirectBookingWebsiteFallbackRoutingActive,
    getDirectBookingWebsiteFallbackRoutingStatus,
    resolveDirectBookingWebsiteFallbackDomainStatus,
} from "../util/directBookingWebsiteRouting.js";

const draftResponseHeaders = {
    ...responseHeaders,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
};

const WEBSITE_HOST_ANALYTICS_EVENT_TYPES = new Set([
    "WEBSITE_BUILD_STARTED",
    "WEBSITE_PREVIEW_READY",
    "WEBSITE_BUILD_SUCCEEDED",
    "WEBSITE_BUILD_FAILED",
    "WEBSITE_BUILD_FLOW_STARTED",
    "WEBSITE_BUILD_FLOW_ABANDONED",
]);

const WEBSITE_PUBLIC_ANALYTICS_EVENT_TYPES = new Set([
    "SITE_LCP_RECORDED",
]);

const WEBSITE_ANALYTICS_SURFACES = new Set(["preview", "live"]);
const WEBSITE_ANALYTICS_VIEWPORTS = new Set(["mobile", "tablet", "desktop"]);
const DIRECT_BOOKING_WEBSITE_PUBLIC_STATUSES = new Set(["DRAFT", "PREVIEW", "PUBLISHED", "SUSPENDED"]);
const DIRECT_BOOKING_WEBSITE_DOMAIN_STATUSES = new Set(["PENDING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED"]);
const DIRECT_BOOKING_WEBSITE_DOMAIN_TYPE_FALLBACK = "FALLBACK";
const CHANNEX_GLOBAL_CALENDAR_CHANGE_SYNC_DAYS = 500;
const CALENDAR_CHANGE_FIELD_GROUPS = Object.freeze({
    availability: ["isAvailable"],
    rates: ["nightlyPrice"],
    restrictions: ["stopSell", "closedToArrival", "closedToDeparture", "minStay", "maxStay"],
});

const cleanWebsiteText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isAsciiLowercaseLetter = (value) => value >= "a" && value <= "z";
const isAsciiDigit = (value) => value >= "0" && value <= "9";
const isAsciiLowercaseLetterOrDigit = (value) => isAsciiLowercaseLetter(value) || isAsciiDigit(value);
const trimRepeatedCharacterEdges = (value, character) => {
    let startIndex = 0;
    let endIndex = value.length;

    while (startIndex < endIndex && value[startIndex] === character) {
        startIndex += 1;
    }

    while (endIndex > startIndex && value[endIndex - 1] === character) {
        endIndex -= 1;
    }

    return value.slice(startIndex, endIndex);
};
const compareAsString = (left, right) => String(left).localeCompare(String(right));
const slugifyWebsiteDomainLabel = (value) => {
    const normalizedValue = cleanWebsiteText(value).normalize("NFKD").toLowerCase();
    let sanitizedValue = "";
    let previousCharacterWasHyphen = false;

    for (const currentCharacter of normalizedValue) {
        const isAsciiCharacter = (currentCharacter.codePointAt(0) || 0) <= 0x7f;
        if (!isAsciiCharacter) {
            continue;
        }

        if (isAsciiLowercaseLetterOrDigit(currentCharacter)) {
            sanitizedValue += currentCharacter;
            previousCharacterWasHyphen = false;
            continue;
        }

        if (!previousCharacterWasHyphen) {
            sanitizedValue += "-";
            previousCharacterWasHyphen = true;
        }
    }

    sanitizedValue = trimRepeatedCharacterEdges(sanitizedValue, "-");

    return sanitizedValue || "site";
};
const normalizeDirectBookingWebsiteIdSuffix = (value) => {
    let sanitizedValue = "";

    for (const currentCharacter of cleanWebsiteText(value).toLowerCase()) {
        if (isAsciiLowercaseLetterOrDigit(currentCharacter)) {
            sanitizedValue += currentCharacter;
        }
    }

    return sanitizedValue;
};
const buildLiveSiteDomainLabel = (siteName, siteId) => {
    const slugBase = trimRepeatedCharacterEdges(slugifyWebsiteDomainLabel(siteName).slice(0, 40), "-") || "site";
    const idSuffix = normalizeDirectBookingWebsiteIdSuffix(siteId).slice(0, 8) || "domits";
    const combinedLabel = `${slugBase}-${idSuffix}`;
    return trimRepeatedCharacterEdges(combinedLabel.slice(0, 63), "-");
};
const buildLiveSiteDomain = (siteName, siteId) =>
    `${buildLiveSiteDomainLabel(siteName, siteId)}.${getDirectBookingWebsiteFallbackDomainSuffix()}`;
const extractLiveSiteDomainIdSuffix = (domain) => {
    const normalizedDomain = normalizeDirectBookingWebsiteDomainInput(domain);
    const suffix = getDirectBookingWebsiteFallbackDomainSuffix();
    if (!normalizedDomain || !normalizedDomain.endsWith(`.${suffix}`)) {
        return "";
    }

    const hostLabel = normalizedDomain.slice(0, -(suffix.length + 1));
    const labelParts = hostLabel.split("-").filter(Boolean);
    return labelParts[labelParts.length - 1] || "";
};
const normalizeDirectBookingWebsiteDomainInput = (value) => {
    const normalizedValue = cleanWebsiteText(value).toLowerCase();
    if (!normalizedValue) {
        return "";
    }

    const withoutProtocol = normalizedValue.replace(/^https?:\/\//, "");
    const hostSegment = withoutProtocol.split("/")[0] || "";
    return hostSegment.split(":")[0] || "";
};
const getRequestHostHeaderValue = (headers = {}) =>
    headers["x-forwarded-host"] ||
    headers["X-Forwarded-Host"] ||
    headers.host ||
    headers.Host ||
    "";
const resolveDirectBookingWebsiteRuntimeDomainStatus = (site, domainEntry = {}) => {
    const resolvedStatus = resolveDirectBookingWebsiteFallbackDomainStatus(domainEntry);
    const shouldTreatPublishedFallbackDomainAsActive =
        String(site?.status || "").trim().toUpperCase() === "PUBLISHED" &&
        isDirectBookingWebsiteFallbackRoutingActive() &&
        isDirectBookingWebsiteFallbackDomain(domainEntry) &&
        resolvedStatus === "DISABLED" &&
        domainEntry?.verificationDetails?.disabledByHost === true;

    return shouldTreatPublishedFallbackDomainAsActive ? "ACTIVE" : resolvedStatus;
};

export class PropertyController {

    propertyService;
    authManager;

    constructor(
        dynamoDbClient = new DynamoDBClient({}),
        systemManagerRepository = new SystemManagerRepository(),
        { channexCalendarChangeSyncClient = new ChannexCalendarChangeSyncClient() } = {}
    ) {
        this.authManager = new AuthManager(dynamoDbClient, systemManagerRepository);
        this.propertyService = new PropertyService(dynamoDbClient, systemManagerRepository);
        this.propertyImageRepository = new PropertyImageRepository(systemManagerRepository);
        this.propertyDraftRepository = new PropertyDraftRepository(systemManagerRepository);
        this.directBookingWebsiteDraftRepository = new DirectBookingWebsiteDraftRepository(systemManagerRepository);
        this.directBookingWebsiteEventRepository = new DirectBookingWebsiteEventRepository(systemManagerRepository);
        this.directBookingWebsiteSiteRepository = new DirectBookingWebsiteSiteRepository(systemManagerRepository);
        this.directBookingWebsiteDomainRepository = new DirectBookingWebsiteDomainRepository(systemManagerRepository);
        this.channexCalendarChangeSyncClient = channexCalendarChangeSyncClient;
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

            await new PriceLabsCalendarNotifier().notifyListingChange(userId);

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

            if (files.length > 60) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Maximum of 60 images allowed." })
                };
            }

            const existingCount = await this.propertyImageRepository.getImageCountByPropertyId(propertyId);
            if (existingCount + files.length > 60) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Maximum of 60 images allowed." })
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

            const hostId = await this.authManager.authorizeOwnerRequest(accessToken, normalizedOverviewPayload.propertyId);
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
                    checkIn: normalizedOverviewPayload.checkIn,
                    amenities: normalizedOverviewPayload.amenities,
                    rules: normalizedOverviewPayload.rules,
                    bookingType: normalizedOverviewPayload.bookingType,
                }
            );

            await new PriceLabsCalendarNotifier().notifyListingChange(hostId);
            await this.notifyChannexOverviewCalendarChange({
                hostId,
                propertyId: normalizedOverviewPayload.propertyId,
                normalizedOverviewPayload,
            });

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

    // -------------------------
    // GET /property/calendar/overrides
    // -------------------------
    async getPropertyCalendarOverrides(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const query = event.queryStringParameters || {};
            const propertyId = String(query.propertyId || query.property || "").trim();
            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            const normalizedRange = this.normalizeCalendarOverrideRangePayload(query);
            await this.authManager.authorizePropertyCalendarOverrideRequest(accessToken, propertyId);

            const overrides = await this.propertyService.getPropertyCalendarOverrides(propertyId, normalizedRange);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify({
                    propertyId,
                    overrides,
                }),
            };
        } catch (error) {
            console.error(error);
            if (this.isCalendarOverrideClientError(error)) {
                return this.badRequest(error.message);
            }
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            };
        }
    }

    // -------------------------
    // PATCH /property/calendar/overrides
    // -------------------------
    async updatePropertyCalendarOverrides(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const body = JSON.parse(event.body || "{}");
            const propertyId = String(body.propertyId || body.property || "").trim();
            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }
            if (!Array.isArray(body.overrides)) {
                return this.badRequest("Calendar overrides must be an array.");
            }

            const normalizedOverrides = this.normalizeCalendarOverridesPayload(body.overrides);
            if (normalizedOverrides.length < 1) {
                return this.badRequest("Calendar overrides array is empty.");
            }

            const normalizedRange = this.normalizeCalendarOverrideRangePayload(body);
            const hostId = await this.authManager.authorizePropertyCalendarOverrideRequest(accessToken, propertyId);
            const previousOverrides = await this.getPreviousCalendarOverridesForChanges(propertyId, normalizedOverrides);

            const overrides = await this.propertyService.updatePropertyCalendarOverrides(
                propertyId,
                normalizedOverrides,
                normalizedRange
            );

            await new PriceLabsCalendarNotifier().notifyCalendarChange(hostId);
            const channexCalendarChangeSync = await this.notifyChannexCalendarOverrideChange({
                hostId,
                propertyId,
                previousOverrides,
                normalizedOverrides,
            });

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify({
                    propertyId,
                    overrides,
                    channexCalendarChangeSync,
                }),
            };
        } catch (error) {
            console.error(error);
            if (this.isCalendarOverrideClientError(error)) {
                return this.badRequest(error.message);
            }
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            };
        }
    }

    calendarDateIntToIsoDate(value) {
        const rawValue = String(value || "").trim();
        if (!/^\d{8}$/.test(rawValue)) {
            return null;
        }
        return `${rawValue.slice(0, 4)}-${rawValue.slice(4, 6)}-${rawValue.slice(6, 8)}`;
    }

    buildCalendarOverrideMap(overrides) {
        return new Map(
            (Array.isArray(overrides) ? overrides : [])
                .map((override) => {
                    const date = Number(override?.calendarDate ?? override?.date);
                    return Number.isInteger(date) ? [date, override] : null;
                })
                .filter(Boolean)
        );
    }

    compareCalendarOverrideField(previousOverride, nextOverride, field) {
        const previousValue = previousOverride?.[field] ?? null;
        const nextValue = nextOverride?.[field] ?? null;
        return previousValue !== nextValue;
    }

    collectCalendarOverrideChangeTypes(previousOverrides, normalizedOverrides) {
        const previousByDate = this.buildCalendarOverrideMap(previousOverrides);
        const changeTypes = new Set();
        const changedDates = [];

        for (const override of normalizedOverrides) {
            const previousOverride = previousByDate.get(override.calendarDate) || {};
            const dateChangeTypes = Object.entries(CALENDAR_CHANGE_FIELD_GROUPS)
                .filter(([, fields]) =>
                    fields.some((field) => this.compareCalendarOverrideField(previousOverride, override, field))
                )
                .map(([changeType]) => changeType);

            if (dateChangeTypes.length) {
                changedDates.push(this.calendarDateIntToIsoDate(override.calendarDate));
                dateChangeTypes.forEach((changeType) => changeTypes.add(changeType));
            }
        }

        return {
            changedDates: changedDates.filter(Boolean).sort(compareAsString),
            changeTypes: Array.from(changeTypes).sort(compareAsString),
        };
    }

    async getPreviousCalendarOverridesForChanges(propertyId, normalizedOverrides) {
        const dates = normalizedOverrides.map((override) => Number(override.calendarDate)).filter(Number.isInteger);
        if (!dates.length) return [];

        return await this.propertyService.getPropertyCalendarOverrides(propertyId, {
            startDate: Math.min(...dates),
            endDate: Math.max(...dates),
        });
    }

    async notifyChannexCalendarOverrideChange({
        hostId,
        propertyId,
        previousOverrides,
        normalizedOverrides,
    }) {
        const { changedDates, changeTypes } = this.collectCalendarOverrideChangeTypes(
            previousOverrides,
            normalizedOverrides
        );
        const payload = {
            userId: hostId,
            domitsPropertyId: propertyId,
            changedDates,
            changeTypes,
            source: "HOST_CALENDAR_OVERRIDES_CHANGED",
        };

        if (!changedDates.length || !changeTypes.length) {
            return createCalendarChangeFallbackEvidence({
                payload,
                skipped: true,
                reason: "NO_CHANNEX_RELEVANT_CALENDAR_CHANGES",
            });
        }

        return await this.channexCalendarChangeSyncClient.syncCalendarChange(payload);
    }

    getForwardCalendarSyncRange() {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + CHANNEX_GLOBAL_CALENDAR_CHANGE_SYNC_DAYS - 1);

        return {
            dateFrom: startDate.toISOString().slice(0, 10),
            dateTo: endDate.toISOString().slice(0, 10),
        };
    }

    getOverviewCalendarChangeTypes(normalizedOverviewPayload) {
        const changeTypes = [];
        if (normalizedOverviewPayload.pricing !== undefined) {
            changeTypes.push("rates");
        }
        if (normalizedOverviewPayload.availabilityRestrictions !== undefined) {
            changeTypes.push("restrictions");
        }
        return changeTypes;
    }

    async notifyChannexOverviewCalendarChange({ hostId, propertyId, normalizedOverviewPayload }) {
        const changeTypes = this.getOverviewCalendarChangeTypes(normalizedOverviewPayload);
        if (!changeTypes.length) return null;

        const payload = {
            userId: hostId,
            domitsPropertyId: propertyId,
            ...this.getForwardCalendarSyncRange(),
            changeTypes,
            source: "HOST_CALENDAR_GLOBAL_SETTINGS_CHANGED",
        };

        return await this.channexCalendarChangeSyncClient.syncCalendarChange(payload);
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
            checkIn: body.checkIn,
            amenities: body.amenities,
            rules: body.rules,
            bookingType: body.bookingType,
        };
    }

    validateOverviewPayload(payload) {
        return (
            this.validateOverviewRequiredFields(payload) ||
            this.validateOverviewOptionalObjects(payload) ||
            this.validatePricingPayload(payload.pricing) ||
            this.validateAvailabilityRestrictionsPayload(payload.availabilityRestrictions) ||
            this.validateCheckInPayload(payload.checkIn) ||
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
        if (payload.checkIn !== undefined && !this.isPlainObject(payload.checkIn)) {
            return "Check-in must be an object.";
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

        const weekendRateRaw =
            pricing.weekendRate ?? pricing.weekendrate ?? pricing.weekendPrice ?? pricing.weekendprice;
        if (weekendRateRaw !== undefined && weekendRateRaw !== null && weekendRateRaw !== "") {
            const weekendRate = Number(weekendRateRaw);
            if (!Number.isFinite(weekendRate) || weekendRate < 2) {
                return "Pricing weekendRate must be a number greater than or equal to 2.";
            }
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

    validateCheckInPayload(checkIn) {
        if (checkIn === undefined) {
            return null;
        }
        if (!this.isPlainObject(checkIn)) {
            return "Check-in must be an object.";
        }
        if (!this.isPlainObject(checkIn.checkIn) || !this.isPlainObject(checkIn.checkOut)) {
            return "Check-in must contain checkIn and checkOut objects.";
        }

        const normalizedCheckInFrom = this.normalizeTimeValue(checkIn.checkIn.from, "Check-in from");
        const normalizedCheckInTill = this.normalizeTimeValue(checkIn.checkIn.till, "Check-in till");
        const normalizedCheckOutFrom = this.normalizeTimeValue(checkIn.checkOut.from, "Check-out from");
        const normalizedCheckOutTill = this.normalizeTimeValue(checkIn.checkOut.till, "Check-out till");

        if (!normalizedCheckInFrom || !normalizedCheckInTill || !normalizedCheckOutFrom || !normalizedCheckOutTill) {
            return "Check-in must contain valid time values.";
        }
        return null;
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

    resolveBookingType(value) {
        if (value === "inquiry" || value === "direct") {
            return value;
        }
        return undefined;
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
            checkIn: payload.checkIn ? this.normalizeCheckInPayload(payload.checkIn) : undefined,
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
            bookingType: this.resolveBookingType(payload.bookingType),
        };
    }

    normalizeCheckInPayload(checkIn) {
        if (!this.isPlainObject(checkIn) || !this.isPlainObject(checkIn.checkIn) || !this.isPlainObject(checkIn.checkOut)) {
            throw new TypeError("Check-in must contain checkIn and checkOut objects.");
        }

        return {
            checkIn: {
                from: this.normalizeTimeValue(checkIn.checkIn.from, "Check-in from"),
                till: this.normalizeTimeValue(checkIn.checkIn.till, "Check-in till"),
            },
            checkOut: {
                from: this.normalizeTimeValue(checkIn.checkOut.from, "Check-out from"),
                till: this.normalizeTimeValue(checkIn.checkOut.till, "Check-out till"),
            },
        };
    }

    normalizeTimeValue(value, fieldName) {
        if (typeof value !== "string") {
            throw new TypeError(`${fieldName} must be a valid time string.`);
        }

        const normalizedValue = value.trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(normalizedValue)) {
            throw new TypeError(`${fieldName} must be a valid time string.`);
        }
        return normalizedValue.length === 5 ? `${normalizedValue}:00` : normalizedValue;
    }

    normalizePricingPayload(pricing) {
        const roomRate = Number(pricing.roomRate);
        if (!Number.isFinite(roomRate) || roomRate < 2) {
            throw new Error("Pricing roomRate must be a number greater than or equal to 2.");
        }
        const normalizedPricing = {
            roomRate: Math.trunc(roomRate),
        };

        const weekendRateRaw =
            pricing.weekendRate ?? pricing.weekendrate ?? pricing.weekendPrice ?? pricing.weekendprice;
        if (weekendRateRaw !== undefined && weekendRateRaw !== null && weekendRateRaw !== "") {
            const weekendRate = Number(weekendRateRaw);
            if (!Number.isFinite(weekendRate) || weekendRate < 2) {
                throw new Error("Pricing weekendRate must be a number greater than or equal to 2.");
            }
            normalizedPricing.weekendRate = Math.trunc(weekendRate);
        }

        if (pricing.cleaning !== undefined && pricing.cleaning !== null) {
            const cleaning = Number(pricing.cleaning);
            if (!Number.isFinite(cleaning) || cleaning < 0) {
                throw new Error("Pricing cleaning must be a number greater than or equal to 0.");
            }
            normalizedPricing.cleaning = Math.trunc(cleaning);
        }
        return normalizedPricing;
    }

    normalizeCalendarOverrideRangePayload(payload) {
        const startDateRaw = payload?.startDate ?? payload?.fromDate ?? payload?.dateFrom;
        const endDateRaw = payload?.endDate ?? payload?.toDate ?? payload?.dateTo;

        const startDate =
            startDateRaw === undefined || startDateRaw === null || startDateRaw === ""
                ? null
                : this.normalizeCalendarDateValue(startDateRaw, "startDate");
        const endDate =
            endDateRaw === undefined || endDateRaw === null || endDateRaw === ""
                ? null
                : this.normalizeCalendarDateValue(endDateRaw, "endDate");

        if (startDate && endDate) {
            return {
                startDate: Math.min(startDate, endDate),
                endDate: Math.max(startDate, endDate),
            };
        }

        if (startDate) {
            return { startDate };
        }
        if (endDate) {
            return { endDate };
        }
        return {};
    }

    normalizeCalendarOverridesPayload(overrides) {
        const normalizedOverrides = Array.from(
            new Map(
                (Array.isArray(overrides) ? overrides : [])
                    .map((entry) => {
                        if (!this.isPlainObject(entry)) {
                            throw new TypeError("Calendar overrides must contain objects.");
                        }

                        const dateRaw = entry.date ?? entry.calendarDate ?? entry.day;
                        const calendarDate = this.normalizeCalendarDateValue(dateRaw, "date");

                        const nightlyPriceRaw =
                            entry.nightlyPrice ??
                            entry.nightly_rate ??
                            entry.price;

                        let nightlyPrice = null;
                        if (
                            nightlyPriceRaw !== undefined &&
                            nightlyPriceRaw !== null &&
                            nightlyPriceRaw !== ""
                        ) {
                            const parsedNightlyPrice = Number(nightlyPriceRaw);
                            if (!Number.isFinite(parsedNightlyPrice) || parsedNightlyPrice < 2) {
                                throw new Error(
                                    "Calendar override nightlyPrice must be a number greater than or equal to 2."
                                );
                            }
                            nightlyPrice = Math.trunc(parsedNightlyPrice);
                        }

                        const isAvailable = this.normalizeCalendarOverrideBoolean(
                            entry.isAvailable,
                            "isAvailable"
                        );
                        const stopSell = this.normalizeCalendarOverrideBoolean(
                            entry.stopSell ?? entry.stop_sell,
                            "stopSell"
                        );
                        const closedToArrival = this.normalizeCalendarOverrideBoolean(
                            entry.closedToArrival ?? entry.closed_to_arrival,
                            "closedToArrival"
                        );
                        const closedToDeparture = this.normalizeCalendarOverrideBoolean(
                            entry.closedToDeparture ?? entry.closed_to_departure,
                            "closedToDeparture"
                        );
                        const minStay = this.normalizeCalendarOverrideOptionalInteger(
                            entry.minStay ?? entry.min_stay,
                            "minStay"
                        );
                        const maxStay = this.normalizeCalendarOverrideOptionalInteger(
                            entry.maxStay ?? entry.max_stay,
                            "maxStay"
                        );

                        const priceLabsIgnoredRaw = entry.priceLabsIgnored ?? entry.pricelabs_ignored;
                        const priceLabsIgnored = priceLabsIgnoredRaw === null || priceLabsIgnoredRaw === undefined
                            ? null : Boolean(priceLabsIgnoredRaw);

                        return [
                            calendarDate,
                            {
                                calendarDate,
                                isAvailable,
                                nightlyPrice,
                                priceLabsIgnored,
                                stopSell,
                                closedToArrival,
                                closedToDeparture,
                                minStay,
                                maxStay,
                            },
                        ];
                    })
                    .filter(Boolean)
            ).values()
        );

        return normalizedOverrides;
    }

    normalizeCalendarOverrideOptionalInteger(value, fieldName) {
        if (
            value === undefined ||
            value === null ||
            value === "" ||
            (typeof value === "string" && value.trim() === "")
        ) {
            return null;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error(`Calendar override ${fieldName} must be a number greater than or equal to 0.`);
        }
        return Math.trunc(parsed);
    }

    normalizeCalendarOverrideBoolean(value, fieldName) {
        if (value === undefined || value === null || value === "") {
            return null;
        }
        if (typeof value === "boolean") {
            return value;
        }
        if (typeof value === "number") {
            if (value === 1) {
                return true;
            }
            if (value === 0) {
                return false;
            }
        }
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true" || normalized === "1") {
                return true;
            }
            if (normalized === "false" || normalized === "0") {
                return false;
            }
        }
        throw new Error(`Calendar override ${fieldName} must be a boolean.`);
    }

    normalizeCalendarDateValue(value, fieldName) {
        if (value === undefined || value === null || value === "") {
            throw new Error(`Calendar override ${fieldName} is required.`);
        }

        if (typeof value === "string") {
            const trimmed = value.trim();
            const ymdParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
            if (ymdParts) {
                const year = Number(ymdParts[1]);
                const month = Number(ymdParts[2]);
                const day = Number(ymdParts[3]);
                return this.normalizeCalendarDateParts(year, month, day, fieldName);
            }

            if (/^\d{8}$/.test(trimmed)) {
                const numericDate = Number(trimmed);
                return this.normalizeCalendarDateInteger(numericDate, fieldName);
            }
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            throw new Error(`Calendar override ${fieldName} is invalid.`);
        }

        const truncatedValue = Math.trunc(numericValue);
        if (truncatedValue >= 10000101 && truncatedValue <= 99991231) {
            return this.normalizeCalendarDateInteger(truncatedValue, fieldName);
        }

        const milliseconds = truncatedValue > 1000000000000 ? truncatedValue : truncatedValue * 1000;
        const date = new Date(milliseconds);
        if (Number.isNaN(date.getTime())) {
            throw new TypeError(`Calendar override ${fieldName} is invalid.`);
        }

        return this.normalizeCalendarDateParts(
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            date.getUTCDate(),
            fieldName
        );
    }

    normalizeCalendarDateInteger(value, fieldName) {
        const year = Math.trunc(value / 10000);
        const month = Math.trunc((value % 10000) / 100);
        const day = value % 100;
        return this.normalizeCalendarDateParts(year, month, day, fieldName);
    }

    normalizeCalendarDateParts(year, month, day, fieldName) {
        if (
            !Number.isFinite(year) ||
            !Number.isFinite(month) ||
            !Number.isFinite(day) ||
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31
        ) {
            throw new Error(`Calendar override ${fieldName} is invalid.`);
        }

        const normalizedDate = new Date(Date.UTC(year, month - 1, day));
        const isExactDate =
            normalizedDate.getUTCFullYear() === year &&
            normalizedDate.getUTCMonth() + 1 === month &&
            normalizedDate.getUTCDate() === day;
        if (!isExactDate) {
            throw new Error(`Calendar override ${fieldName} is invalid.`);
        }

        return year * 10000 + month * 100 + day;
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
            error?.message?.startsWith("Check-in ") ||
            error?.message?.startsWith("Check-out ") ||
            error?.message?.startsWith("Unknown availability restrictions:") ||
            error?.message?.startsWith("Unknown amenity IDs:") ||
            error?.message?.startsWith("Unknown policy rules:")
        );
    }

    isCalendarOverrideClientError(error) {
        return (
            error?.message?.startsWith("Calendar override") ||
            error?.message?.startsWith("Calendar overrides") ||
            error?.statusCode === 400
        );
    }

    parseWebsiteOverridePayload(payload, fieldName) {
        if (payload === undefined || payload === null) {
            return {};
        }

        if (typeof payload !== "object" || Array.isArray(payload)) {
            throw new TypeError(`${fieldName} must be a plain object.`);
        }

        return payload;
    }

    parseOptionalWebsiteOverridePayload(payload, fieldName) {
        if (payload === undefined) {
            return undefined;
        }

        return this.parseWebsiteOverridePayload(payload, fieldName);
    }

    parseOptionalWebsiteBuildCompletionPayload(payload) {
        if (payload === undefined) {
            return undefined;
        }

        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
            throw new TypeError("buildCompletion must be a plain object.");
        }

        const attemptId = String(payload.attemptId || "").trim();
        if (!attemptId) {
            throw new TypeError("buildCompletion.attemptId is required.");
        }

        const flowId = String(payload.flowId || "").trim();
        const templateKey = String(payload.templateKey || "").trim();
        const phase = String(payload.phase || "").trim();
        const durationMs = Number(payload.durationMs);

        return {
            attemptId,
            flowId,
            templateKey,
            phase,
            durationMs: Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : null,
        };
    }

    parseWebsiteDeleteReasons(payload) {
        if (payload === undefined || payload === null) {
            return [];
        }

        if (!Array.isArray(payload)) {
            throw new TypeError("deleteReasons must be an array.");
        }

        return [...new Set(
            payload
                .map((reason) => String(reason || "").trim())
                .filter(Boolean)
        )];
    }

    parseWebsiteAnalyticsPayload(payload) {
        if (payload === undefined || payload === null) {
            return {};
        }

        if (!this.isPlainObject(payload)) {
            throw new TypeError("payload must be a plain object.");
        }

        return payload;
    }

    parseWebsiteAnalyticsDuration(payloadValue, fieldName) {
        const parsedValue = Number(payloadValue);
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            throw new TypeError(`${fieldName} must be a positive number.`);
        }

        return Math.round(parsedValue);
    }

    normalizeWebsiteBuildAnalyticsPayload(eventType, payload) {
        const attemptId = String(payload?.attemptId || "").trim();
        const flowId = String(payload?.flowId || "").trim();
        const templateKey = String(payload?.templateKey || "").trim();
        if (eventType === "WEBSITE_BUILD_FLOW_STARTED" || eventType === "WEBSITE_BUILD_FLOW_ABANDONED") {
            if (!flowId) {
                throw new TypeError("payload.flowId is required for website build flow analytics.");
            }

            return {
                flowId,
                ...(templateKey ? { templateKey } : {}),
            };
        }

        if (!attemptId) {
            throw new TypeError("payload.attemptId is required for website build analytics.");
        }

        const normalizedPayload = {
            attemptId,
        };

        if (flowId) {
            normalizedPayload.flowId = flowId;
        }

        if (templateKey) {
            normalizedPayload.templateKey = templateKey;
        }

        if (eventType === "WEBSITE_PREVIEW_READY" || eventType === "WEBSITE_BUILD_SUCCEEDED" || eventType === "WEBSITE_BUILD_FAILED") {
            normalizedPayload.durationMs = this.parseWebsiteAnalyticsDuration(payload?.durationMs, "payload.durationMs");
        }

        if (eventType === "WEBSITE_BUILD_FAILED") {
            const phase = String(payload?.phase || "").trim();
            if (phase) {
                normalizedPayload.phase = phase;
            }
        }

        return normalizedPayload;
    }

    normalizeWebsiteSurfaceAnalyticsPayload(payload) {
        const surface = String(payload?.surface || "").trim().toLowerCase();
        const viewport = String(payload?.viewport || "").trim().toLowerCase();

        if (!WEBSITE_ANALYTICS_SURFACES.has(surface)) {
            throw new TypeError("payload.surface must be 'preview' or 'live'.");
        }

        if (!WEBSITE_ANALYTICS_VIEWPORTS.has(viewport)) {
            throw new TypeError("payload.viewport must be 'mobile', 'tablet', or 'desktop'.");
        }

        return {
            surface,
            viewport,
            durationMs: this.parseWebsiteAnalyticsDuration(payload?.durationMs, "payload.durationMs"),
        };
    }

    normalizeWebsiteAnalyticsPayload(eventType, payload) {
        if (WEBSITE_HOST_ANALYTICS_EVENT_TYPES.has(eventType)) {
            return this.normalizeWebsiteBuildAnalyticsPayload(eventType, payload);
        }

        if (eventType === "SITE_LCP_RECORDED") {
            return this.normalizeWebsiteSurfaceAnalyticsPayload(payload);
        }

        throw new TypeError("Unsupported website eventType.");
    }

    normalizeDirectBookingWebsiteStatus(status) {
        const normalizedStatus = String(status || "").trim().toUpperCase();
        if (!DIRECT_BOOKING_WEBSITE_PUBLIC_STATUSES.has(normalizedStatus)) {
            throw new TypeError("website site status must be DRAFT, PREVIEW, PUBLISHED, or SUSPENDED.");
        }

        return normalizedStatus;
    }

    normalizeDirectBookingWebsiteDomainStatus(status) {
        const normalizedStatus = String(status || "").trim().toUpperCase();
        if (!DIRECT_BOOKING_WEBSITE_DOMAIN_STATUSES.has(normalizedStatus)) {
            throw new TypeError("website domain status must be PENDING, VERIFIED, ACTIVE, FAILED, or DISABLED.");
        }

        return normalizedStatus;
    }

    buildDirectBookingWebsiteName({ draft, propertyDetails }) {
        const draftSiteTitle = cleanWebsiteText(draft?.publishedContentOverrides?.siteTitle);
        if (draftSiteTitle) {
            return draftSiteTitle;
        }

        const propertyTitle = cleanWebsiteText(propertyDetails?.property?.title);
        if (propertyTitle) {
            return propertyTitle;
        }

        return `Website ${String(draft?.propertyId || "").slice(0, 8)}`;
    }

    ensureDirectBookingWebsitePublishEligibility(propertyDetails) {
        if (!propertyDetails?.property || this.isPlainObject(propertyDetails.property) === false) {
            throw new TypeError("Listing data could not be loaded for this live site.");
        }
    }

    buildDirectBookingWebsiteSummary(site, domains = []) {
        if (!site) {
            return null;
        }

        const normalizedDomains = (Array.isArray(domains) ? domains : []).map((domainEntry) => {
            if (!domainEntry || typeof domainEntry !== "object") {
                return domainEntry;
            }

            const resolvedStatus = resolveDirectBookingWebsiteRuntimeDomainStatus(site, domainEntry);
            if (!resolvedStatus || resolvedStatus === domainEntry.status) {
                return domainEntry;
            }

            return {
                ...domainEntry,
                status: resolvedStatus,
            };
        });
        const primaryDomain = normalizedDomains.find((domainEntry) => domainEntry?.isPrimary) || normalizedDomains[0] || null;
        const isReachable = site.status === "PUBLISHED" && primaryDomain?.status === "ACTIVE";

        return {
            site,
            primaryDomain,
            domains: normalizedDomains,
            isReachable,
        };
    }

    buildPublicDirectBookingWebsiteResolution(site, domain) {
        const siteSummary = this.buildDirectBookingWebsiteSummary(site, domain ? [domain] : []);
        if (!siteSummary?.site || !siteSummary?.primaryDomain) {
            return null;
        }

        return {
            siteId: siteSummary.site.id,
            propertyId: siteSummary.site.propertyId,
            hostId: siteSummary.site.hostId,
            templateKey: siteSummary.site.templateKey,
            primaryLocale: siteSummary.site.primaryLocale,
            siteName: siteSummary.site.siteName,
            siteStatus: siteSummary.site.status,
            publishedAt: siteSummary.site.publishedAt,
            isReachable: siteSummary.isReachable,
            domain: siteSummary.primaryDomain,
        };
    }

    buildPublicDirectBookingWebsiteRenderPayload(site, domain, propertySnapshot = undefined) {
        const resolution = this.buildPublicDirectBookingWebsiteResolution(site, domain);
        if (!resolution) {
            return null;
        }

        return {
            resolution,
            site: {
                id: site.id,
                propertyId: site.propertyId,
                hostId: site.hostId,
                siteName: site.siteName,
                primaryLocale: site.primaryLocale,
                status: site.status,
                templateKey: site.templateKey,
                publishedAt: site.publishedAt,
            },
            domain,
            propertySnapshot:
                propertySnapshot && typeof propertySnapshot === "object"
                    ? propertySnapshot
                    : site.publishedPropertySnapshot || {},
            contentOverrides: site.publishedContentOverrides || {},
            themeOverrides: site.publishedThemeOverrides || {},
            renderSource: "published_site",
        };
    }

    async buildPublicPropertySnapshotForWebsiteRender(site) {
        const publishedPropertySnapshot =
            site?.publishedPropertySnapshot && typeof site.publishedPropertySnapshot === "object"
                ? site.publishedPropertySnapshot
                : {};
        const propertyId = cleanWebsiteText(
            site?.propertyId ||
            publishedPropertySnapshot?.property?.id ||
            publishedPropertySnapshot?.property?.ID ||
            publishedPropertySnapshot?.id ||
            publishedPropertySnapshot?.ID
        );

        if (!propertyId) {
            return publishedPropertySnapshot;
        }

        try {
            const calendarAvailability = await this.propertyService.getPublicCalendarAvailability(propertyId);
            return {
                ...publishedPropertySnapshot,
                calendarAvailability,
            };
        } catch {
            return publishedPropertySnapshot;
        }
    }

    resolveRequestedStandaloneWebsiteDomain(event) {
        const domainQueryValue =
            event.queryStringParameters?.domain ||
            event.queryStringParameters?.host ||
            getRequestHostHeaderValue(event.headers || {});
        return normalizeDirectBookingWebsiteDomainInput(domainQueryValue);
    }

    async resolvePublicDirectBookingWebsiteByDomain(domainInput) {
        const normalizedDomain = normalizeDirectBookingWebsiteDomainInput(domainInput);
        if (!normalizedDomain) {
            throw new TypeError("Missing website domain.");
        }

        let domain = await this.directBookingWebsiteDomainRepository.getDomainByName(normalizedDomain);
        if (!domain) {
            const publishedSite = await this.resolvePublishedSiteByFallbackDomain(normalizedDomain);
            if (!publishedSite) {
                return null;
            }

            domain = await this.resolveOrCreatePrimaryLiveDomain(publishedSite);
            if (!domain || normalizeDirectBookingWebsiteDomainInput(domain.domain) !== normalizedDomain) {
                return null;
            }

            return { site: publishedSite, domain };
        }

        if (!domain) {
            return null;
        }

        const site = await this.directBookingWebsiteSiteRepository.getSiteById(domain.siteId);
        if (!site) {
            return null;
        }

        return { site, domain };
    }

    async getPublicRenderableDirectBookingWebsiteById(siteId) {
        const normalizedSiteId = cleanWebsiteText(siteId);
        if (!normalizedSiteId) {
            throw new TypeError("Missing website siteId.");
        }

        const site = await this.directBookingWebsiteSiteRepository.getSiteById(normalizedSiteId);
        if (!site) {
            return null;
        }

        const domains = await this.directBookingWebsiteDomainRepository.listDomainsBySiteId(site.id);
        const primaryDomain =
            domains.find((domainEntry) => domainEntry?.isPrimary) ||
            domains.find((domainEntry) => Boolean(domainEntry?.domain)) ||
            null;
        const healedPrimaryDomain =
            primaryDomain || (site.status === "PUBLISHED" ? await this.resolveOrCreatePrimaryLiveDomain(site) : null);

        return {
            site,
            domain: healedPrimaryDomain,
        };
    }

    isPublicDirectBookingWebsiteReachable(site, domain) {
        return (
            Boolean(site) &&
            site.status === "PUBLISHED" &&
            resolveDirectBookingWebsiteRuntimeDomainStatus(site, domain) === "ACTIVE"
        );
    }

    async getDirectBookingWebsiteSummaryByPropertyId(propertyId, hostId) {
        const site = await this.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId(propertyId, hostId);
        if (!site) {
            return null;
        }

        let domains = await this.directBookingWebsiteDomainRepository.listDomainsBySiteId(site.id);
        if (site.status === "PUBLISHED" && domains.length < 1) {
            const healedDomain = await this.resolveOrCreatePrimaryLiveDomain(site);
            domains = healedDomain ? [healedDomain] : [];
        }

        return this.buildDirectBookingWebsiteSummary(site, domains);
    }

    buildFallbackLiveDomainVerificationDetails(status) {
        return {
            activationMode: "internal",
            domainKind: "live",
            routingConfigured: status === "ACTIVE",
            activationStatus: status,
            domainSuffix: getDirectBookingWebsiteFallbackDomainSuffix(),
        };
    }

    buildSyntheticPrimaryLiveDomain(site, status = getDirectBookingWebsiteFallbackRoutingStatus()) {
        const now = Date.now();
        return {
            id: `synthetic-${site.id}`,
            siteId: site.id,
            domain: buildLiveSiteDomain(site.siteName, site.id),
            domainType: DIRECT_BOOKING_WEBSITE_DOMAIN_TYPE_FALLBACK,
            status,
            isPrimary: true,
            verificationDetails: this.buildFallbackLiveDomainVerificationDetails(status),
            lastCheckedAt: now,
            createdAt: now,
            updatedAt: now,
        };
    }

    async resolveOrCreatePrimaryLiveDomain(site) {
        if (!site?.id) {
            return null;
        }

        const existingLiveDomain = await this.directBookingWebsiteDomainRepository.getPrimaryLiveDomainBySiteId(site.id);
        if (existingLiveDomain?.domain) {
            return existingLiveDomain;
        }

        const liveDomainStatus = this.normalizeDirectBookingWebsiteDomainStatus(
            getDirectBookingWebsiteFallbackRoutingStatus()
        );
        const syntheticDomain = this.buildSyntheticPrimaryLiveDomain(site, liveDomainStatus);

        try {
            const persistedDomain = await this.directBookingWebsiteDomainRepository.ensureDomain({
                siteId: site.id,
                domain: syntheticDomain.domain,
                domainType: DIRECT_BOOKING_WEBSITE_DOMAIN_TYPE_FALLBACK,
                status: liveDomainStatus,
                isPrimary: true,
                verificationDetails: this.buildFallbackLiveDomainVerificationDetails(liveDomainStatus),
            });
            return persistedDomain || syntheticDomain;
        } catch (error) {
            console.error("Failed to heal direct booking website fallback domain.", error);
            return syntheticDomain;
        }
    }

    async resolvePublishedSiteByFallbackDomain(domainInput) {
        const normalizedDomain = normalizeDirectBookingWebsiteDomainInput(domainInput);
        const idSuffix = extractLiveSiteDomainIdSuffix(normalizedDomain);
        if (!normalizedDomain || !idSuffix) {
            return null;
        }

        const site = await this.directBookingWebsiteSiteRepository.getPublishedSiteByNormalizedIdPrefix(idSuffix);
        if (!site) {
            return null;
        }

        return buildLiveSiteDomain(site.siteName, site.id) === normalizedDomain ? site : null;
    }

    async publishDirectBookingWebsiteForDraft({ draft, hostId, propertyId }) {
        const publishStartedAt = Date.now();
        const propertyDetails = await this.propertyService.getFullPropertyAttributesWithFullLocation(
            propertyId,
            { includeCalendarAvailability: true }
        );
        this.ensureDirectBookingWebsitePublishEligibility(propertyDetails);

        const siteName = this.buildDirectBookingWebsiteName({
            draft,
            propertyDetails,
        });

        const site = await this.directBookingWebsiteSiteRepository.upsertSite({
            propertyId,
            hostId,
            siteName,
            primaryLocale: "en",
            status: "PUBLISHED",
            templateKey: draft.templateKey,
            publishedPropertySnapshot: propertyDetails,
            publishedContentOverrides: draft.publishedContentOverrides || {},
            publishedThemeOverrides: draft.publishedThemeOverrides || {},
            publishedAt: Date.now(),
            suspendedAt: null,
        });

        const liveDomainStatus = this.normalizeDirectBookingWebsiteDomainStatus(
            getDirectBookingWebsiteFallbackRoutingStatus()
        );
        const existingLiveDomain = await this.directBookingWebsiteDomainRepository.getPrimaryLiveDomainBySiteId(site.id);
        const liveDomain = await this.directBookingWebsiteDomainRepository.ensureDomain({
            siteId: site.id,
            domain: existingLiveDomain?.domain || buildLiveSiteDomain(site.siteName, site.id),
            domainType: DIRECT_BOOKING_WEBSITE_DOMAIN_TYPE_FALLBACK,
            status: liveDomainStatus,
            isPrimary: true,
            verificationDetails: this.buildFallbackLiveDomainVerificationDetails(liveDomainStatus),
        });

        await this.recordStandaloneWebsiteEventSafely({
            draftId: draft.id,
            propertyId,
            hostId,
            eventType: "WEBSITE_SITE_PUBLISHED",
            payload: {
                templateKey: draft.templateKey,
                siteId: site.id,
                domain: liveDomain?.domain || "",
                domainStatus: liveDomain?.status || liveDomainStatus,
                durationMs: Date.now() - publishStartedAt,
            },
        });

        const persistedSiteSummary = await this.getDirectBookingWebsiteSummaryByPropertyId(propertyId, hostId);
        if (persistedSiteSummary) {
            return persistedSiteSummary;
        }

        return this.buildDirectBookingWebsiteSummary(site, liveDomain ? [liveDomain] : []);
    }

    async unpublishDirectBookingWebsiteSummary({ site, draft, hostId, propertyId }) {
        const nextSite = await this.directBookingWebsiteSiteRepository.updateSiteStatus(site.id, "PREVIEW");
        const liveDomain = await this.directBookingWebsiteDomainRepository.updatePrimaryLiveDomainStatus(
            site.id,
            "DISABLED",
            {
                activationMode: "internal",
                disabledByHost: true,
                routingConfigured: false,
            }
        );
        const allDomains = liveDomain
            ? [liveDomain]
            : await this.directBookingWebsiteDomainRepository.listDomainsBySiteId(site.id);

        await this.recordStandaloneWebsiteEventSafely({
            draftId: draft?.id || null,
            propertyId,
            hostId,
            eventType: "WEBSITE_SITE_UNPUBLISHED",
            payload: {
                siteId: site.id,
                domain: liveDomain?.domain || "",
                domainStatus: liveDomain?.status || "DISABLED",
            },
        });

        return this.buildDirectBookingWebsiteSummary(nextSite, allDomains);
    }

    isWebsiteDraftClientError(error) {
        return (
            error?.message?.startsWith("Missing propertyId") ||
            error?.message?.startsWith("Missing draftId") ||
            error?.message?.startsWith("Missing eventType") ||
            error?.message?.startsWith("Missing templateKey") ||
            error?.message?.includes("must be a plain object") ||
            error?.message?.includes("deleteReasons must be an array") ||
            error?.message?.includes("Unsupported website eventType") ||
            error?.message?.includes("Listing data could not be loaded for this live site.") ||
            error?.message?.includes("website site status must be") ||
            error?.message?.includes("website domain status must be") ||
            error?.message?.includes("payload.flowId") ||
            error?.message?.includes("payload.attemptId") ||
            error?.message?.includes("payload.durationMs") ||
            error?.message?.includes("payload.surface") ||
            error?.message?.includes("payload.viewport")
        );
    }

    badRequest(message) {
        return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message }),
        };
    }

    websiteServerError(message = "We could not complete this website request. Please try again.") {
        return {
            statusCode: 500,
            headers: draftResponseHeaders,
            body: JSON.stringify({ message }),
        };
    }

    async recordStandaloneWebsiteEventSafely(eventInput) {
        try {
            await this.directBookingWebsiteEventRepository.recordEvent(eventInput);
        } catch (error) {
            console.error("Failed to record direct booking website event.", error);
        }
    }

    async recordPublicWebsiteAnalyticsEvent({ draftId, siteId, domain, eventType, payload }) {
        const normalizedDraftId = cleanWebsiteText(draftId);
        if (normalizedDraftId) {
            const draft = await this.directBookingWebsiteDraftRepository.getDraftById(normalizedDraftId);
            if (!draft || draft.status === "SUSPENDED") {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website analytics target not found." }),
                };
            }

            await this.directBookingWebsiteEventRepository.recordEvent({
                draftId: draft.id,
                propertyId: draft.propertyId,
                hostId: draft.hostId,
                eventType,
                payload,
            });

            return null;
        }

        const normalizedSiteId = cleanWebsiteText(siteId);
        if (normalizedSiteId) {
            const site = await this.directBookingWebsiteSiteRepository.getSiteById(normalizedSiteId);
            if (!site || site.status === "SUSPENDED") {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website analytics target not found." }),
                };
            }

            await this.directBookingWebsiteEventRepository.recordEvent({
                draftId: null,
                propertyId: site.propertyId,
                hostId: site.hostId,
                eventType,
                payload: {
                    ...payload,
                    siteId: site.id,
                    domain: normalizeDirectBookingWebsiteDomainInput(domain),
                },
            });

            return null;
        }

        return this.badRequest("Missing website analytics target.");
    }

    async recordHostWebsiteAnalyticsEvent({ event, propertyId, draftId, eventType, payload }) {
        if (!propertyId) {
            return this.badRequest("Missing propertyId.");
        }

        const accessToken = event.headers.Authorization || event.headers.authorization;
        const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
        await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

        const existingDraft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);

        await this.directBookingWebsiteEventRepository.recordEvent({
            draftId: existingDraft?.id || draftId || null,
            propertyId,
            hostId,
            eventType,
            payload,
        });

        return null;
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
    // GET /property/hostDashboard/byHostId
    // -------------------------
    async getFullOwnedPropertiesByHostId(event) {
        try {
            const accessToken = event.headers.Authorization;
            await this.authManager.getAuthorizedUser(accessToken);
            const hostId = event.queryStringParameters?.hostId;
            if (!hostId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify("hostId query parameter is required.")
                };
            }
            const properties = await this.propertyService.getFullPropertiesByHostId(hostId);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(properties)
            };
        } catch (error) {
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify(error.message || "Something went wrong, please contact support.")
            };
        }
    }

    // -------------------------
    // GET /property/hostDashboard/single
    // -------------------------
    async getFullOwnedPropertyById(event) {
        try {
            const propertyId = event.queryStringParameters.property;
            await this.authManager.getAuthorizedUser(event.headers.Authorization);
            const property = await this.propertyService.getFullPropertyByIdAsHost(propertyId);
            return {
                statusCode: 200,
                headers: draftResponseHeaders,
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
    // POST /property/website/event
    // -------------------------
    async recordWebsiteAnalyticsEvent(event) {
        try {
            const eventBody = JSON.parse(event.body || "{}");
            const eventType = String(eventBody.eventType || "").trim().toUpperCase();
            const propertyId = String(eventBody.propertyId || eventBody.property || "").trim();
            const draftId = String(eventBody.draftId || eventBody.draft || "").trim();
            const siteId = String(eventBody.siteId || eventBody.site || "").trim();
            const domain = normalizeDirectBookingWebsiteDomainInput(eventBody.domain || eventBody.host || "");
            const payload = this.parseWebsiteAnalyticsPayload(eventBody.payload);

            if (!eventType) {
                return this.badRequest("Missing eventType.");
            }

            const normalizedPayload = this.normalizeWebsiteAnalyticsPayload(eventType, payload);
            const earlyResponse = WEBSITE_PUBLIC_ANALYTICS_EVENT_TYPES.has(eventType)
                ? await this.recordPublicWebsiteAnalyticsEvent({
                    draftId,
                    siteId,
                    domain,
                    eventType,
                    payload: normalizedPayload,
                })
                : await this.recordHostWebsiteAnalyticsEvent({
                    event,
                    propertyId,
                    draftId,
                    eventType,
                    payload: normalizedPayload,
                });

            if (earlyResponse) {
                return earlyResponse;
            }

            return {
                statusCode: 204,
                headers: draftResponseHeaders,
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // POST /property/website/draft
    // -------------------------
    async upsertWebsiteDraft(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");

            const propertyId = String(eventBody.propertyId || eventBody.property || "").trim();
            const templateKey = String(eventBody.templateKey || "").trim();
            const status = String(eventBody.status || "DRAFT").trim().toUpperCase();
            const contentOverrides = this.parseWebsiteOverridePayload(eventBody.contentOverrides, "contentOverrides");
            const themeOverrides = this.parseWebsiteOverridePayload(eventBody.themeOverrides, "themeOverrides");
            const publishedContentOverrides = this.parseOptionalWebsiteOverridePayload(
                eventBody.publishedContentOverrides,
                "publishedContentOverrides"
            );
            const publishedThemeOverrides = this.parseOptionalWebsiteOverridePayload(
                eventBody.publishedThemeOverrides,
                "publishedThemeOverrides"
            );
            const buildCompletion = this.parseOptionalWebsiteBuildCompletionPayload(
                eventBody.buildCompletion
            );

            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            if (!templateKey) {
                return this.badRequest("Missing templateKey.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const existingDraft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);

            const draft = await this.directBookingWebsiteDraftRepository.upsertDraft({
                hostId,
                propertyId,
                templateKey,
                status,
                contentOverrides,
                themeOverrides,
                publishedContentOverrides,
                publishedThemeOverrides,
            });

            const shouldTrackLiveSiteUpdate =
                publishedContentOverrides !== undefined || publishedThemeOverrides !== undefined;

            await this.recordStandaloneWebsiteEventSafely({
                draftId: draft?.id || existingDraft?.id || null,
                propertyId,
                hostId,
                eventType: existingDraft ? "WEBSITE_DRAFT_SAVED" : "WEBSITE_DRAFT_CREATED",
                payload: {
                    templateKey,
                    status,
                },
            });

            if (shouldTrackLiveSiteUpdate) {
                await this.recordStandaloneWebsiteEventSafely({
                    draftId: draft?.id || existingDraft?.id || null,
                    propertyId,
                    hostId,
                    eventType: "LIVE_SITE_UPDATED",
                    payload: {
                        templateKey,
                        status,
                    },
                });
            }

            if (buildCompletion) {
                await this.recordStandaloneWebsiteEventSafely({
                    draftId: draft?.id || existingDraft?.id || null,
                    propertyId,
                    hostId,
                    eventType: "WEBSITE_BUILD_SUCCEEDED",
                    payload: {
                        attemptId: buildCompletion.attemptId,
                        flowId: buildCompletion.flowId,
                        templateKey: buildCompletion.templateKey || templateKey,
                        durationMs: buildCompletion.durationMs,
                        phase: buildCompletion.phase || "persist_draft",
                    },
                });
            }

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(draft),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/drafts
    // -------------------------
    async getWebsiteDrafts(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const drafts = await this.directBookingWebsiteDraftRepository.listDraftsByHostId(hostId);
            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(drafts),
            };
        } catch (error) {
            console.error(error);
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/draft
    // -------------------------
    async getWebsiteDraftByPropertyId(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const propertyId = String(event.queryStringParameters?.property || event.queryStringParameters?.propertyId || "").trim();
            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const draft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);
            if (!draft) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website draft not found." }),
                };
            }

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(draft),
            };
        } catch (error) {
            console.error(error);
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/kpis
    // -------------------------
    async getWebsiteKpis(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const summary = await this.directBookingWebsiteEventRepository.getGlobalKpiSummary();

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(summary),
            };
        } catch (error) {
            console.error(error);
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/site
    // -------------------------
    async getWebsiteSiteByPropertyId(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const propertyId = String(event.queryStringParameters?.property || event.queryStringParameters?.propertyId || "").trim();

            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const siteSummary = await this.getDirectBookingWebsiteSummaryByPropertyId(propertyId, hostId);
            if (!siteSummary) {
                return {
                    statusCode: 200,
                    headers: draftResponseHeaders,
                    body: JSON.stringify(null),
                };
            }

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(siteSummary),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // POST /property/website/site/publish
    // -------------------------
    async publishWebsiteSite(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = String(eventBody.propertyId || eventBody.property || "").trim();

            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const draft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);
            if (!draft) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website draft not found." }),
                };
            }

            const siteSummary = await this.publishDirectBookingWebsiteForDraft({
                draft,
                hostId,
                propertyId,
            });

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(siteSummary),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // POST /property/website/site/unpublish
    // -------------------------
    async unpublishWebsiteSite(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = String(eventBody.propertyId || eventBody.property || "").trim();

            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const site = await this.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId(propertyId, hostId);
            if (!site) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website site record not found." }),
                };
            }

            const draft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);
            const siteSummary = await this.unpublishDirectBookingWebsiteSummary({
                site,
                draft,
                hostId,
                propertyId,
            });

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(siteSummary),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/public/resolve
    // -------------------------
    async resolvePublicWebsiteSite(event) {
        try {
            const requestedDomain = this.resolveRequestedStandaloneWebsiteDomain(event);
            if (!requestedDomain) {
                return this.badRequest("Missing website domain.");
            }

            const resolutionResult = await this.resolvePublicDirectBookingWebsiteByDomain(requestedDomain);
            if (!resolutionResult || !this.isPublicDirectBookingWebsiteReachable(resolutionResult.site, resolutionResult.domain)) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Published website not found." }),
                };
            }

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(this.buildPublicDirectBookingWebsiteResolution(
                    resolutionResult.site,
                    resolutionResult.domain
                )),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/public/render
    // -------------------------
    async getPublicWebsiteRenderModel(event) {
        try {
            const siteId = cleanWebsiteText(
                event.queryStringParameters?.site ||
                event.queryStringParameters?.siteId
            );
            const requestedDomain = this.resolveRequestedStandaloneWebsiteDomain(event);
            const isInternalSiteRender = Boolean(siteId);

            let resolutionResult = null;
            if (requestedDomain) {
                resolutionResult = await this.resolvePublicDirectBookingWebsiteByDomain(requestedDomain);
            } else if (siteId) {
                resolutionResult = await this.getPublicRenderableDirectBookingWebsiteById(siteId);
            } else {
                return this.badRequest("Missing website siteId or domain.");
            }

            const canRenderPublishedSite = isInternalSiteRender
                ? Boolean(resolutionResult?.site) &&
                    resolutionResult.site.status === "PUBLISHED" &&
                    Boolean(resolutionResult?.domain?.domain)
                : this.isPublicDirectBookingWebsiteReachable(resolutionResult?.site, resolutionResult?.domain);

            if (!resolutionResult || !canRenderPublishedSite) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Published website not found." }),
                };
            }

            if (siteId && resolutionResult.site.id !== siteId) {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Published website not found." }),
                };
            }

            await this.recordStandaloneWebsiteEventSafely({
                draftId: null,
                propertyId: resolutionResult.site.propertyId,
                hostId: resolutionResult.site.hostId,
                eventType: "PUBLIC_SITE_OPENED",
                payload: {
                    siteId: resolutionResult.site.id,
                    domain: resolutionResult.domain?.domain || requestedDomain,
                    templateKey: resolutionResult.site.templateKey,
                    surface: "live",
                },
            });

            const propertySnapshot = await this.buildPublicPropertySnapshotForWebsiteRender(
                resolutionResult.site
            );

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify(this.buildPublicDirectBookingWebsiteRenderPayload(
                    resolutionResult.site,
                    resolutionResult.domain,
                    propertySnapshot
                )),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // GET /property/website/preview
    // -------------------------
    async getWebsitePreviewByDraftId(event) {
        try {
            const draftId = String(
                event.queryStringParameters?.draft ||
                event.queryStringParameters?.draftId ||
                ""
            ).trim();

            if (!draftId) {
                return this.badRequest("Missing draftId.");
            }

            const draft = await this.directBookingWebsiteDraftRepository.getDraftById(draftId);
            if (!draft || draft.status === "SUSPENDED") {
                return {
                    statusCode: 404,
                    headers: draftResponseHeaders,
                    body: JSON.stringify({ message: "Website preview not found." }),
                };
            }

            const propertyDetails = await this.propertyService.getFullPropertyAttributesWithFullLocation(
                draft.propertyId,
                { includeCalendarAvailability: true }
            );

            await this.recordStandaloneWebsiteEventSafely({
                draftId: draft.id,
                propertyId: draft.propertyId,
                hostId: draft.hostId,
                eventType: "PUBLIC_PREVIEW_OPENED",
                payload: {
                    templateKey: draft.templateKey,
                },
            });

            return {
                statusCode: 200,
                headers: draftResponseHeaders,
                body: JSON.stringify({
                    draft,
                    propertyDetails,
                }),
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
        }
    }

    // -------------------------
    // DELETE /property/website/draft
    // -------------------------
    async deleteWebsiteDraft(event) {
        try {
            const accessToken = event.headers.Authorization || event.headers.authorization;
            const hostId = await this.authManager.authorizeGroupRequest(accessToken, "Host");
            const eventBody = JSON.parse(event.body || "{}");
            const propertyId = String(eventBody.propertyId || eventBody.property || "").trim();
            const deleteReasons = this.parseWebsiteDeleteReasons(eventBody.deleteReasons);

            if (!propertyId) {
                return this.badRequest("Missing propertyId.");
            }

            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);
            const existingDraft = await this.directBookingWebsiteDraftRepository.getDraftByPropertyIdAndHostId(propertyId, hostId);
            const existingSite = await this.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId(propertyId, hostId);

            if (existingSite?.id) {
                await this.directBookingWebsiteDomainRepository.deleteDomainsBySiteId(existingSite.id);
                await this.directBookingWebsiteSiteRepository.deleteSiteByPropertyIdAndHostId(propertyId, hostId);
            }

            await this.directBookingWebsiteDraftRepository.deleteDraftByPropertyIdAndHostId(propertyId, hostId);

            await this.recordStandaloneWebsiteEventSafely({
                draftId: existingDraft?.id || null,
                propertyId,
                hostId,
                eventType: "WEBSITE_DELETED",
                payload: {
                    templateKey: existingDraft?.templateKey || "",
                    siteId: existingSite?.id || "",
                    siteStatus: existingSite?.status || "",
                    reasons: deleteReasons,
                },
            });

            return {
                statusCode: 204,
                headers: responseHeaders,
            };
        } catch (error) {
            console.error(error);
            if (this.isWebsiteDraftClientError(error)) {
                return this.badRequest(error.message);
            }
            return this.websiteServerError();
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
