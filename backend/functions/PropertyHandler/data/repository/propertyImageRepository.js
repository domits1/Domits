import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto"
import { ImageMapping } from "../../util/mapping/image.js";
import Database from "database";
import {Property_Image} from "database/models/Property_Image";

export class PropertyImageRepository {

    s3Client = new S3Client({})

    constructor(systemManager) {
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
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Image)
            .createQueryBuilder("property_image")
            .where("property_id = :id", { id: id })
            .getMany();
        return result.length > 0 ? result.map(item => ImageMapping.mapDatabaseEntryToImage(item)) : null;
    }

    async getImageByPropertyIdAndKey(id, key) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Image)
            .createQueryBuilder("property_image")
            .where("property_id = :id", { id: id })
            .andWhere("key = :key", { key: key })
            .getOne();
        return result ? result : null;
    }

    async create(image) {
        const client = await Database.getInstance();
        image.key = await this.uploadImageToS3(image.image, image.property_id);
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Image)
            .values({
                property_id: image.property_id,
                key: image.key
            })
            .execute();
        const result = await this.getImageByPropertyIdAndKey(image.property_id, image.key);
        return result ? result : null;
    }

}