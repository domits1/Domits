import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { TypeMapping } from "../../util/mapping/type.js";

export class PropertyTypeRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getPropertyTypeById(id) {
        const params = new GetItemCommand({
            "TableName": "property-type-keys-develop",
            "Key": {
                "type": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getPropertyTypeByPropertyId(id) {
        const params = new GetItemCommand({
            "TableName": "property-type-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? TypeMapping.mapDatabaseEntryToType(result.Item) : null;
    }

    async create(type) {
        const params = new PutItemCommand({
            "TableName": "property-type-develop",
            "Item": {
                "property_id": {
                    "S": type.property_id
                },
                "spaceType": {
                    "S": type.spaceType
                },
                "type": {
                    "S": type.property_type
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyTypeByPropertyId(type.property_id);
        return result ? result : null;
    }

}