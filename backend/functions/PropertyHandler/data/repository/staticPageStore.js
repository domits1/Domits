import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET_ENV_NAME = "DIRECT_BOOKING_WEBSITE_SITES_BUCKET";
const APP_SHELL_KEY = "index.html";
const PAGE_CONTENT_TYPE = "text/html; charset=utf-8";
const PAGE_CACHE_CONTROL = "public, max-age=300";
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_HOSTNAME_LENGTH = 253;

export const buildStaticPageKey = (hostname) => {
  const labels = typeof hostname === "string" ? hostname.split(".") : [];
  const isHostname =
    labels.length >= 2 &&
    hostname.length <= MAX_HOSTNAME_LENGTH &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
  if (!isHostname) {
    throw new TypeError("A static page key needs a lowercase hostname.");
  }

  return `sites/by-host/${hostname}/index.html`;
};

export class StaticPageStore {
  constructor({ client = new S3Client({}) } = {}) {
    this.client = client;
    this.bucketName = String(process.env[BUCKET_ENV_NAME] || "").trim();
    if (!this.bucketName) {
      throw new Error(`${BUCKET_ENV_NAME} must name the direct booking sites bucket.`);
    }
  }

  async readAppShell() {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: APP_SHELL_KEY }));
    const shell = await response.Body.transformToString();
    if (!shell.trim()) {
      throw new Error("The app shell in the sites bucket is empty.");
    }

    return shell;
  }

  async putPage({ hostname, html, siteId, revision }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: buildStaticPageKey(hostname),
        Body: html,
        ContentType: PAGE_CONTENT_TYPE,
        CacheControl: PAGE_CACHE_CONTROL,
        Metadata: { "site-id": String(siteId), revision: String(revision) },
      })
    );
  }
}

export default StaticPageStore;
