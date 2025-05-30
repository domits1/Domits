import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { GeneralDetailMapping } from "../../util/mapping/generalDetail.js";

export class PropertyGeneralDetailRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getGeneralDetailById(id) {
        const params = new GetItemCommand({
            "TableName": "property-general-details-develop",
            "Key": {"detail": {"S": id}}
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getPropertyGeneralDetailById(id) {
        const params = new GetItemCommand({
            "TableName": "property-general-detail-develop",
            "Key": {
                "id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null
    }

    async create(detail) {
        const params = new PutItemCommand({
            "TableName": "property-general-detail-develop",
            "Item": {
                "id": {
                    "S": detail.id
                },
                "property_id": {
                    "S": detail.property_id
                },
                "detail": {
                    "S": detail.detail
                },
                "value": {
                    "N": `${detail.value}`
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyGeneralDetailById(detail.id);
        return result ? result : null
    }

    async getPropertyGeneralDetailsByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-general-detail-develop",
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
        return result.Items ? result.Items.map(item => GeneralDetailMapping.mapDatabaseEntryToGeneralDetail(item)) : null;
    }

}