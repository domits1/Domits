import {
    ROLE_PERMISSIONS_SUMMARY,
    TEAM_INVITABLE_ROLES,
    getRolePermissionsSummary,
} from "./rolePermissionsSummary.js";

describe("TEAM_INVITABLE_ROLES", () => {
    test("excludes Admin, Host, and Traveler", () => {
        expect(TEAM_INVITABLE_ROLES).not.toContain("Admin");
        expect(TEAM_INVITABLE_ROLES).not.toContain("Host");
        expect(TEAM_INVITABLE_ROLES).not.toContain("Traveler");
    });
});

describe("ROLE_PERMISSIONS_SUMMARY", () => {
    test("has exactly one entry per invitable role, sourced from TEAM_INVITABLE_ROLES", () => {
        const summaryKeys = Object.keys(ROLE_PERMISSIONS_SUMMARY).sort();
        const invitableRoles = [...TEAM_INVITABLE_ROLES].sort();
        expect(summaryKeys).toEqual(invitableRoles);
    });

    test("every entry is a non-empty list of strings", () => {
        for (const role of TEAM_INVITABLE_ROLES) {
            const items = ROLE_PERMISSIONS_SUMMARY[role];
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);
            items.forEach((item) => expect(typeof item).toBe("string"));
        }
    });
});

describe("getRolePermissionsSummary", () => {
    test("returns the mapped list for a known role", () => {
        expect(getRolePermissionsSummary("Reservation Manager")).toEqual(["Manage bookings", "Guest communication"]);
    });

    test("falls back to an empty array for an unrecognized role", () => {
        expect(getRolePermissionsSummary("Host")).toEqual([]);
        expect(getRolePermissionsSummary("Admin")).toEqual([]);
        expect(getRolePermissionsSummary("Nonexistent Role")).toEqual([]);
    });
});
