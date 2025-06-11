import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PricingMapping } from "../../util/mapping/pricing.js";

export class PropertyPricingRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getPricingById(id) {
        const params = new GetItemCommand({
            "TableName": "property-pricing-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? PricingMapping.mapDatabaseEntryToPricing(result.Item) : null;
    }

    async create(pricing) {
        const params = new PutItemCommand({
            "TableName": "property-pricing-develop",
            "Item": {
                "property_id": {
                    "S": pricing.property_id
                },
                "cleaning": {
                    "N": `${pricing.cleaning}`
                },
                "roomRate": {
                    "N": `${pricing.roomRate}`
                },
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPricingById(pricing.property_id);
        return result ? result : null;
    }

}