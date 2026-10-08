import { validateChecklistItemPayload, isValidUuid } from "../../functions/property-tasks/business/model/checklistItemValidator.js";

describe("validateChecklistItemPayload", () => {
    it("passes with just a title", () => {
        expect(validateChecklistItemPayload({ title: "Strip beds" })).toBe(true);
    });

    it("throws when title is missing", () => {
        expect(() => validateChecklistItemPayload({})).toThrow(/title is required/);
    });

    it("throws when title is blank", () => {
        expect(() => validateChecklistItemPayload({ title: "   " })).toThrow(/title is required/);
    });

    it("passes with a valid owner_team_member_id", () => {
        const data = { title: "Strip beds", owner_team_member_id: "550e8400-e29b-41d4-a716-446655440000" };
        expect(validateChecklistItemPayload(data)).toBe(true);
    });

    it("throws when owner_team_member_id is not a valid UUID", () => {
        const data = { title: "Strip beds", owner_team_member_id: "not-a-uuid" };
        expect(() => validateChecklistItemPayload(data)).toThrow(/owner_team_member_id must be a valid UUID/);
    });
});

describe("isValidUuid", () => {
    it("accepts a well-formed UUID", () => {
        expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it.each([null, undefined, 42, "not-a-uuid", ""])("rejects %p", (value) => {
        expect(isValidUuid(value)).toBe(false);
    });
});
