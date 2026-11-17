import { isInternalTokenValid } from "../../.shared/channelManagement/utils/channexInternalToken.js";

describe("isInternalTokenValid", () => {
  test.each([
    ["the same token", "token-abc", "token-abc", true],
    ["another token of the same length", "token-abc", "token-abd", false],
    ["a token of another length", "token-abc", "token-abcdef", false],
    ["no provided token", "token-abc", null, false],
    // An unconfigured token must never let a call through, also not an empty one.
    ["no configured token", null, "", false],
    ["no configured token and no provided token", null, null, false],
  ])("%s gives %s", (_case, expected, provided, valid) => {
    expect(isInternalTokenValid(expected, provided)).toBe(valid);
  });
});
