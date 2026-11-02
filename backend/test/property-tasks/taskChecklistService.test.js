jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTaskById = jest.fn();
const mockGetChecklistItemsForTask = jest.fn();
const mockGetChecklistItemById = jest.fn();
const mockSaveChecklistItemToDb = jest.fn();
const mockUpdateChecklistItemInDb = jest.fn();
const mockDeleteChecklistItemFromDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    getChecklistItemsForTask: (...args) => mockGetChecklistItemsForTask(...args),
    getChecklistItemById: (...args) => mockGetChecklistItemById(...args),
    saveChecklistItemToDb: (...args) => mockSaveChecklistItemToDb(...args),
    updateChecklistItemInDb: (...args) => mockUpdateChecklistItemInDb(...args),
    deleteChecklistItemFromDb: (...args) => mockDeleteChecklistItemFromDb(...args),
}));

const {
    getChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} = require("../../functions/property-tasks/business/service/taskChecklistService.js");

describe("taskChecklistService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getChecklistItems", () => {
        it("throws when the task does not belong to this host", async () => {
            mockGetTaskById.mockResolvedValue(null);

            await expect(getChecklistItems("host-1", "task-1")).rejects.toThrow(/Task not found/);
            expect(mockGetChecklistItemsForTask).not.toHaveBeenCalled();
        });

        it("returns the items when the task belongs to this host", async () => {
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1" });
            mockGetChecklistItemsForTask.mockResolvedValue([{ id: "item-1" }]);

            const result = await getChecklistItems("host-1", "task-1");
            expect(result).toEqual([{ id: "item-1" }]);
        });
    });

    describe("createChecklistItem", () => {
        beforeEach(() => {
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1" });
            mockSaveChecklistItemToDb.mockImplementation(async (ds, record) => ({ id: "new-item", ...record }));
        });

        it("rejects when the task does not belong to this host", async () => {
            mockGetTaskById.mockResolvedValue(null);

            await expect(createChecklistItem("host-1", "task-1", { title: "Strip beds" })).rejects.toThrow(/Task not found/);
            expect(mockSaveChecklistItemToDb).not.toHaveBeenCalled();
        });

        it("rejects a payload without a title", async () => {
            mockGetChecklistItemsForTask.mockResolvedValue([]);

            await expect(createChecklistItem("host-1", "task-1", {})).rejects.toThrow(/title is required/);
        });

        it("defaults is_required to true and requires_evidence to false", async () => {
            mockGetChecklistItemsForTask.mockResolvedValue([]);

            await createChecklistItem("host-1", "task-1", { title: "Strip beds" });

            expect(mockSaveChecklistItemToDb).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ is_required: true, requires_evidence: false, position: 0 })
            );
        });

        it("positions a new item after the existing ones", async () => {
            mockGetChecklistItemsForTask.mockResolvedValue([{ id: "a" }, { id: "b" }]);

            await createChecklistItem("host-1", "task-1", { title: "Replace linen" });

            expect(mockSaveChecklistItemToDb).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ position: 2 })
            );
        });
    });

    describe("updateChecklistItem", () => {
        it("rejects when the checklist item does not exist", async () => {
            mockGetChecklistItemById.mockResolvedValue(null);

            await expect(updateChecklistItem("host-1", "item-1", { title: "x" })).rejects.toThrow(/Checklist item not found/);
            expect(mockUpdateChecklistItemInDb).not.toHaveBeenCalled();
        });

        it("rejects when the item's task does not belong to this host", async () => {
            mockGetChecklistItemById.mockResolvedValue({ id: "item-1", task_id: "task-1", is_checked: false });
            mockGetTaskById.mockResolvedValue(null);

            await expect(updateChecklistItem("host-1", "item-1", { title: "x" })).rejects.toThrow(/Task not found/);
            expect(mockUpdateChecklistItemInDb).not.toHaveBeenCalled();
        });

        describe("when the item belongs to this host", () => {
            beforeEach(() => {
                mockGetChecklistItemById.mockResolvedValue({ id: "item-1", task_id: "task-1", is_checked: false });
                mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1" });
            });

            it("rejects an empty title", async () => {
                await expect(updateChecklistItem("host-1", "item-1", { title: "   " })).rejects.toThrow(/title cannot be empty/);
            });

            it("rejects a malformed owner_team_member_id", async () => {
                await expect(updateChecklistItem("host-1", "item-1", { owner_team_member_id: "not-a-uuid" })).rejects.toThrow(/owner_team_member_id must be a valid UUID/);
            });

            it("stamps checked_at/checked_by when is_checked flips to true", async () => {
                await updateChecklistItem("host-1", "item-1", { is_checked: true });

                expect(mockUpdateChecklistItemInDb).toHaveBeenCalledWith(
                    expect.anything(),
                    "item-1",
                    expect.objectContaining({ is_checked: true, checked_by: "host-1" })
                );
                const [, , fields] = mockUpdateChecklistItemInDb.mock.calls[0];
                expect(fields.checked_at).toEqual(expect.any(Number));
            });

            it("clears checked_at/checked_by when is_checked flips to false", async () => {
                mockGetChecklistItemById.mockResolvedValue({ id: "item-1", task_id: "task-1", is_checked: true });

                await updateChecklistItem("host-1", "item-1", { is_checked: false });

                expect(mockUpdateChecklistItemInDb).toHaveBeenCalledWith(
                    expect.anything(),
                    "item-1",
                    expect.objectContaining({ is_checked: false, checked_at: null, checked_by: null })
                );
            });

            it("does not touch checked_at/checked_by when is_checked is unchanged", async () => {
                await updateChecklistItem("host-1", "item-1", { title: "Strip beds again" });

                const [, , fields] = mockUpdateChecklistItemInDb.mock.calls[0];
                expect(fields).not.toHaveProperty("checked_at");
                expect(fields).not.toHaveProperty("checked_by");
            });

            it("drops fields that are not on the editable whitelist", async () => {
                await updateChecklistItem("host-1", "item-1", {
                    title: "Strip beds",
                    task_id: "someone-elses-task",
                    created_at: 1,
                    checked_by: "attacker",
                    checked_at: 1,
                    id: "different-id",
                });

                const [, , fields] = mockUpdateChecklistItemInDb.mock.calls[0];
                expect(fields).toEqual({ title: "Strip beds", updated_at: expect.any(Number) });
            });

            it("rejects a non-string title", async () => {
                await expect(updateChecklistItem("host-1", "item-1", { title: 123 })).rejects.toThrow(/title must be a string/);
            });

            it.each(["is_required", "requires_evidence", "is_checked"])(
                "rejects a non-boolean %s",
                async (field) => {
                    await expect(updateChecklistItem("host-1", "item-1", { [field]: "yes" })).rejects.toThrow(new RegExp(`${field} must be a boolean`));
                }
            );
        });
    });

    describe("deleteChecklistItem", () => {
        it("rejects when the item's task does not belong to this host", async () => {
            mockGetChecklistItemById.mockResolvedValue({ id: "item-1", task_id: "task-1" });
            mockGetTaskById.mockResolvedValue(null);

            await expect(deleteChecklistItem("host-1", "item-1")).rejects.toThrow(/Task not found/);
            expect(mockDeleteChecklistItemFromDb).not.toHaveBeenCalled();
        });

        it("deletes the item when it belongs to this host", async () => {
            mockGetChecklistItemById.mockResolvedValue({ id: "item-1", task_id: "task-1" });
            mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1" });

            await deleteChecklistItem("host-1", "item-1");

            expect(mockDeleteChecklistItemFromDb).toHaveBeenCalledWith(expect.anything(), "item-1");
        });
    });
});
