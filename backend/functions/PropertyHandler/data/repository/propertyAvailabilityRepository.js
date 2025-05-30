import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { AvailabilityMapping } from "../../util/mapping/availability.js";

export class PropertyAvailabilityRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }
    
    async getAvailabilityByPropertyIdAndStartDate(id, availableStartDate) {
        const params = new GetItemCommand({
            "TableName": "property-availability-develop",
            "Key": {
                "property_id": {
                    "S": id
                },
                "availableStartDate": {
                    "N": `${availableStartDate}`
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getAvailabilityByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-availability-develop",
            "IndexName": "property_id-index",
            "KeyConditionExpression": "#property_id = :property_id",
            "ExpressionAttributeNames": {
                "#property_id": "property_id"
            },
            "ExpressionAttributeValues": {
                ":property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Items ? result.Items.map(item => AvailabilityMapping.mapDatabaseEntryToAvailability(item)) : null;
    }

    async create(availability) {
        const params = new PutItemCommand({
            "TableName": "property-availability-develop",
            "Item": {
                "property_id": {
                    "S": availability.property_id
                },
                "availableStartDate": {
                    "N": `${availability.availableStartDate}`
                },
                "availableEndDate": {
                    "N": `${availability.availableEndDate}`
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getAvailabilityByPropertyIdAndStartDate(availability.property_id, availability.availableStartDate);
        return result ? result: null;
    }

}