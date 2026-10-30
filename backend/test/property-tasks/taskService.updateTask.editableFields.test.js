jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockS3Send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectsCommand: jest.fn().mockImplementation((input) => input),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn(),
}));

const mockNotifyTaskAssigned = jest.fn();
const mockNotifyTaskCompleted = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    notifyTaskAssigned: (...args) => mockNotifyTaskAssigned(...args),
    notifyTaskCompleted: (...args) => mockNotifyTaskCompleted(...args),
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockUpdateTaskUnlessCompleted = jest.fn();
const mockSaveActivityToDb = jest.fn();
const mockGetChecklistItemsForTask = jest.fn();
const mockGetTeamMemberById = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    updateTaskUnlessCompleted: (...args) => mockUpdateTaskUnlessCompleted(...args),
    saveActivityToDb: (...args) => mockSaveActivityToDb(...args),
    getChecklistItemsForTask: (...args) => mockGetChecklistItemsForTask(...args),
    getTeamMemberById: (...args) => mockGetTeamMemberById(...args),
}));

const { updateTask, deleteTask } = require("../../functions/property-tasks/business/service/taskService.js");

const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440000";
const PARENT_ID = "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f";
const FUTURE_DUE_DATE = Date.now() + 7 * 24 * 60 * 60 * 1000;

const existingTask = {
    id: "task-1",
    host_id: "host-1",
    property_id: "prop-1",
    status: "Pending",
    due_date: null,
    attachments: JSON.stringify(["tasks/host-1/a.png"]),
};

const HOST = { actorIsTeamMember: false };
const TEAM_MEMBER = { actorIsTeamMember: true };
const CALLERS = [["the host", HOST], ["a team member", TEAM_MEMBER]];

const LOCKED_FIELDS = [
    ["host_id", "host-2"],
    ["id", "task-2"],
    ["escalated_at", 1700000000000],
    ["completed_date", 1700000000000],
    ["overdue_last_notified_at", 1700000000000],
    ["overdue_notify_count", 0],
    ["due_soon_notified_for", null],
    ["is_legacy", true],
    ["source", "booking"],
    ["created_at", 1],
    ["updated_at", 1],
];

const nothingWasTouched = () => {
    expect(mockGetTaskById).not.toHaveBeenCalled();
    expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    expect(mockUpdateTaskUnlessCompleted).not.toHaveBeenCalled();
    expect(mockSaveActivityToDb).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
};

describe("updateTask: the fields a caller may change", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTaskById.mockImplementation(async (dataSource, taskId) =>
            taskId === PARENT_ID ? { id: PARENT_ID, host_id: "host-1" } : existingTask
        );
        mockUpdateTaskInDb.mockResolvedValue();
        mockUpdateTaskUnlessCompleted.mockResolvedValue(true);
        mockSaveActivityToDb.mockResolvedValue();
        mockGetChecklistItemsForTask.mockResolvedValue([]);
        mockGetTeamMemberById.mockResolvedValue({ id: MEMBER_ID, member_email: "cleaner@example.com", status: "active" });
        mockS3Send.mockResolvedValue({});
    });

    describe.each(CALLERS)("when %s updates a task", (callerName, caller) => {
        it.each(LOCKED_FIELDS)("rejects %s with a 400 before anything is read or written", async (field, value) => {
            const error = await updateTask("host-1", "task-1", { [field]: value }, caller).catch((thrown) => thrown);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain(field);
            nothingWasTouched();
        });

        it("rejects the whole update when an allowed field comes with a locked one, so the allowed one is not saved either", async () => {
            const error = await updateTask(
                "host-1",
                "task-1",
                { title: "Renamed", attachments: [], overdue_notify_count: 0 },
                caller
            ).catch((thrown) => thrown);

            expect(error).toMatchObject({ statusCode: 400 });
            expect(error.message).toContain("overdue_notify_count");
            expect(error.message).not.toContain("title");
            nothingWasTouched();
        });

        it("saves every field a caller may change", async () => {
            const formPayload = {
                title: "Deep clean",
                description: "Before the next arrival",
                property_id: "prop-1",
                property_snapshot_label: "Villa Sunshine",
                type: "Cleaning",
                status: "In progress",
                priority: "High",
                due_date: FUTURE_DUE_DATE,
                assignee_name: "cleaner@example.com",
                assignee_team_member_id: MEMBER_ID,
                parent_task_id: PARENT_ID,
                attachments: ["tasks/host-1/a.png"],
            };

            await expect(updateTask("host-1", "task-1", formPayload, caller)).resolves.toEqual({
                message: "Task updated successfully",
            });

            const [, taskId, saved] = mockUpdateTaskInDb.mock.calls[0];
            expect(taskId).toBe("task-1");
            expect(saved).toMatchObject({
                ...formPayload,
                attachments: JSON.stringify(["tasks/host-1/a.png"]),
            });
        });
    });
});

describe("deleteTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTaskById.mockResolvedValue({ ...existingTask, attachments: null });
        mockUpdateTaskInDb.mockResolvedValue();
        mockSaveActivityToDb.mockResolvedValue();
    });

    it("still marks the task deleted, although a caller cannot set is_legacy through an update", async () => {
        await deleteTask("host-1", "task-1");

        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            expect.anything(),
            "task-1",
            expect.objectContaining({ is_legacy: true })
        );
    });
});
