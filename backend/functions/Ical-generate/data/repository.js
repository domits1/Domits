import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.REGION || "eu-north-1" });
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.REGION || "eu-north-1";

export class Repository {
  async uploadIcsAndPresign(Key, Body) {
    if (!BUCKET) throw new Error("S3_BUCKET env is missing");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key,
        Body,
        ContentType: "text/calendar; charset=utf-8",
        CacheControl: "no-cache, no-store, must-revalidate",
      })
    );

    const encodedKey = encodeURIComponent(Key).replace(/%2F/g, "/");
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodedKey}`;
    return url;
  }
}