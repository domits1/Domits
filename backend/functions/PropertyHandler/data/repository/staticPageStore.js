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
const MAX_SCANNED_KEYS = 20000;

export const isStaticPageHostname = (hostname) => {
  const labels = typeof hostname === "string" ? hostname.split(".") : [];
  return (
    labels.length >= 2 &&
    hostname.length <= MAX_HOSTNAME_LENGTH &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label))
  );
};

export const buildStaticPageKey = (hostname) => {
  if (!isStaticPageHostname(hostname)) {
    throw new TypeError("A static page key needs a lowercase hostname.");
  }

  return `${PAGE_KEY_PREFIX}${hostname}${PAGE_KEY_SUFFIX}`;
};

const hostnameOfPageKey = (key) =>
  key.startsWith(PAGE_KEY_PREFIX) && key.endsWith(PAGE_KEY_SUFFIX)
    ? key.slice(PAGE_KEY_PREFIX.length, -PAGE_KEY_SUFFIX.length)
    : "";

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
    const etags = {};
    const rejected = [];
    let scanned = 0;
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
        const hostname = hostnameOfPageKey(key);
        if (isStaticPageHostname(hostname)) {
          hostnames.push(hostname);
          etags[hostname] = String(object?.ETag || "");
        } else {
          rejected.push(key);
        }
      }
      scanned += (response?.Contents || []).length;
      if (scanned > MAX_SCANNED_KEYS) {
        throw new Error(`More than ${MAX_SCANNED_KEYS} keys under ${PAGE_KEY_PREFIX}; refusing to reconcile blindly.`);
      }
      continuationToken = response?.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return { hostnames, etags, rejected };
  }

  async deletePage({ hostname, etag = "" }) {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: buildStaticPageKey(hostname),
          ...(etag ? { IfMatch: etag } : {}),
        })
      );
      return true;
    } catch (error) {
      if (etag && error?.$metadata?.httpStatusCode === 412) {
        return false;
      }
      throw error;
    }
  }
}

export default StaticPageStore;
