import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_LIFETIME_SECONDS = 300;

const SIGNED_UPLOAD_HEADERS = new Set(["content-type", "content-length"]);

const readBucketName = () => {
  const bucketName = process.env.DOCUMENTS_BUCKET?.trim();
  if (!bucketName) {
    throw new Error("DOCUMENTS_BUCKET is not set");
  }
  return bucketName;
};

export class StorageRepository {
  constructor({ s3Client = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" }) } = {}) {
    this.s3Client = s3Client;
  }

  async createUploadUrl(key, contentType, contentLength) {
    const command = new PutObjectCommand({
      Bucket: readBucketName(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: UPLOAD_URL_LIFETIME_SECONDS,
      signableHeaders: SIGNED_UPLOAD_HEADERS,
    });
  }
}
