import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  isReviewAdmin,
  parseReviewAdminUserIds,
} from "../../functions/PropertyHandler/util/reviewAdminAllowlist.js";

const ENV_NAME = "PROPERTY_REVIEW_ADMIN_USER_IDS";

describe("review admin allowlist", () => {
  let originalValue;

  beforeEach(() => {
    originalValue = process.env[ENV_NAME];
    delete process.env[ENV_NAME];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = originalValue;
    }
  });

  it("treats nobody as admin when the variable is not set", () => {
    expect(parseReviewAdminUserIds()).toEqual([]);
    expect(isReviewAdmin("user-1")).toBe(false);
  });

  it.each(["", "   ", " , ; ", "\n"])("treats nobody as admin when the variable is %j", (value) => {
    process.env[ENV_NAME] = value;

    expect(parseReviewAdminUserIds()).toEqual([]);
    expect(isReviewAdmin("user-1")).toBe(false);
    expect(isReviewAdmin("")).toBe(false);
    expect(isReviewAdmin(" ")).toBe(false);
  });

  it("accepts commas, semicolons and whitespace as separators", () => {
    process.env[ENV_NAME] = "user-1, user-2;user-3 user-4\nuser-5";

    expect(parseReviewAdminUserIds()).toEqual(["user-1", "user-2", "user-3", "user-4", "user-5"]);
  });

  it("allows only the listed ids, matching exactly and case-sensitively", () => {
    process.env[ENV_NAME] = "user-1,user-2";

    expect(isReviewAdmin("user-1")).toBe(true);
    expect(isReviewAdmin("user-2")).toBe(true);
    expect(isReviewAdmin("user")).toBe(false);
    expect(isReviewAdmin("user-10")).toBe(false);
    expect(isReviewAdmin("USER-1")).toBe(false);
  });

  it("ignores whitespace around the caller id", () => {
    process.env[ENV_NAME] = "user-1";

    expect(isReviewAdmin("  user-1 ")).toBe(true);
  });

  it.each([undefined, null, 1, true, {}, ["user-1"]])("rejects the non-string caller id %j", (userId) => {
    process.env[ENV_NAME] = "user-1,1,true";

    expect(isReviewAdmin(userId)).toBe(false);
  });

  it("picks up a changed variable without reloading the module", () => {
    process.env[ENV_NAME] = "user-1";
    expect(isReviewAdmin("user-2")).toBe(false);

    process.env[ENV_NAME] = "user-2";
    expect(isReviewAdmin("user-1")).toBe(false);
    expect(isReviewAdmin("user-2")).toBe(true);
  });

  it("allows exactly the listed ids for any ids and separators", () => {
    const separator = fc.constantFrom(",", ";", " ", ", ", "\n");

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.uuid(),
        separator,
        (listedIds, otherId, glue) => {
          process.env[ENV_NAME] = listedIds.join(glue);

          return (
            listedIds.every((id) => isReviewAdmin(id)) && isReviewAdmin(otherId) === listedIds.includes(otherId)
          );
        }
      )
    );
  });
});
