import { describe, it } from "@jest/globals";

describe("public render primaryDomain, resolved by domain", () => {
  it.todo("names the flagged fallback as main address, whichever address was requested");
  it.todo("names a flagged live custom domain as main address, whichever address was requested");
  it.todo("falls back to the fallback domain when the flagged custom domain is not ACTIVE");
  it.todo("falls back to the fallback domain when no row of the site carries the flag");
  it.todo("prefers a live custom domain over the fallback when both carry the flag, whichever address was requested");
  it.todo("looks the main address up by the resolved site id");
  it.todo("answers primaryDomain null, not the fallback, and still renders when the main address lookup fails");
  it.todo("never takes the main address from a synthetic fallback row");
  it.todo("exposes only the name and status of the main address");
  it.todo("leaves the existing domain field unchanged");
});

describe("public render primaryDomain, resolved by site id", () => {
  it.todo("names the same main address as the domain path");
  it.todo("keeps the existing domain field unchanged");
  it.todo("answers primaryDomain null when the site has no usable main address");
  it.todo("reads the site's domain rows once");
});
