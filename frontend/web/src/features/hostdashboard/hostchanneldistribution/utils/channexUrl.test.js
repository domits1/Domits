import { isChannexUrl } from "./channexUrl";

describe("isChannexUrl", () => {
  test.each([
    ["the production host", "https://app.channex.io/connect?token=abc"],
    ["the staging host", "https://staging.channex.io/mock-connect?token=mock"],
    ["the bare domain", "https://channex.io/connect"],
    ["a host written in capitals", "https://APP.CHANNEX.IO/connect"],
  ])("accepts %s", (_name, url) => {
    expect(isChannexUrl(url)).toBe(true);
  });

  test.each([
    ["plain http", "http://app.channex.io/connect"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,<script>alert(1)</script>"],
    ["a protocol-relative URL", "//app.channex.io/connect"],
    ["a relative path", "/connect?token=abc"],
    ["a lookalike domain", "https://evilchannex.io/connect"],
    ["Channex as a subdomain of another domain", "https://channex.io.evil.com/connect"],
    ["Channex before an @ that hides the real host", "https://channex.io@evil.com/connect"],
    ["credentials in front of a Channex host", "https://user:secret@app.channex.io/connect"],
    ["an empty string", ""],
    ["text that is not a URL", "not a url"],
    ["undefined", undefined],
    ["null", null],
    ["a number", 42],
  ])("rejects %s", (_name, url) => {
    expect(isChannexUrl(url)).toBe(false);
  });
});
