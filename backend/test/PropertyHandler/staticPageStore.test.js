import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  STATIC_SITE_PAGE_SLUGS,
  StaticPageStore,
  buildStaticPageKey,
  buildStaticSitePageKey,
  buildStaticSitemapKey,
} from "../../functions/PropertyHandler/data/repository/staticPageStore.js";
import { buildFakeSitesBucketClient } from "./fakeSitesBucketClient.js";

const BUCKET = "sites-bucket-under-test";

const buildStore = (send = jest.fn()) => new StaticPageStore({ client: { send } });

describe("the key a page is stored under", () => {
  it("is derived from the hostname only, so the site content can never choose it", () => {
    expect(buildStaticPageKey("wellness-villa-bisous-bf378265.direct.domits.com")).toBe(
      "sites/by-host/wellness-villa-bisous-bf378265.direct.domits.com/index.html"
    );
    expect(buildStaticPageKey("www.villasensual.nl")).toBe("sites/by-host/www.villasensual.nl/index.html");
  });

  it.each([
    ["", "empty"],
    ["Wellness.Direct.Domits.com", "uppercase"],
    ["../index.html", "a path"],
    ["-a..direct.domits.com", "a leading hyphen and an empty label"],
    [`${"a".repeat(64)}.domits.com`, "a label over 63 characters"],
    [`${"a.".repeat(127)}com`, "a name over 253 characters"],
  ])("refuses %j (%s)", (hostname) => {
    expect(() => buildStaticPageKey(hostname)).toThrow(TypeError);
  });
});

describe("StaticPageStore", () => {
  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = BUCKET;
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
  });

  it("refuses to start without a configured bucket, rather than writing to a guessed one", () => {
    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;

    expect(() => buildStore()).toThrow("DIRECT_BOOKING_WEBSITE_SITES_BUCKET");
  });

  it("reads the app shell from the root of the sites bucket", async () => {
    const send = jest.fn(async () => ({ Body: { transformToString: async () => "<html>shell</html>" } }));

    const shell = await buildStore(send).readAppShell();

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({ Bucket: BUCKET, Key: "index.html" });
    expect(shell).toBe("<html>shell</html>");
  });

  it("treats an empty shell as a failure instead of rendering into nothing", async () => {
    const send = jest.fn(async () => ({ Body: { transformToString: async () => "   " } }));

    await expect(buildStore(send).readAppShell()).rejects.toThrow("The app shell in the sites bucket is empty.");
  });

  it("writes the page as html under the hostname, tagged with the site and revision it came from", async () => {
    const send = jest.fn(async () => ({}));
    const page = { hostname: "www.villasensual.nl", html: "<html>page</html>", siteId: "site-1", revision: 4 };

    await buildStore(send).putPage(page);

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: BUCKET,
      Key: "sites/by-host/www.villasensual.nl/index.html",
      Body: "<html>page</html>",
      ContentType: "text/html; charset=utf-8",
      CacheControl: "public, max-age=300",
      Metadata: { "site-id": "site-1", revision: "4" },
    });
  });

  it("lets an upload failure reach the caller instead of reporting a page that is not there", async () => {
    const send = jest.fn(async () => Promise.reject(new Error("AccessDenied")));
    const page = { hostname: "www.villasensual.nl", html: "<html>page</html>", siteId: "site-1", revision: 4 };

    await expect(buildStore(send).putPage(page)).rejects.toThrow("AccessDenied");
  });

  it("withdraws a page by deleting exactly its hostname key, a delete marker on this versioned bucket", async () => {
    const send = jest.fn(async () => ({}));

    expect(await buildStore(send).deletePage({ hostname: "www.villasensual.nl" })).toBe(true);

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: BUCKET, Key: "sites/by-host/www.villasensual.nl/index.html" });
  });

  it("deletes only the listed version of a page when given its etag, and answers false when the page changed", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error("PreconditionFailed"), { $metadata: { httpStatusCode: 412 } }));
    const store = buildStore(send);

    expect(await store.deletePage({ hostname: "www.villasensual.nl", etag: '"e1"' })).toBe(true);
    expect(send.mock.calls[0][0].input.IfMatch).toBe('"e1"');
    expect(await store.deletePage({ hostname: "www.villasensual.nl", etag: '"e1"' })).toBe(false);
  });

  it.each([
    ["another conditional delete is in flight", 409, '"e1"', false],
    ["another delete already won", 404, '"e1"', true],
  ])("answers quietly when %s", async (_label, httpStatusCode, etag, expected) => {
    const send = jest.fn().mockRejectedValueOnce(Object.assign(new Error("s3"), { $metadata: { httpStatusCode } }));

    expect(await buildStore(send).deletePage({ hostname: "www.villasensual.nl", etag })).toBe(expected);
  });

  it("refuses to delete under a key that is not a hostname key", async () => {
    const send = jest.fn();

    await expect(buildStore(send).deletePage({ hostname: "../index.html" })).rejects.toThrow(TypeError);
    expect(send).not.toHaveBeenCalled();
  });

  it("lists the hostnames that have a page across pages of the listing, and reports keys that are not page keys", async () => {
    const pages = [
      {
        Contents: [
          { Key: "sites/by-host/a.direct.domits.com/index.html", ETag: '"e1"' },
          { Key: "sites/by-host/a.direct.domits.com/old.html" },
          { Key: "sites/by-host/index.html" },
          { Key: "sites/by-host/UPPER.example/index.html" },
        ],
        IsTruncated: true,
        NextContinuationToken: "t2",
      },
      { Contents: [{ Key: "sites/by-host/www.b.nl/index.html" }], IsTruncated: false },
    ];
    const send = jest.fn(async () => pages.shift());

    const listed = await buildStore(send).listPageHostnames();

    expect(send.mock.calls.map(([command]) => command)).toEqual([
      expect.any(ListObjectsV2Command),
      expect.any(ListObjectsV2Command),
    ]);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: BUCKET,
      Prefix: "sites/by-host/",
      ContinuationToken: undefined,
    });
    expect(send.mock.calls[1][0].input.ContinuationToken).toBe("t2");
    expect(listed).toEqual({
      hostnames: ["a.direct.domits.com", "www.b.nl"],
      etags: { "a.direct.domits.com": '"e1"', "www.b.nl": "" },
      sitePages: {},
      rejected: [
        "sites/by-host/a.direct.domits.com/old.html",
        "sites/by-host/index.html",
        "sites/by-host/UPPER.example/index.html",
      ],
    });
  });

  it("skips the sitemap next to a page when it lists the stored pages, instead of reporting it as a stray key", async () => {
    const send = jest.fn(async () => ({
      Contents: [
        { Key: "sites/by-host/a.direct.domits.com/index.html", ETag: '"e1"' },
        { Key: "sites/by-host/a.direct.domits.com/sitemap.xml" },
        { Key: "sites/by-host/b.direct.domits.com/sitemap.xml" },
      ],
      IsTruncated: false,
    }));

    const listed = await buildStore(send).listPageHostnames();

    expect(listed).toEqual({
      hostnames: ["a.direct.domits.com"],
      etags: { "a.direct.domits.com": '"e1"' },
      sitePages: {},
      rejected: [],
    });
  });

  it("lists the page keys of each host apart, with their etags, and still reports any other key under a host", async () => {
    const send = jest.fn(async () => ({
      Contents: [
        { Key: "sites/by-host/a.direct.domits.com/index.html", ETag: '"e1"' },
        { Key: "sites/by-host/a.direct.domits.com/pages/gallery.html", ETag: '"g1"' },
        { Key: "sites/by-host/a.direct.domits.com/pages/contact-us.html", ETag: '"c1"' },
        { Key: "sites/by-host/www.b.nl/pages/accommodation.html", ETag: '"a2"' },
        { Key: "sites/by-host/a.direct.domits.com/pages/contact.html" },
        { Key: "sites/by-host/a.direct.domits.com/pages/Gallery.html" },
        { Key: "sites/by-host/a.direct.domits.com/pages/index.html" },
        { Key: "sites/by-host/UPPER.example/pages/gallery.html" },
        { Key: "sites/by-host/a.direct.domits.com/x/pages/gallery.html" },
      ],
      IsTruncated: false,
    }));

    const listed = await buildStore(send).listPageHostnames();

    expect(listed).toEqual({
      hostnames: ["a.direct.domits.com"],
      etags: { "a.direct.domits.com": '"e1"' },
      sitePages: {
        "a.direct.domits.com": { gallery: '"g1"', "contact-us": '"c1"' },
        "www.b.nl": { accommodation: '"a2"' },
      },
      rejected: [
        "sites/by-host/a.direct.domits.com/pages/contact.html",
        "sites/by-host/a.direct.domits.com/pages/Gallery.html",
        "sites/by-host/a.direct.domits.com/pages/index.html",
        "sites/by-host/UPPER.example/pages/gallery.html",
        "sites/by-host/a.direct.domits.com/x/pages/gallery.html",
      ],
    });
  });

  it("refuses to reconcile a prefix with more keys than it is willing to scan, whatever they are", async () => {
    let page = 0;
    const send = jest.fn(async () => {
      page += 1;
      return {
        Contents: Array.from({ length: 1000 }, (_, index) => ({
          Key: `sites/by-host/s${page}-${index}.direct.domits.com/stray`,
        })),
        IsTruncated: true,
        NextContinuationToken: `t${page}`,
      };
    });

    await expect(buildStore(send).listPageHostnames()).rejects.toThrow("More than 20000 keys");
    expect(send).toHaveBeenCalledTimes(21);
  });

  it("writes the sitemap as xml next to the page of the same hostname, tagged with the site and revision", async () => {
    const send = jest.fn(async () => ({}));
    const sitemap = { hostname: "www.villasensual.nl", xml: "<urlset/>", siteId: "site-1", revision: 4 };

    await buildStore(send).putSitemap(sitemap);

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: BUCKET,
      Key: "sites/by-host/www.villasensual.nl/sitemap.xml",
      Body: "<urlset/>",
      ContentType: "application/xml; charset=utf-8",
      CacheControl: "public, max-age=300",
      Metadata: { "site-id": "site-1", revision: "4" },
    });
  });

  it("tags a sitemap written without a revision with the site only, never with the word undefined", async () => {
    const send = jest.fn(async () => ({}));

    await buildStore(send).putSitemap({ hostname: "www.villasensual.nl", xml: "<urlset/>", siteId: "site-1" });

    expect(send.mock.calls[0][0].input.Metadata).toEqual({ "site-id": "site-1" });
  });

  it("refuses to write a sitemap under a key that is not a hostname key", async () => {
    const send = jest.fn();

    await expect(
      buildStore(send).putSitemap({ hostname: "../sitemap.xml", xml: "<urlset/>", siteId: "site-1" })
    ).rejects.toThrow(new TypeError("A static page key needs a lowercase hostname."));
    expect(send).not.toHaveBeenCalled();
  });
});

describe("the key a sitemap is stored under", () => {
  it("sits under the same hostname prefix as the page, so the writer policy already covers it", () => {
    expect(buildStaticSitemapKey("www.villasensual.nl")).toBe("sites/by-host/www.villasensual.nl/sitemap.xml");
  });

  it.each([["Wellness.Direct.Domits.com"], ["../index.html"], [""]])("refuses %j like the page key", (hostname) => {
    expect(() => buildStaticSitemapKey(hostname)).toThrow(
      new TypeError("A static page key needs a lowercase hostname.")
    );
  });
});

describe("the key a site page is stored under", () => {
  it("names one file per page under the hostname, for the fixed pages only", () => {
    expect(STATIC_SITE_PAGE_SLUGS).toEqual(["gallery", "accommodation", "contact-us"]);
    expect(STATIC_SITE_PAGE_SLUGS.map((slug) => buildStaticSitePageKey("www.villasensual.nl", slug))).toEqual([
      "sites/by-host/www.villasensual.nl/pages/gallery.html",
      "sites/by-host/www.villasensual.nl/pages/accommodation.html",
      "sites/by-host/www.villasensual.nl/pages/contact-us.html",
    ]);
  });

  it.each([
    [""],
    ["index"],
    ["contact"],
    ["Gallery"],
    ["gallery.html"],
    ["gallery/x"],
    ["../index"],
    ["toString"],
    [undefined],
    [["gallery"]],
  ])("refuses the slug %j", (slug) => {
    expect(() => buildStaticSitePageKey("www.villasensual.nl", slug)).toThrow(
      new TypeError("A site page key needs a slug from the fixed page list.")
    );
  });

  it.each([["Www.Villasensual.nl"], ["../index.html"], ["www.villasensual.nl/pages"]])(
    "refuses the hostname %j like the page key",
    (hostname) => {
      expect(() => buildStaticSitePageKey(hostname, "gallery")).toThrow(
        new TypeError("A static page key needs a lowercase hostname.")
      );
    }
  );
});

describe("the site pages in the store", () => {
  const HOST = "www.villasensual.nl";

  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = BUCKET;
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
  });

  it("writes a site page as html under its key, tagged with the site and revision it came from", async () => {
    const send = jest.fn(async () => ({}));

    await buildStore(send).putSitePage({
      hostname: HOST,
      slug: "gallery",
      html: "<html>g</html>",
      siteId: "s1",
      revision: 4,
    });

    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: BUCKET,
      Key: "sites/by-host/www.villasensual.nl/pages/gallery.html",
      Body: "<html>g</html>",
      ContentType: "text/html; charset=utf-8",
      CacheControl: "public, max-age=300",
      Metadata: { "site-id": "s1", revision: "4" },
    });
  });

  it("refuses to write or delete a site page outside the fixed pages, before the bucket is asked", async () => {
    const send = jest.fn();
    const store = buildStore(send);

    await expect(store.putSitePage({ hostname: HOST, slug: "../index", html: "x", siteId: "s1" })).rejects.toThrow(
      TypeError
    );
    await expect(store.deleteSitePage({ hostname: HOST, slug: "index" })).rejects.toThrow(TypeError);
    await expect(store.listSitePages("../index.html")).rejects.toThrow(TypeError);
    expect(send).not.toHaveBeenCalled();
  });

  it("lists only the fixed pages of the one host, across pages of the listing, never a longer hostname", async () => {
    const client = buildFakeSitesBucketClient({
      pageSize: 2,
      objects: {
        [`sites/by-host/${HOST}/index.html`]: "main",
        [`sites/by-host/${HOST}/pages/accommodation.html`]: "a",
        [`sites/by-host/${HOST}/pages/old.html`]: "old",
        [`sites/by-host/${HOST}/pages/contact-us.html`]: "c",
        [`sites/by-host/${HOST}.example.com/pages/gallery.html`]: "other host",
      },
    });

    const pages = await new StaticPageStore({ client }).listSitePages(HOST);

    expect(pages).toEqual({ accommodation: expect.stringMatching(/^"v\d+"$/), "contact-us": expect.any(String) });
    expect(client.calls.map((call) => [call.name, call.key])).toEqual([
      ["ListObjectsV2Command", `sites/by-host/${HOST}/pages/`],
      ["ListObjectsV2Command", `sites/by-host/${HOST}/pages/`],
    ]);
  });

  it("deletes a site page by its key, only the listed version when given its etag", async () => {
    const client = buildFakeSitesBucketClient({ objects: { [`sites/by-host/${HOST}/pages/gallery.html`]: "g" } });
    const store = new StaticPageStore({ client });

    expect(await store.deleteSitePage({ hostname: HOST, slug: "gallery", etag: '"stale"' })).toBe(false);
    expect(client.objects()).toEqual({ [`sites/by-host/${HOST}/pages/gallery.html`]: "g" });
    expect(await store.deleteSitePage({ hostname: HOST, slug: "gallery", etag: '"v1"' })).toBe(true);
    expect(client.objects()).toEqual({});
    expect(await store.deleteSitePage({ hostname: HOST, slug: "gallery" })).toBe(true);
  });
});
