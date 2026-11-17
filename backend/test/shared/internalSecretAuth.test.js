const { isValidInternalSecret } = require("../../functions/.shared/internalSecretAuth.js");

describe("isValidInternalSecret", () => {
    it("returns true when the provided secret matches the expected secret", () => {
        expect(isValidInternalSecret("secret-1", "secret-1")).toBe(true);
    });

    it("returns false when the provided secret does not match", () => {
        expect(isValidInternalSecret("wrong", "secret-1")).toBe(false);
    });

    it("returns false when no secret is provided", () => {
        expect(isValidInternalSecret(undefined, "secret-1")).toBe(false);
        expect(isValidInternalSecret("", "secret-1")).toBe(false);
    });

    it("returns false when the expected secret is not configured", () => {
        expect(isValidInternalSecret("secret-1", undefined)).toBe(false);
    });

    it("does not throw when the provided and expected secrets have different lengths", () => {
        expect(() => isValidInternalSecret("short", "a-much-longer-secret-value")).not.toThrow();
        expect(isValidInternalSecret("short", "a-much-longer-secret-value")).toBe(false);
    });
});
