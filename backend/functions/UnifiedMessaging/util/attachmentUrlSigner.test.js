const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({})),
  GetObjectCommand: jest.fn((input) => ({ input })),
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args) => mockGetSignedUrl(...args),
}));

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  signAttachmentUrl,
  signAttachments,
  signMessage,
  signMessages,
  signUrlList,
} from "./attachmentUrlSigner.js";

const BUCKET = "general-messaging-production-attachments";
const RAW_URL = `https://${BUCKET}.s3.amazonaws.com/images/abc-123.png`;
const SIGNED_URL = "https://signed.example/images/abc-123.png?X-Amz-Expires=3600";

describe("attachmentUrlSigner", () => {
  beforeEach(() => {
    mockGetSignedUrl.mockReset();
    GetObjectCommand.mockClear();
    mockGetSignedUrl.mockImplementation(async (_client, command, options) => {
      return `https://signed.example/${command.input.Key}?X-Amz-Expires=${options.expiresIn}`;
    });
  });

  describe("signAttachmentUrl", () => {
    test("signs a URL on the bucket's global host for one hour", async () => {
      await expect(signAttachmentUrl(RAW_URL)).resolves.toBe(SIGNED_URL);

      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: BUCKET, Key: "images/abc-123.png" });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
    });

    test("signs a URL on the bucket's regional host", async () => {
      const regional = `https://${BUCKET}.s3.eu-north-1.amazonaws.com/images/abc-123.png`;

      await expect(signAttachmentUrl(regional)).resolves.toBe(SIGNED_URL);
    });

    test("signs with one client for eu-north-1 that is reused", async () => {
      await signAttachmentUrl(RAW_URL);
      await signAttachmentUrl(RAW_URL);

      expect(S3Client).toHaveBeenCalledTimes(1);
      expect(S3Client).toHaveBeenCalledWith({ region: "eu-north-1" });
    });

    test("ignores the query string and decodes the key", async () => {
      await signAttachmentUrl(`https://${BUCKET}.s3.amazonaws.com/images/my%20photo.png?x=1`);

      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: BUCKET, Key: "images/my photo.png" });
    });

    test.each([
      ["another host", "https://example.com/images/abc.png"],
      ["another bucket", "https://other-bucket.s3.amazonaws.com/images/abc.png"],
      ["a host that only starts with the bucket host", `https://${BUCKET}.s3.amazonaws.com.evil.com/images/abc.png`],
      ["a plain http URL", `http://${BUCKET}.s3.amazonaws.com/images/abc.png`],
      ["a blob URL", "blob:https://app.domits.com/6f1c"],
      ["a bucket URL with no key", `https://${BUCKET}.s3.amazonaws.com/`],
      ["a bucket URL with a broken percent escape", `https://${BUCKET}.s3.amazonaws.com/images/%E0%A4%A.png`],
    ])("leaves %s unchanged", async (_label, url) => {
      await expect(signAttachmentUrl(url)).resolves.toBe(url);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    test.each([[null], [undefined], [""], [42], [{}]])("returns %p unchanged", async (value) => {
      await expect(signAttachmentUrl(value)).resolves.toBe(value);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    test("returns the raw URL and logs when signing fails", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      mockGetSignedUrl.mockRejectedValue(new Error("no credentials"));

      await expect(signAttachmentUrl(RAW_URL)).resolves.toBe(RAW_URL);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("signUrlList", () => {
    test("signs bucket URLs and leaves the others in place", async () => {
      await expect(signUrlList([RAW_URL, "https://example.com/a.png"])).resolves.toEqual([
        SIGNED_URL,
        "https://example.com/a.png",
      ]);
    });

    test("returns a value that is not an array unchanged", async () => {
      await expect(signUrlList(null)).resolves.toBeNull();
    });
  });

  describe("signAttachments", () => {
    test("signs the url of each attachment and keeps its other fields", async () => {
      const attachments = [
        { url: RAW_URL, type: "image", name: "a.png" },
        { url: "https://example.com/b.pdf", type: "file", name: "b.pdf" },
        { type: "image", mediaId: "wa-1" },
      ];

      await expect(signAttachments(attachments)).resolves.toEqual([
        { url: SIGNED_URL, type: "image", name: "a.png" },
        { url: "https://example.com/b.pdf", type: "file", name: "b.pdf" },
        { type: "image", mediaId: "wa-1" },
      ]);
    });

    test("does not change the array it was given", async () => {
      const attachments = [{ url: RAW_URL, type: "image" }];

      await signAttachments(attachments);

      expect(attachments[0].url).toBe(RAW_URL);
    });

    test("signs a JSON string and returns a JSON string", async () => {
      const stored = JSON.stringify([{ url: RAW_URL, type: "image", name: null }]);

      const signed = await signAttachments(stored);

      expect(typeof signed).toBe("string");
      expect(JSON.parse(signed)).toEqual([{ url: SIGNED_URL, type: "image", name: null }]);
    });

    test("signs a Postgres array literal of JSON objects and returns a JSON array string", async () => {
      const literal = `{${JSON.stringify(JSON.stringify({ url: RAW_URL, type: "image", name: null }))}}`;

      const signed = await signAttachments(literal);

      expect(typeof signed).toBe("string");
      expect(JSON.parse(signed)).toEqual([{ url: SIGNED_URL, type: "image", name: null }]);
    });

    test("signs every object of a Postgres array literal", async () => {
      const literal = `{${[{ url: RAW_URL }, { url: "https://example.com/b.pdf" }]
        .map((item) => JSON.stringify(JSON.stringify(item)))
        .join(",")}}`;

      expect(JSON.parse(await signAttachments(literal))).toEqual([
        { url: SIGNED_URL },
        { url: "https://example.com/b.pdf" },
      ]);
    });

    test.each([["{abc}"], ['{"hello"}'], ["{"]])("returns the unparseable literal %p unchanged", async (value) => {
      await expect(signAttachments(value)).resolves.toBe(value);
    });

    test.each([[null], [undefined], [""], ["not json"], ['{"url":"x"}']])("returns %p unchanged", async (value) => {
      await expect(signAttachments(value)).resolves.toBe(value);
    });
  });

  describe("signMessage", () => {
    test("signs attachments and fileUrls without touching the input", async () => {
      const message = {
        id: "m-1",
        content: "hi",
        attachments: [{ url: RAW_URL, type: "image" }],
        fileUrls: [RAW_URL],
      };

      const signed = await signMessage(message);

      expect(signed).toEqual({
        id: "m-1",
        content: "hi",
        attachments: [{ url: SIGNED_URL, type: "image" }],
        fileUrls: [SIGNED_URL],
      });
      expect(message.attachments[0].url).toBe(RAW_URL);
    });

    test("does not add fileUrls to a message that has none", async () => {
      const signed = await signMessage({ id: "m-1", attachments: null });

      expect(signed).toEqual({ id: "m-1", attachments: null });
    });

    test("returns a missing message unchanged", async () => {
      await expect(signMessage(null)).resolves.toBeNull();
    });
  });

  describe("signMessages", () => {
    test("signs every message in the list and keeps their order", async () => {
      const signed = await signMessages([
        { id: "m-1", attachments: [{ url: RAW_URL }] },
        { id: "m-2", attachments: null },
      ]);

      expect(signed).toEqual([
        { id: "m-1", attachments: [{ url: SIGNED_URL }] },
        { id: "m-2", attachments: null },
      ]);
    });

    test("returns a value that is not an array unchanged", async () => {
      await expect(signMessages(undefined)).resolves.toBeUndefined();
    });
  });
});
