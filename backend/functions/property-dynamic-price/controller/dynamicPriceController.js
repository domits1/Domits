import { DynamicPriceService } from "../business/service/dynamicPriceService.js";
import { AuthManager } from "../auth/authManager.js";
import { SystemManagerRepository } from "../data/repository/systemManagerRepository.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export class DynamicPriceController {

    dynamicPriceService;
    authManager;

    constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
        this.authManager = new AuthManager(dynamoDbClient, systemManagerRepository);
        this.dynamicPriceService = new DynamicPriceService(dynamoDbClient, systemManagerRepository);
    }

    // -------------------------
    // GET /property/dynamic-price
    // Get calendar data (blocked dates, maintenance, custom pricing)
    // -------------------------
    async getCalendarData(event) {
        try {
            const propertyId = event.queryStringParameters?.property;

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Property ID is required" })
                };
            }

            await this.authManager.authorizeOwnerRequest(event.headers.Authorization, propertyId);
            const calendarData = await this.dynamicPriceService.getCalendarData(propertyId);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(calendarData)
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify({ message: error.message || "Something went wrong, please contact support." })
            };
        }
    }

    // -------------------------
    // POST /property/dynamic-price
    // Save calendar data (create new)
    // -------------------------
    async saveCalendarData(event) {
        try {
            const accessToken = event.headers.Authorization;
            const eventBody = JSON.parse(event.body);
            const propertyId = eventBody.propertyId;

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Property ID is required" })
                };
            }

            // Authorize - user must be property owner
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            // Save availability and pricing
            const result = await this.dynamicPriceService.saveCalendarData(propertyId, eventBody);

            return {
                statusCode: 201,
                headers: responseHeaders,
                body: JSON.stringify({
                    message: "Calendar data saved successfully",
                    propertyId: propertyId,
                    data: result
                })
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify({ message: error.message || "Something went wrong, please contact support." })
            };
        }
    }

    // -------------------------
    // PATCH /property/dynamic-price
    // Update calendar data (modify existing)
    // -------------------------
    async updateCalendarData(event) {
        try {
            const accessToken = event.headers.Authorization;
            const eventBody = JSON.parse(event.body);
            const propertyId = eventBody.propertyId;

            if (!propertyId) {
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ message: "Property ID is required" })
                };
            }

            // Authorize - user must be property owner
            await this.authManager.authorizeOwnerRequest(accessToken, propertyId);

            // Update availability and pricing
            const result = await this.dynamicPriceService.updateCalendarData(propertyId, eventBody);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify({
                    message: "Calendar data updated successfully",
                    propertyId: propertyId,
                    data: result
                })
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaders,
                body: JSON.stringify({ message: error.message || "Something went wrong, please contact support." })
            };
        }
    }

}
