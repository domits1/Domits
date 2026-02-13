import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { ImageMapping } from "../../util/mapping/image.js";
import Database from "database";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Legacy } from "database/models/Property_Image_Legacy";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";

const BUCKET = process.env.S3_BUCKET || "accommodation";
const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WEB_MAX_WIDTH = 1920;
const WEB_QUALITY = 82;
const THUMB_MAX_WIDTH = 600;
const THUMB_QUALITY = 75;

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
            Bucket: BUCKET,
            Key: key,
            Body: imageBuffer,
            ContentType: contentType,
        });

        await this.s3Client.send(params);
        return key;
    }

    async getImagesByPropertyId(id) {
        const client = await Database.getInstance();
        const images = await client
            .getRepository(Property_Image)
            .createQueryBuilder("property_image")
            .where("property_id = :id", { id })
            .orderBy("sort_order", "ASC")
            .getMany();

        if (images.length > 0) {
            const imageIds = images.map((image) => image.id);
            const variants = await client
                .getRepository(Property_Image_Variant)
                .createQueryBuilder("variant")
                .where("image_id IN (:...imageIds)", { imageIds })
                .getMany();

            const variantsByImage = variants.reduce((acc, variant) => {
                if (!acc[variant.image_id]) acc[variant.image_id] = {};
                acc[variant.image_id][variant.variant] = {
                    key: variant.s3_key,
                    contentType: variant.content_type,
                    bytes: variant.bytes,
                    width: variant.width,
                    height: variant.height,
                };
                return acc;
            }, {});

            return images.map((image) => {
                const variantSet = variantsByImage[image.id] || {};
                const web = variantSet.web;
                const thumb = variantSet.thumb;
                const original = variantSet.original;
                return {
                    image_id: image.id,
                    sort_order: image.sort_order,
                    status: image.status,
                    key: web?.key || original?.key || "",
                    web_key: web?.key || null,
                    thumb_key: thumb?.key || null,
                    original_key: original?.key || null,
                };
            });
        }

        const legacy = await client
            .getRepository(Property_Image_Legacy)
            .createQueryBuilder("property_image_legacy")
            .where("property_id = :id", { id })
            .getMany();
        return legacy.length > 0 ? legacy.map(item => ImageMapping.mapDatabaseEntryToImage(item)) : null;
    }

    async getImageCountByPropertyId(propertyId) {
        const client = await Database.getInstance();
        const newCount = await client
            .getRepository(Property_Image)
            .createQueryBuilder("property_image")
            .where("property_id = :propertyId", { propertyId })
            .getCount();
        const legacyCount = await client
            .getRepository(Property_Image_Legacy)
            .createQueryBuilder("property_image_legacy")
            .where("property_id = :propertyId", { propertyId })
            .getCount();
        return Number(newCount || 0) + Number(legacyCount || 0);
    }

    async getImageByPropertyIdAndKey(id, key) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Image_Legacy)
            .createQueryBuilder("property_image_legacy")
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
            .into(Property_Image_Legacy)
            .values({
                property_id: image.property_id,
                key: image.key
            })
            .execute();
        const result = await this.getImageByPropertyIdAndKey(image.property_id, image.key);
        return result ? result : null;
    }

    getOriginalExtension(contentType) {
        switch (contentType) {
            case "image/jpeg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/webp":
                return "webp";
            default:
                return null;
        }
    }

    async createPresignedOriginalUpload(propertyId, imageId, contentType) {
        if (!ALLOWED_MIME_TYPES.has(contentType)) {
            throw new Error("Invalid image content type.");
        }
        const ext = this.getOriginalExtension(contentType);
        if (!ext) {
            throw new Error("Unsupported image content type.");
        }
        const key = `images/${propertyId}/${imageId}/original.${ext}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });
        const url = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
        return { key, url };
    }

    async headObject(key) {
        const result = await this.s3Client.send(
            new HeadObjectCommand({
                Bucket: BUCKET,
                Key: key
            })
        );
        return {
            contentType: result.ContentType || null,
            contentLength: result.ContentLength || 0
        };
    }

    async getObjectBuffer(key) {
        const result = await this.s3Client.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: key
            })
        );
        const stream = result.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    async uploadBuffer(key, buffer, contentType) {
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });
        await this.s3Client.send(command);
    }

    async deleteObjects(keys) {
        await Promise.all(
            keys.map((key) =>
                this.s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET,
                        Key: key
                    })
                )
            )
        );
    }

    async upsertImageRecord({ imageId, propertyId, sortOrder, status, createdAt, updatedAt }) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Image)
            .values({
                id: imageId,
                property_id: propertyId,
                sort_order: sortOrder,
                status,
                created_at: createdAt,
                updated_at: updatedAt,
            })
            .orIgnore()
            .execute();

        await client
            .createQueryBuilder()
            .update(Property_Image)
            .set({
                sort_order: sortOrder,
                status,
                updated_at: updatedAt,
            })
            .where("id = :imageId", { imageId })
            .execute();
    }

    async upsertVariantRecord({ id, imageId, variant, s3Key, contentType, bytes, width, height }) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Image_Variant)
            .values({
                id,
                image_id: imageId,
                variant,
                s3_key: s3Key,
                content_type: contentType,
                bytes,
                width,
                height,
            })
            .orIgnore()
            .execute();

        await client
            .createQueryBuilder()
            .update(Property_Image_Variant)
            .set({
                s3_key: s3Key,
                content_type: contentType,
                bytes,
                width,
                height,
            })
            .where("image_id = :imageId AND variant = :variant", { imageId, variant })
            .execute();
    }

    async processUploadedImage({ propertyId, imageId, originalKey, sortOrder }) {
        const now = Date.now();
        const expectedPrefix = `images/${propertyId}/${imageId}/original.`;
        if (!originalKey.startsWith(expectedPrefix)) {
            throw new Error("Original key does not match expected path.");
        }
        await this.upsertImageRecord({
            imageId,
            propertyId,
            sortOrder,
            status: "UPLOADING",
            createdAt: now,
            updatedAt: now,
        });

        const uploadedKeys = [];

        try {
            const head = await this.headObject(originalKey);
            if (!ALLOWED_MIME_TYPES.has(head.contentType)) {
                throw new Error("Invalid image content type.");
            }
            if (!head.contentLength || head.contentLength > MAX_ORIGINAL_BYTES) {
                throw new Error("Image exceeds maximum upload size.");
            }
            const originalBuffer = await this.getObjectBuffer(originalKey);
            const metadata = await sharp(originalBuffer).metadata();

            const webResult = await sharp(originalBuffer)
                .resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
                .jpeg({ quality: WEB_QUALITY })
                .toBuffer({ resolveWithObject: true });
            const thumbResult = await sharp(originalBuffer)
                .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
                .jpeg({ quality: THUMB_QUALITY })
                .toBuffer({ resolveWithObject: true });

            const webKey = `images/${propertyId}/${imageId}/web.jpg`;
            const thumbKey = `images/${propertyId}/${imageId}/thumb.jpg`;

            await this.uploadBuffer(webKey, webResult.data, "image/jpeg");
            uploadedKeys.push(webKey);
            await this.uploadBuffer(thumbKey, thumbResult.data, "image/jpeg");
            uploadedKeys.push(thumbKey);

            await this.upsertVariantRecord({
                id: randomUUID(),
                imageId,
                variant: "original",
                s3Key: originalKey,
                contentType: head.contentType,
                bytes: head.contentLength,
                width: metadata.width || null,
                height: metadata.height || null,
            });
            await this.upsertVariantRecord({
                id: randomUUID(),
                imageId,
                variant: "web",
                s3Key: webKey,
                contentType: "image/jpeg",
                bytes: webResult.data.length,
                width: webResult.info.width || null,
                height: webResult.info.height || null,
            });
            await this.upsertVariantRecord({
                id: randomUUID(),
                imageId,
                variant: "thumb",
                s3Key: thumbKey,
                contentType: "image/jpeg",
                bytes: thumbResult.data.length,
                width: thumbResult.info.width || null,
                height: thumbResult.info.height || null,
            });

            await this.upsertImageRecord({
                imageId,
                propertyId,
                sortOrder,
                status: "READY",
                createdAt: now,
                updatedAt: Date.now(),
            });

            return { imageId, webKey, thumbKey, originalKey };
        } catch (error) {
            await this.upsertImageRecord({
                imageId,
                propertyId,
                sortOrder,
                status: "FAILED",
                createdAt: now,
                updatedAt: Date.now(),
            });
            if (uploadedKeys.length > 0) {
                await this.deleteObjects(uploadedKeys);
            }
            throw error;
        }
    }

    async updateImageOrder(propertyId, images) {
        const client = await Database.getInstance();
        for (const image of images) {
            await client
                .createQueryBuilder()
                .update(Property_Image)
                .set({
                    sort_order: image.sort_order,
                    updated_at: Date.now(),
                })
                .where("id = :imageId AND property_id = :propertyId", {
                    imageId: image.image_id,
                    propertyId,
                })
                .execute();
        }
    }
}