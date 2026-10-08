jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockSaveTaskToDb = jest.fn();
const mockSaveActivityToDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    saveTaskToDb: (...args) => mockSaveTaskToDb(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
}));

const { createTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("createTask source field", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSaveTaskToDb.mockImplementation(async (ds, record) => ({ id: "task-1", ...record }));
        mockSaveActivityToDb.mockResolvedValue();
    });

    const basePayload = { title: "Prepare for arrival", property_id: "prop-1", property_snapshot_label: "Villa Sunshine", type: "Check-in" };

    it("persists source when provided (automation-created task)", async () => {
        await createTask("host-1", { ...basePayload, source: "automation" });

        expect(mockSaveTaskToDb).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ source: "automation" })
        );
    });

    it("persists a null source when not provided (manually-created task)", async () => {
        await createTask("host-1", basePayload);

        expect(mockSaveTaskToDb).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ source: null })
        );
    });
});
