import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  StaticPageStore,
  buildStaticPageKey,
} from "../../functions/PropertyHandler/data/repository/staticPageStore.js";

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
      rejected: [
        "sites/by-host/a.direct.domits.com/old.html",
        "sites/by-host/index.html",
        "sites/by-host/UPPER.example/index.html",
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
});
