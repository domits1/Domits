import {
    getSaveErrorKey,
    isRegistrationNumberMissing,
    isRegistrationNumberValid,
    toDisplayRegistrationNumber,
} from "../../features/hostdashboard/hostsettings/utils/registrationNumber";

const UUID = "11111111-1111-4111-8111-111111111111";

// Keep these two tables identical to backend/test/PropertyHandler/registrationNumberService.test.js.
const PLACEHOLDER_CASES = [`AUTO-${UUID}`, `auto-${UUID}`, `Auto-${UUID.toUpperCase()}`, `  AUTO-${UUID}  `];
const REAL_NUMBER_CASES = ["Auto-1234", "AUTO-123", "AUTO-", `AUTO-${UUID}-extra`, `NL-AUTO-${UUID}`, "NL-1234"];

describe("registration number helpers", () => {
    describe("toDisplayRegistrationNumber", () => {
        it.each(PLACEHOLDER_CASES)("hides the generated placeholder %j", (value) => {
            expect(toDisplayRegistrationNumber(value)).toBe("");
        });

        it.each(REAL_NUMBER_CASES)("shows the real number %j (trimmed)", (value) => {
            expect(toDisplayRegistrationNumber(value)).toBe(value.trim());
        });

        it("returns an empty string for an empty string", () => {
            expect(toDisplayRegistrationNumber("")).toBe("");
        });
    });

    describe("isRegistrationNumberValid", () => {
        it.each(PLACEHOLDER_CASES)("rejects the generated placeholder %j", (value) => {
            expect(isRegistrationNumberValid(value)).toBe(false);
        });

        it.each(REAL_NUMBER_CASES)("accepts the real number %j", (value) => {
            expect(isRegistrationNumberValid(value)).toBe(true);
        });

        it.each([["an empty string", ""], ["whitespace only", "   "], ["more than 255 characters", "a".repeat(256)]])(
            "rejects %s",
            (_label, value) => {
                expect(isRegistrationNumberValid(value)).toBe(false);
            }
        );

        it("accepts exactly 255 characters", () => {
            expect(isRegistrationNumberValid("a".repeat(255))).toBe(true);
        });
    });

    describe("isRegistrationNumberMissing", () => {
        it.each([["undefined", undefined], ["null", null], ["a number", 1234], ["an object", {}]])(
            "treats %s as missing data",
            (_label, value) => {
                expect(isRegistrationNumberMissing(value)).toBe(true);
            }
        );

        it.each([["an empty string", ""], ["a placeholder", `AUTO-${UUID}`], ["a real number", "NL-1234"]])(
            "does not treat %s as missing data",
            (_label, value) => {
                expect(isRegistrationNumberMissing(value)).toBe(false);
            }
        );
    });

    describe("getSaveErrorKey", () => {
        it.each([
            [409, "duplicate"],
            [403, "noAccess"],
            [400, "validation"],
            [500, "generic"],
            [undefined, "generic"],
        ])("maps status %s to %s", (status, expectedKey) => {
            expect(getSaveErrorKey({ status })).toBe(expectedKey);
        });
    });
});
