import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { AmenityMapping } from "../../util/mapping/amenity.js";

export class PropertyAmenityRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }
    async getAmenitiesByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-amenity-develop",
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
        return result.Items ? result.Items.map(item => AmenityMapping.mapDatabaseEntryToAmenity(item)) : null;
    }

    async getAmenityAndCategoryById(id) {
        const params = new GetItemCommand({
            "TableName": "property-amenity-and-category-develop",
            "Key": {
                "id": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getPropertyAmenityById(id) {
        const params = new GetItemCommand({
            "TableName": "property-amenity-develop",
            "Key": {
                "id": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async create(amenity) {
        const params = new PutItemCommand({
            "TableName": "property-amenity-develop",
            "Item": {
                "id": {
                    "S": amenity.id
                },
                "amenityId": {
                    "S": amenity.amenityId
                },
                "property_id": {
                    "S": amenity.property_id
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyAmenityById(amenity.id);
        return result ? result : null;
    }

}