import { extractFileUrls } from "./extractFileUrls";

const ATTACHMENTS = [
  { url: "https://files.example.com/a.png", type: "image", name: null },
  { url: "https://files.example.com/b.pdf", type: "file", name: "b.pdf" },
];

describe("extractFileUrls", () => {
  test("lists the url of each attachment in an array", () => {
    expect(extractFileUrls(ATTACHMENTS)).toEqual([
      "https://files.example.com/a.png",
      "https://files.example.com/b.pdf",
    ]);
  });

  test("reads attachments stored as a JSON string", () => {
    expect(extractFileUrls(JSON.stringify(ATTACHMENTS))).toEqual([
      "https://files.example.com/a.png",
      "https://files.example.com/b.pdf",
    ]);
  });

  test("skips attachments that have no url", () => {
    expect(extractFileUrls([{ type: "image", mediaId: "wa-1" }, null, { url: "https://files.example.com/a.png" }])).toEqual([
      "https://files.example.com/a.png",
    ]);
  });

  test.each([[null], [undefined], [""], ["not json"], ['{"url":"x"}'], [42]])("returns an empty list for %p", (value) => {
    expect(extractFileUrls(value)).toEqual([]);
  });
});
