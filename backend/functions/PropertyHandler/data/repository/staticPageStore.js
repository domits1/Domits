import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const BUCKET_ENV_NAME = "DIRECT_BOOKING_WEBSITE_SITES_BUCKET";
const APP_SHELL_KEY = "index.html";
const PAGE_CONTENT_TYPE = "text/html; charset=utf-8";
const PAGE_CACHE_CONTROL = "public, max-age=300";
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_HOSTNAME_LENGTH = 253;
const PAGE_KEY_PREFIX = "sites/by-host/";
const PAGE_KEY_SUFFIX = "/index.html";
const MAX_LISTED_PAGES = 5000;

export const buildStaticPageKey = (hostname) => {
  const labels = typeof hostname === "string" ? hostname.split(".") : [];
  const isHostname =
    labels.length >= 2 &&
    hostname.length <= MAX_HOSTNAME_LENGTH &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
  if (!isHostname) {
    throw new TypeError("A static page key needs a lowercase hostname.");
  }

  return `${PAGE_KEY_PREFIX}${hostname}${PAGE_KEY_SUFFIX}`;
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

  async listPageHostnames() {
    const hostnames = [];
    let continuationToken;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: PAGE_KEY_PREFIX,
          ContinuationToken: continuationToken,
        })
      );
      for (const object of response?.Contents || []) {
        const key = String(object?.Key || "");
        if (key.startsWith(PAGE_KEY_PREFIX) && key.endsWith(PAGE_KEY_SUFFIX)) {
          hostnames.push(key.slice(PAGE_KEY_PREFIX.length, -PAGE_KEY_SUFFIX.length));
        }
      }
      if (hostnames.length > MAX_LISTED_PAGES) {
        throw new Error(`More than ${MAX_LISTED_PAGES} pages under ${PAGE_KEY_PREFIX}; refusing to reconcile blindly.`);
      }
      continuationToken = response?.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return hostnames.filter((hostname) => hostname && !hostname.includes("/"));
  }

  async deletePage({ hostname }) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: buildStaticPageKey(hostname) }));
  }
}

export default StaticPageStore;
