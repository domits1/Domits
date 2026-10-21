import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  DESTINATION_PATH_MAX_LENGTH,
  readDestinationRequestPath,
  resolveDestinationSiteOrigin,
} from "../../functions/PropertyHandler/business/service/destinationPageRequest.js";

const slug = fc.stringMatching(/^[a-z0-9]{1,8}(-[a-z0-9]{1,8}){0,2}$/);

describe("the destination request path", () => {
  it.each([
    "/destinations",
    "/destinations/europe",
    "/destinations/europe/spain",
    "/destinations/europe/spain/marbella",
    "/destinations/europe/germany/gross-toitin-western-pomerania",
  ])("accepts %s as a page path", (path) => {
    expect(readDestinationRequestPath(path)).toEqual({ kind: "page", path });
  });

  it.each([
    ["/destinations/", "/destinations"],
    ["/destinations/europe/", "/destinations/europe"],
    ["/destinations/europe/spain/marbella/", "/destinations/europe/spain/marbella"],
  ])("sends %s with one trailing slash to %s", (path, location) => {
    expect(readDestinationRequestPath(path)).toEqual({ kind: "redirect", location });
  });

  it.each([
    ["no path", undefined],
    ["a number", 42],
    ["an empty path", ""],
    ["another route", "/property/website/public/render"],
    ["a longer first word", "/destinationsx/europe"],
    ["a fourth level", "/destinations/europe/spain/marbella/old-town"],
    ["capitals", "/Destinations/Europe/spain"],
    ["an encoded letter", "/destinations/europe/m%C3%A1laga"],
    ["an encoded slash", "/destinations/europe%2Fspain"],
    ["a decoded accent", "/destinations/europe/málaga"],
    ["a dot segment", "/destinations/europe/../admin"],
    ["a dot inside a segment", "/destinations/europe/spain.html"],
    ["a double slash", "/destinations//europe"],
    ["two trailing slashes", "/destinations/europe//"],
    ["a trailing slash on a fourth level", "/destinations/europe/spain/marbella/old-town/"],
    ["a dash at the edge", "/destinations/-europe"],
    ["a query mark", "/destinations/europe?x=1"],
  ])("refuses %s without a redirect", (_, path) => {
    expect(readDestinationRequestPath(path)).toEqual({ kind: "invalid" });
  });

  it("refuses a path longer than the limit even when every segment is a slug", () => {
    const longest = `/destinations/${"a".repeat(DESTINATION_PATH_MAX_LENGTH - "/destinations/".length)}`;
    expect(readDestinationRequestPath(longest)).toEqual({ kind: "page", path: longest });
    expect(readDestinationRequestPath(`${longest}a`)).toEqual({ kind: "invalid" });
    expect(readDestinationRequestPath(`${longest}/`)).toEqual({ kind: "invalid" });
  });

  it("accepts every path of one to three slugs and sends its trailing slash variant to it", () => {
    fc.assert(
      fc.property(fc.array(slug, { minLength: 1, maxLength: 3 }), (slugs) => {
        const path = `/destinations/${slugs.join("/")}`;
        expect(readDestinationRequestPath(path)).toEqual({ kind: "page", path });
        expect(readDestinationRequestPath(`${path}/`)).toEqual({ kind: "redirect", location: path });
      })
    );
  });

  it("never accepts or redirects to anything outside the slug shape, whatever the input", () => {
    const shape = /^\/destinations(\/[a-z0-9]+(-[a-z0-9]+)*){0,3}$/;
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.string().map((tail) => `/destinations/${tail}`)
        ),
        (path) => {
          const result = readDestinationRequestPath(path);
          if (result.kind === "page") {
            expect(result.path).toMatch(shape);
          }
          if (result.kind === "redirect") {
            expect(result.location).toMatch(shape);
            expect(result.location).toBe(path.slice(0, -1));
          }
        }
      )
    );
  });
});

describe("the destination site origin", () => {
  it.each([
    ["www.domits.com", "https://www.domits.com"],
    ["acceptance.domits.com", "https://acceptance.domits.com"],
    ["  ACCEPTANCE.domits.com ", "https://acceptance.domits.com"],
  ])("uses the forwarded host %p from the fixed list", (host, origin) => {
    expect(resolveDestinationSiteOrigin(host)).toBe(origin);
  });

  it.each([
    undefined,
    "",
    "domits.com",
    "evil.example",
    "www.domits.com.evil.example",
    "evil.example, www.domits.com",
    "www.domits.com:443",
    "https://www.domits.com",
    "wkmwpwurbc.execute-api.eu-north-1.amazonaws.com",
    "main.d34jwd0sihmsus.amplifyapp.com",
    ["acceptance.domits.com"],
  ])("falls back to www for the forwarded host %p", (host) => {
    expect(resolveDestinationSiteOrigin(host)).toBe("https://www.domits.com");
  });
});
