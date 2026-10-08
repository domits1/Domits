jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
}));

const mockGetHostEmailById = jest.fn();
const mockSendTaskEscalationEmail = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskEscalationService.js", () => ({
    getHostEmailById: (...args) => mockGetHostEmailById(...args),
    sendTaskEscalationEmail: (...args) => mockSendTaskEscalationEmail(...args),
}));

const { escalateTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("escalateTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetHostEmailById.mockResolvedValue("host@example.com");
        mockSendTaskEscalationEmail.mockResolvedValue();
        mockUpdateTaskInDb.mockResolvedValue();
    });

    it("rejects when taskId is missing", async () => {
        await expect(escalateTask("host-1", undefined)).rejects.toThrow(/id is required/);
        expect(mockGetTaskById).not.toHaveBeenCalled();
    });

    it("rejects when the task does not belong to this host", async () => {
        mockGetTaskById.mockResolvedValue(null);

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow(/Task not found/);
        expect(mockSendTaskEscalationEmail).not.toHaveBeenCalled();
    });

    it("rejects escalating a task that was already escalated", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", status: "Pending", due_date: past, escalated_at: Date.now() - 500 });

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow(/already been escalated/);
        expect(mockSendTaskEscalationEmail).not.toHaveBeenCalled();
    });

    it("rejects escalating a task that is not breaching its SLA", async () => {
        const future = Date.now() + 24 * 60 * 60 * 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", status: "Pending", due_date: future });

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow(/not breaching/);
        expect(mockSendTaskEscalationEmail).not.toHaveBeenCalled();
    });

    it("emails the host and stamps escalated_at for a breached task", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", status: "Pending", due_date: past, title: "Fix AC" });

        await escalateTask("host-1", "task-1");

        expect(mockGetHostEmailById).toHaveBeenCalledWith("host-1");
        expect(mockSendTaskEscalationEmail).toHaveBeenCalledWith("host@example.com", expect.objectContaining({ id: "task-1" }));
        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(
            expect.anything(),
            "task-1",
            expect.objectContaining({ escalated_at: expect.any(Number) })
        );
    });

    it("does not stamp escalated_at when sending the email fails", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", status: "Pending", due_date: past, title: "Fix AC" });
        mockSendTaskEscalationEmail.mockRejectedValue(new Error("Failed to send escalation email"));

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow("Failed to send escalation email");
        expect(mockUpdateTaskInDb).not.toHaveBeenCalled();
    });
});
