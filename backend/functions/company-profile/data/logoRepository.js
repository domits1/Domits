import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const BUCKET = process.env.S3_BUCKET || "accommodation";
const REGION = process.env.AWS_REGION || "eu-north-1";

const EXTENSION_BY_CONTENT_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class CompanyLogoRepository {
  constructor({ s3Client = new S3Client({}) } = {}) {
    this.s3Client = s3Client;
  }

  isAllowedContentType(contentType) {
    return Object.prototype.hasOwnProperty.call(EXTENSION_BY_CONTENT_TYPE, contentType);
  }

  async createPresignedUpload(hostId, contentType) {
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
    const key = `company-logos/${hostId}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  }
}
