import fc from "fast-check";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  validateUpload,
} from "../../functions/documents/business/validation/uploadValidator.js";
import { BadRequestException } from "../../functions/documents/util/exception/badRequestException.js";

const VALID_TYPE = "application/pdf";
const VALID_SIZE = "4096";
const SIZE_FORMAT_MESSAGE = "fileSize must be the size of the file in bytes.";

const refusalOf = (fileType, fileSize) => {
  try {
    validateUpload(fileType, fileSize);
  } catch (error) {
    return error;
  }
  throw new Error(`Expected ${fileType} of ${fileSize} bytes to be refused`);
};

describe("the document upload validator", () => {
  test.each(Object.entries(ALLOWED_DOCUMENT_TYPES))("accepts %s and names it .%s", (fileType, extension) => {
    expect(validateUpload(fileType, VALID_SIZE)).toEqual({ contentType: fileType, contentLength: 4096, extension });
  });

  test.each([
    "image/gif",
    "text/html",
    "application/x-msdownload",
    "APPLICATION/PDF",
    "application/pdf; charset=binary",
    "",
    undefined,
    null,
    "constructor",
    "__proto__",
    "toString",
  ])("refuses the type %p with 400", (fileType) => {
    const refusal = refusalOf(fileType, VALID_SIZE);

    expect(refusal).toBeInstanceOf(BadRequestException);
    expect(refusal.statusCode).toBe(400);
  });

  it("names every accepted type in the refusal", () => {
    const { message } = refusalOf("image/gif", VALID_SIZE);

    Object.values(ALLOWED_DOCUMENT_TYPES).forEach((extension) => expect(message).toContain(extension.toUpperCase()));
  });

  test.each([undefined, null, "", "abc", "1.5", "-1", "1e3", " 12", "12 ", "0x10", "1234567890123", 4096])(
    "refuses the size %p as not a whole number of bytes",
    (fileSize) => {
      expect(refusalOf(VALID_TYPE, fileSize)).toMatchObject({ statusCode: 400, message: SIZE_FORMAT_MESSAGE });
    }
  );

  test.each(["0", "000"])("refuses the empty size %p", (fileSize) => {
    expect(refusalOf(VALID_TYPE, fileSize)).toMatchObject({
      statusCode: 400,
      message: "An empty file cannot be uploaded. Choose a file that has content.",
    });
  });

  it("accepts a file of exactly the limit and refuses one byte more", () => {
    expect(validateUpload(VALID_TYPE, String(MAX_DOCUMENT_BYTES)).contentLength).toBe(MAX_DOCUMENT_BYTES);

    const refusal = refusalOf(VALID_TYPE, String(MAX_DOCUMENT_BYTES + 1));
    expect(refusal.statusCode).toBe(400);
    expect(refusal.message).toMatch(/^A document can be at most \d+ MB\. Choose a smaller file\.$/);
  });

  it("accepts every size from one byte up to the limit, as that number of bytes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: MAX_DOCUMENT_BYTES }), (size) => {
        expect(validateUpload(VALID_TYPE, String(size)).contentLength).toBe(size);
      })
    );
  });

  it("refuses every whole size above the limit", () => {
    fc.assert(
      fc.property(fc.integer({ min: MAX_DOCUMENT_BYTES + 1, max: 999_999_999_999 }), (size) => {
        expect(refusalOf(VALID_TYPE, String(size)).statusCode).toBe(400);
      })
    );
  });
});
