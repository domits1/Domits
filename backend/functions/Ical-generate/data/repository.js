import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.REGION || "eu-north-1" });
const BUCKET = process.env.S3_BUCKET;
const EXPIRES = parseInt(process.env.PRESIGN_EXPIRES_SECONDS || "3600", 10);

export class Repository {
  async uploadIcsAndPresign(Key, Body) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key,
      Body,
      ContentType: "text/calendar; charset=utf-8",
      CacheControl: "no-cache"
    }));
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: EXPIRES });
    return url;
  }
}