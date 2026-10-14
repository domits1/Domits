import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET || "accommodation";
const BUCKET_URL = `https://${BUCKET}.s3.eu-north-1.amazonaws.com/`;

const s3Client = new S3Client({});

export const uploadPhoto = async (key, buffer, contentType) => {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));

    return `${BUCKET_URL}${key}`;
};
