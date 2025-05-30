import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { CheckInMapping } from "../../util/mapping/checkIn.js";

export class PropertyCheckInRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getPropertyCheckInTimeslotsByPropertyId(id) {
        const params = new GetItemCommand({
            "TableName": "property-check-in-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? CheckInMapping.mapDatabaseEntryToCheckIn(result.Item): null;
    }

    async create(timeslots) {
        const params = new PutItemCommand({
            "TableName": "property-check-in-develop",
            "Item": {
                "property_id": {
                    "S": timeslots.property_id
                },
                "checkIn": {
                    "M": {
                        "from": {
                            "N": `${timeslots.checkIn.from}`
                        },
                        "till": {
                            "N": `${timeslots.checkIn.till}`
                        }
                    }
                },
                "checkOut": {
                    "M": {
                        "from": {
                            "N": `${timeslots.checkOut.from}`
                        },
                        "till": {
                            "N": `${timeslots.checkOut.till}`
                        }
                    }
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyCheckInTimeslotsByPropertyId(timeslots.property_id);
        return result ? result : null;
    }

}