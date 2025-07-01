import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto"
import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ImageMapping } from "../../util/mapping/image.js";

export class PropertyImageRepository {

    s3Client = new S3Client({})

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async uploadImageToS3(image, propertyId) {
        const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error("Invalid image data URL");
        }

        const contentType = matches[1];
        const imageBuffer = Buffer.from(matches[2], "base64");
        const key = `images/${propertyId}/${randomUUID()}`;

        const params = new PutObjectCommand({
            Bucket: "accommodation",
            Key: key,
            Body: imageBuffer,
            ContentType: contentType,
        });

        await this.s3Client.send(params);
        return key;
    }

    async getImagesByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-image-develop",
            "IndexName": "property_id-index",
            "KeyConditionExpression": "#property_id = :id",
            "ExpressionAttributeNames": {
                "#property_id": "property_id"
            },
            "ExpressionAttributeValues": {
                ":id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Items ? result.Items.map(item => ImageMapping.mapDatabaseEntryToImage(item)) : null;
    }

    async getImageByPropertyIdAndKey(id, key) {
        const params = new GetItemCommand({
            "TableName": "property-image-develop",
            "Key": {
                "property_id": {
                    "S": id
                },
                "key": {
                    "S": key
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async create(image) {
        image.key = await this.uploadImageToS3(image.image, image.property_id);
        const params = new PutItemCommand({
            "TableName": "property-image-develop",
            "Item": {
                "property_id": {
                    "S": image.property_id
                },
                "key": {
                    "S": image.key
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getImageByPropertyIdAndKey(image.property_id, image.key);
        return result ? result : null;
    }

}