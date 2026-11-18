import { parseStoredAttachments, serializeAttachments } from "./storedAttachments.js";

const ITEM = { url: "https://example.com/a.png", type: "image", name: null };

describe("serializeAttachments", () => {
  test("stores an array as a JSON string", () => {
    expect(serializeAttachments([ITEM])).toBe(JSON.stringify([ITEM]));
  });

  test("stores an empty array as an empty JSON array", () => {
    expect(serializeAttachments([])).toBe("[]");
  });

  test("keeps a string as it is, so an already stringified list is not encoded twice", () => {
    const stored = JSON.stringify([ITEM]);

    expect(serializeAttachments(stored)).toBe(stored);
  });

  test.each([[null], [undefined]])("turns %p into null", (value) => {
    expect(serializeAttachments(value)).toBeNull();
  });
});

describe("parseStoredAttachments", () => {
  test("returns an array as it is", () => {
    expect(parseStoredAttachments([ITEM])).toEqual([ITEM]);
  });

  test("reads a JSON string", () => {
    expect(parseStoredAttachments(JSON.stringify([ITEM]))).toEqual([ITEM]);
  });

  test("reads a Postgres array literal of JSON objects", () => {
    const literal = '{"{\\"url\\":\\"https://example.com/a.png\\",\\"type\\":\\"image\\",\\"name\\":null}"}';

    expect(parseStoredAttachments(literal)).toEqual([ITEM]);
  });

  test("reads a Postgres array literal with several objects", () => {
    const second = { url: "https://example.com/b.pdf", type: "file", name: "b.pdf" };
    const literal = `{${[ITEM, second].map((item) => JSON.stringify(JSON.stringify(item))).join(",")}}`;

    expect(parseStoredAttachments(literal)).toEqual([ITEM, second]);
  });

  test("reads a Postgres array literal whose values contain quotes and backslashes", () => {
    const item = { url: "https://example.com/a.png", type: "image", name: 'my "best" photo\\final\nv2.png' };
    const literal = `{${JSON.stringify(JSON.stringify(item))}}`;

    expect(parseStoredAttachments(literal)).toEqual([item]);
  });

  test("reads an empty Postgres array literal", () => {
    expect(parseStoredAttachments("{}")).toEqual([]);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["text that is not JSON", "not json"],
    ["a JSON object", '{"url":"x"}'],
    ["a literal whose element is not a JSON object", '{"hello"}'],
    ["a literal with an unquoted element", "{abc}"],
    ["a number", 42],
  ])("returns null for %s", (_label, value) => {
    expect(parseStoredAttachments(value)).toBeNull();
  });
});
