import { computeSlaStatus, SLA_STATUS } from "../../functions/property-tasks/business/model/slaStatus.js";

describe("computeSlaStatus", () => {
    const now = new Date("2026-10-06T12:00:00Z").getTime();

    it("returns null when there is no due date", () => {
        expect(computeSlaStatus({ due_date: null, status: "Pending" }, now)).toBeNull();
    });

    it("returns null for a Completed task", () => {
        expect(computeSlaStatus({ due_date: now - 1000, status: "Completed" }, now)).toBeNull();
    });

    it("returns null for a Cancelled task", () => {
        expect(computeSlaStatus({ due_date: now - 1000, status: "Cancelled" }, now)).toBeNull();
    });

    it("returns BREACHED when due_date has passed and the task is still open", () => {
        expect(computeSlaStatus({ due_date: now - 1000, status: "Pending" }, now)).toBe(SLA_STATUS.BREACHED);
    });

    it("returns AT_RISK when due_date is within the warning window", () => {
        const dueInTwoHours = now + 2 * 60 * 60 * 1000;
        expect(computeSlaStatus({ due_date: dueInTwoHours, status: "In progress" }, now)).toBe(SLA_STATUS.AT_RISK);
    });

    it("returns ON_TRACK when due_date is well in the future", () => {
        const dueInTwoDays = now + 2 * 24 * 60 * 60 * 1000;
        expect(computeSlaStatus({ due_date: dueInTwoDays, status: "Pending" }, now)).toBe(SLA_STATUS.ON_TRACK);
    });

    it("treats the AT_RISK boundary as inclusive", () => {
        const dueExactlyAtWindow = now + 3 * 60 * 60 * 1000;
        expect(computeSlaStatus({ due_date: dueExactlyAtWindow, status: "Pending" }, now)).toBe(SLA_STATUS.AT_RISK);
    });
});
