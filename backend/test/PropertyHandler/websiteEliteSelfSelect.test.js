import { afterEach, describe, expect, it } from "@jest/globals";
import {
  ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE,
  isEliteSelfSelectOnFor,
} from "../../functions/PropertyHandler/util/websiteEliteSelfSelect.js";

const setList = (value) => {
  if (value === undefined) delete process.env[ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE];
  else process.env[ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE] = value;
};

describe("isEliteSelfSelectOnFor", () => {
  afterEach(() => setList(undefined));

  it("keeps the variable name that the turn-on command sets", () => {
    expect(ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE).toBe("DIRECT_BOOKING_WEBSITE_ELITE_SELF_SELECT_ACCOUNT_IDS");
  });

  it.each([undefined, "", "   ", " ,; "])("is off for everyone when the list is %p", (value) => {
    setList(value);
    expect(isEliteSelfSelectOnFor("host-1")).toBe(false);
  });

  it("is on only for an exact listed id, read again on every call", () => {
    setList("host-2, host-1;host-3");
    expect(isEliteSelfSelectOnFor("host-1")).toBe(true);
    expect(isEliteSelfSelectOnFor("host-3")).toBe(true);
    ["host-4", "HOST-1", "host-", "host-1 ", " host-1", "host-1,host-2"].forEach((accountId) =>
      expect(isEliteSelfSelectOnFor(accountId)).toBe(false)
    );
    [undefined, null, "", ["host-1"]].forEach((accountId) => expect(isEliteSelfSelectOnFor(accountId)).toBe(false));
    setList("host-2");
    expect(isEliteSelfSelectOnFor("host-1")).toBe(false);
  });

  it("is on for every account id with *, but never for a missing id", () => {
    setList("*");
    expect(isEliteSelfSelectOnFor("host-1")).toBe(true);
    expect(isEliteSelfSelectOnFor("any-other-host")).toBe(true);
    [undefined, null, "", 1, ["host-1"], { toString: () => "host-1" }].forEach((accountId) =>
      expect(isEliteSelfSelectOnFor(accountId)).toBe(false)
    );
  });
});
