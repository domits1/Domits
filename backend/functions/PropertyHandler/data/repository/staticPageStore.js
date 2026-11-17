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
const SITEMAP_CONTENT_TYPE = "application/xml; charset=utf-8";
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_HOSTNAME_LENGTH = 253;
const PAGE_KEY_PREFIX = "sites/by-host/";
const PAGE_KEY_SUFFIX = "/index.html";
const SITEMAP_KEY_SUFFIX = "/sitemap.xml";
const SITE_PAGE_DIRECTORY = "/pages/";
const SITE_PAGE_EXTENSION = ".html";
const MAX_SCANNED_KEYS = 20000;

export const STATIC_SITE_PAGE_SLUGS = Object.freeze(["gallery", "accommodation", "contact-us"]);

export const isStaticPageHostname = (hostname) => {
  const labels = typeof hostname === "string" ? hostname.split(".") : [];
  return (
    labels.length >= 2 &&
    hostname.length <= MAX_HOSTNAME_LENGTH &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label))
  );
};

const requireKeyHostname = (hostname) => {
  if (!isStaticPageHostname(hostname)) {
    throw new TypeError("A static page key needs a lowercase hostname.");
  }

  return hostname;
};

export const buildStaticPageKey = (hostname) => `${PAGE_KEY_PREFIX}${requireKeyHostname(hostname)}${PAGE_KEY_SUFFIX}`;

export const buildStaticSitemapKey = (hostname) =>
  `${PAGE_KEY_PREFIX}${requireKeyHostname(hostname)}${SITEMAP_KEY_SUFFIX}`;

const requireSitePageSlug = (slug) => {
  if (!STATIC_SITE_PAGE_SLUGS.includes(slug)) {
    throw new TypeError("A site page key needs a slug from the fixed page list.");
  }

  return slug;
};

const buildSitePagesPrefix = (hostname) => `${PAGE_KEY_PREFIX}${requireKeyHostname(hostname)}${SITE_PAGE_DIRECTORY}`;

export const buildStaticSitePageKey = (hostname, slug) =>
  `${buildSitePagesPrefix(hostname)}${requireSitePageSlug(slug)}${SITE_PAGE_EXTENSION}`;

const buildSourceMetadata = (siteId, revision) => ({
  "site-id": String(siteId),
  ...(revision === undefined ? {} : { revision: String(revision) }),
});

const hostnameOfKey = (key, suffix) =>
  key.startsWith(PAGE_KEY_PREFIX) && key.endsWith(suffix) ? key.slice(PAGE_KEY_PREFIX.length, -suffix.length) : "";

const isSitemapKey = (key) => isStaticPageHostname(hostnameOfKey(key, SITEMAP_KEY_SUFFIX));

const sitePageOfKey = (key) =>
  STATIC_SITE_PAGE_SLUGS.map((slug) => ({
    slug,
    hostname: hostnameOfKey(key, `${SITE_PAGE_DIRECTORY}${slug}${SITE_PAGE_EXTENSION}`),
  })).find(({ hostname }) => isStaticPageHostname(hostname)) || null;

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
    await this.#put({
      key: buildStaticPageKey(hostname),
      body: html,
      contentType: PAGE_CONTENT_TYPE,
      siteId,
      revision,
    });
  }

  async putSitemap({ hostname, xml, siteId, revision }) {
    await this.#put({
      key: buildStaticSitemapKey(hostname),
      body: xml,
      contentType: SITEMAP_CONTENT_TYPE,
      siteId,
      revision,
    });
  }

  async putSitePage({ hostname, slug, html, siteId, revision }) {
    await this.#put({
      key: buildStaticSitePageKey(hostname, slug),
      body: html,
      contentType: PAGE_CONTENT_TYPE,
      siteId,
      revision,
    });
  }

  async listPageHostnames() {
    const hostnames = [];
    const etags = {};
    const sitePages = {};
    const rejected = [];
    await this.#eachObject(PAGE_KEY_PREFIX, (key, etag) => {
      if (isSitemapKey(key)) {
        return;
      }
      const page = sitePageOfKey(key);
      if (page) {
        sitePages[page.hostname] = { ...sitePages[page.hostname], [page.slug]: etag };
        return;
      }
      const hostname = hostnameOfKey(key, PAGE_KEY_SUFFIX);
      if (isStaticPageHostname(hostname)) {
        hostnames.push(hostname);
        etags[hostname] = etag;
      } else {
        rejected.push(key);
      }
    });

    return { hostnames, etags, sitePages, rejected };
  }

  async listSitePages(hostname) {
    const pages = {};
    await this.#eachObject(buildSitePagesPrefix(hostname), (key, etag) => {
      const page = sitePageOfKey(key);
      if (page) {
        pages[page.slug] = etag;
      }
    });

    return pages;
  }

  async deletePage({ hostname, etag = "" }) {
    return this.#delete(buildStaticPageKey(hostname), etag);
  }

  async deleteSitePage({ hostname, slug, etag = "" }) {
    return this.#delete(buildStaticSitePageKey(hostname, slug), etag);
  }

  async #put({ key, body, contentType, siteId, revision }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: PAGE_CACHE_CONTROL,
        Metadata: buildSourceMetadata(siteId, revision),
      })
    );
  }

  async #eachObject(prefix, visit) {
    let scanned = 0;
    let continuationToken;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: prefix, ContinuationToken: continuationToken })
      );
      for (const object of response?.Contents || []) {
        visit(String(object?.Key || ""), String(object?.ETag || ""));
      }
      scanned += (response?.Contents || []).length;
      if (scanned > MAX_SCANNED_KEYS) {
        throw new Error(`More than ${MAX_SCANNED_KEYS} keys under ${prefix}; refusing to reconcile blindly.`);
      }
      continuationToken = response?.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  async #delete(key, etag) {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key, ...(etag ? { IfMatch: etag } : {}) })
      );
      return true;
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (etag && (status === 412 || status === 409)) {
        return false;
      }
      if (status === 404) {
        return true;
      }
      throw error;
    }
  }
}

export default StaticPageStore;
