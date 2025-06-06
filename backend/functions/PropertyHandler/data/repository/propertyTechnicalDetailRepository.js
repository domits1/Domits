import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { TechnicalDetailsMapping } from "../../util/mapping/technicalDetail.js";

export class PropertyTechnicalDetailRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getTechnicalDetailsByPropertyId(id) {
        const params = new GetItemCommand({
            "TableName": "property-technical-details-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? TechnicalDetailsMapping.mapDatabaseEntryToTechnicalDetails(result.Item) : null;
    }

    async create(details) {
        const params = new PutItemCommand({
            "TableName": "property-technical-details-develop",
            "Item": {
                "property_id": {
                    "S": details.property_id
                },
                "fourWheelDrive": {
                    "BOOL": details.fourWheelDrive
                },
                "fuelConsumption": {
                    "N": `${details.fuelConsumption}`
                },
                "generalPeriodicInspection": {
                    "N": `${details.generalPeriodicInspection}`
                },
                "height": {
                    "N": `${details.height}`
                },
                "length": {
                    "N": `${details.length}`
                },
                "renovationYear": {
                    "N": `${details.renovationYear}`
                },
                "speed": {
                    "N": `${details.speed}`
                },
                "transmission": {
                    "S": details.transmission
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getTechnicalDetailsByPropertyId(details.property_id);
        return result ? result : null;
    }

}