import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

class PropertyRepository {
    constructor() {
        this.dynamoDbClient = new DynamoDBClient({ region: "eu-north-1" });
    }

    async getPropertyById(id) {
        const params = new GetItemCommand({
            TableName: "property-develop",
            Key: { id: { S: id } }
        });
        const result = await this.dynamoDbClient.send(params);
        return {
            hostId: result.Item.hostId.S,
            title: result.Item.title.S
        };

    }
}
export default PropertyRepository;