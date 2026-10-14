import { validateTaskPayload, VALID_TASK_TYPES } from "../../functions/property-tasks/business/model/taskValidator.js";

describe("validateTaskPayload", () => {
    const baseValidTask = {
        title: "Clean the villa",
        property_id: "prop-123",
        property_snapshot_label: "Villa Sunshine",
        type: "Cleaning"
    };

    it("passes with a valid task type", () => {
        expect(validateTaskPayload(baseValidTask)).toBe(true);
    });

    it("throws when type is missing", () => {
        const { type, ...taskWithoutType } = baseValidTask;
        expect(() => validateTaskPayload(taskWithoutType)).toThrow(/type must be one of/);
    });

    it("throws when type is invalid", () => {
        const invalidTask = { ...baseValidTask, type: "Yoga" };
        expect(() => validateTaskPayload(invalidTask)).toThrow(/type must be one of/);
    });

    it("accepts every type in VALID_TASK_TYPES", () => {
        VALID_TASK_TYPES.forEach(type => {
            const task = { ...baseValidTask, type };
            expect(validateTaskPayload(task)).toBe(true);
        });
    });

    it("still throws when title is missing, regardless of type", () => {
        const { title, ...taskWithoutTitle } = baseValidTask;
        expect(() => validateTaskPayload(taskWithoutTitle)).toThrow(/Title is required/);
    });

    it("passes when assignee_team_member_id is a valid UUID", () => {
        const task = { ...baseValidTask, assignee_team_member_id: "550e8400-e29b-41d4-a716-446655440000" };
        expect(validateTaskPayload(task)).toBe(true);
    });

    it("throws when assignee_team_member_id is not a valid UUID", () => {
        const task = { ...baseValidTask, assignee_team_member_id: "not-a-uuid" };
        expect(() => validateTaskPayload(task)).toThrow(/assignee_team_member_id must be a valid UUID/);
    });

    it("passes when parent_task_id is a valid UUID", () => {
        const task = { ...baseValidTask, parent_task_id: "550e8400-e29b-41d4-a716-446655440000" };
        expect(validateTaskPayload(task)).toBe(true);
    });

    it("throws when parent_task_id is not a valid UUID", () => {
        const task = { ...baseValidTask, parent_task_id: "not-a-uuid" };
        expect(() => validateTaskPayload(task)).toThrow(/parent_task_id must be a valid UUID/);
    });
});