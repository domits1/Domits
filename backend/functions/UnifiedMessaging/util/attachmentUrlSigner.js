import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { parseStoredAttachments } from "./storedAttachments.js";

const BUCKET = process.env.MESSAGING_ATTACHMENTS_BUCKET || "general-messaging-production-attachments";
const REGION = process.env.MESSAGING_ATTACHMENTS_REGION || "eu-north-1";
const SIGNED_URL_TTL_SECONDS = 3600;

const BUCKET_HOSTS = new Set([`${BUCKET}.s3.amazonaws.com`, `${BUCKET}.s3.${REGION}.amazonaws.com`]);

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) s3Client = new S3Client({ region: REGION });
  return s3Client;
};

const extractBucketKey = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !BUCKET_HOSTS.has(parsed.hostname)) return null;
    return decodeURIComponent(parsed.pathname.slice(1)) || null;
  } catch {
    return null;
  }
};

export const signAttachmentUrl = async (url) => {
  if (typeof url !== "string" || !url) return url;

  const key = extractBucketKey(url);
  if (!key) return url;

  try {
    return await getSignedUrl(getS3Client(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Failed to sign attachment URL", error);
    return url;
  }
};

export const signUrlList = async (urls) => {
  if (!Array.isArray(urls)) return urls;
  return Promise.all(urls.map((url) => signAttachmentUrl(url)));
};

const signAttachmentList = (attachments) =>
  Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment || typeof attachment !== "object" || typeof attachment.url !== "string") return attachment;
      return { ...attachment, url: await signAttachmentUrl(attachment.url) };
    })
  );

export const signAttachments = async (attachments) => {
  if (Array.isArray(attachments)) return signAttachmentList(attachments);

  if (typeof attachments === "string") {
    const parsed = parseStoredAttachments(attachments);
    if (!parsed) return attachments;
    return JSON.stringify(await signAttachmentList(parsed));
  }

  return attachments;
};

export const signMessage = async (message) => {
  if (!message || typeof message !== "object") return message;

  const signed = { ...message };
  if ("attachments" in message) signed.attachments = await signAttachments(message.attachments);
  if (Array.isArray(message.fileUrls)) signed.fileUrls = await signUrlList(message.fileUrls);
  return signed;
};

export const signMessages = async (messages) => {
  if (!Array.isArray(messages)) return messages;
  return Promise.all(messages.map((message) => signMessage(message)));
};
