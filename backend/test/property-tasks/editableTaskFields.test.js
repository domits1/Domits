import { assertOnlyEditableFields, TASK_EDITOR_ROLES } from "../../functions/property-tasks/business/model/editableTaskFields.js";

describe("assertOnlyEditableFields", () => {
    it("lets a host and a team member change the task details", () => {
        expect(() => assertOnlyEditableFields(TASK_EDITOR_ROLES.HOST, { title: "Renamed", status: "Completed" })).not.toThrow();
        expect(() => assertOnlyEditableFields(TASK_EDITOR_ROLES.TEAM_MEMBER, { title: "Renamed", status: "Completed" })).not.toThrow();
    });

    it("names every field that cannot be changed", () => {
        expect(() => assertOnlyEditableFields(TASK_EDITOR_ROLES.HOST, { host_id: "host-2", title: "Renamed", source: "x" }))
            .toThrow("These fields cannot be changed: host_id, source");
    });

    it("lets a role it does not know change nothing", () => {
        expect(() => assertOnlyEditableFields("Traveler", { title: "Renamed" })).toThrow(/title/);
    });

    it("accepts an update without a body", () => {
        expect(() => assertOnlyEditableFields(TASK_EDITOR_ROLES.HOST, null)).not.toThrow();
    });
});
