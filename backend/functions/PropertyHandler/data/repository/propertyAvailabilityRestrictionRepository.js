import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { AvailabilityRestrictionMapping } from "../../util/mapping/availabilityRestriction.js";

export class PropertyAvailabilityRestrictionRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getAvailabilityRestrictionById(id) {
        const params = new GetItemCommand({
            "TableName": "property-availability-restrictions-develop",
            "Key": {"restriction": {"S": id}}
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getPropertyAvailabilityRestrictionById(id) {
        const params = new GetItemCommand({
            "TableName": "property-availability-restriction-develop",
            "Key": {
                "id": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getAvailabilityRestrictionsByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-availability-restriction-develop",
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
        return result.Items ? result.Items.map(item => AvailabilityRestrictionMapping.mapDatabaseEntryToAvailabilityRestriction(item)) : null;
    }

    async create(availabilityRestriction) {

        const params = new PutItemCommand({
            "TableName": "property-availability-restriction-develop",
            "Item": {
                "id": {
                    "S": availabilityRestriction.id
                },
                "property_id": {
                    "S": availabilityRestriction.property_id
                },
                "restriction": {
                    "S": availabilityRestriction.restriction
                },
                "value": {
                    "N": `${availabilityRestriction.value}`
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyAvailabilityRestrictionById(availabilityRestriction.id);
        return result ? result : null;
    }

}