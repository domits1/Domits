import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
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

    await buildStore(send).deletePage({ hostname: "www.villasensual.nl" });

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: BUCKET, Key: "sites/by-host/www.villasensual.nl/index.html" });
  });

  it("refuses to delete under a key that is not a hostname key", async () => {
    const send = jest.fn();

    await expect(buildStore(send).deletePage({ hostname: "../index.html" })).rejects.toThrow(TypeError);
    expect(send).not.toHaveBeenCalled();
  });
});
