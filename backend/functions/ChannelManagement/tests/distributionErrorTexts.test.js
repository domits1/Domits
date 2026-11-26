const fs = require("node:fs");
const path = require("node:path");

// Clean_Code_Standards: every user-facing error says what happened and what the user can do next.
// The Distribution tab shows these texts to hosts, so each one has two parts: the cause, then the step.
// This reads the source, so a new error added without a next step fails here instead of in review.
const SHARED = path.join(__dirname, "../../.shared/channelManagement");
const SOURCES = [
  "services/channexProvisioningService.js",
  "services/channexConnectSessionService.js",
  "services/channexDistributionListingsService.js",
  "utils/hostListingAccess.js",
];

// Double quotes, single quotes or a template literal; the closing quote must match the opening one.
const ERROR_TEXT = /error:\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
const errorTextsIn = (source) => [...source.matchAll(ERROR_TEXT)].map((match) => match[2]);

const errorTexts = SOURCES.flatMap((file) =>
  errorTextsIn(fs.readFileSync(path.join(SHARED, file), "utf8")).map((text) => [file, text])
);

const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean);

describe("Distribution error texts", () => {
  test("finds error texts in every quote style, so none slips past the check", () => {
    const source = [
      `bad(1, { error: "Double. Quotes.", errorCode: "A" })`,
      `bad(2, { error: 'Single. Quotes.', errorCode: "B" })`,
      "bad(3, { error: `Template ${name}. Literal.`, errorCode: \"C\" })",
      `bad(4, { error: "It's \\"quoted\\". Still found.", errorCode: "D" })`,
    ].join("\n");

    expect(errorTextsIn(source)).toEqual([
      "Double. Quotes.",
      "Single. Quotes.",
      "Template ${name}. Literal.",
      String.raw`It's \"quoted\". Still found.`,
    ]);
  });

  test("the sources still contain error texts to check", () => {
    expect(errorTexts.length).toBeGreaterThanOrEqual(10);
  });

  test.each(errorTexts)("%s: %p says what happened and what to do next", (_file, text) => {
    expect(sentencesOf(text).length).toBeGreaterThanOrEqual(2);
  });
});
