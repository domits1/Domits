jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTaskById = jest.fn();
const mockUpdateTaskInDb = jest.fn();
const mockEscalateTaskInDb = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTaskById: (...args) => mockGetTaskById(...args),
    updateTaskInDb: (...args) => mockUpdateTaskInDb(...args),
    escalateTaskInDb: (...args) => mockEscalateTaskInDb(...args),
}));

const mockGetHostEmailById = jest.fn();
const mockGetAssigneeEmailById = jest.fn();
const mockSendTaskEscalationEmail = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskEscalationService.js", () => ({
    getHostEmailById: (...args) => mockGetHostEmailById(...args),
    getAssigneeEmailById: (...args) => mockGetAssigneeEmailById(...args),
    sendTaskEscalationEmail: (...args) => mockSendTaskEscalationEmail(...args),
}));

const { escalateTask } = require("../../functions/property-tasks/business/service/taskService.js");

describe("escalateTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetHostEmailById.mockResolvedValue("host@example.com");
        mockGetAssigneeEmailById.mockResolvedValue("assignee@example.com");
        mockSendTaskEscalationEmail.mockResolvedValue();
        mockUpdateTaskInDb.mockResolvedValue();
        mockEscalateTaskInDb.mockResolvedValue(true);
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

    it("claims escalated_at atomically before emailing the host when the task has no assignee", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: past, title: "Fix AC", assignee_team_member_id: null });

        await escalateTask("host-1", "task-1");

        expect(mockEscalateTaskInDb).toHaveBeenCalledWith(
            expect.anything(),
            "task-1",
            "host-1",
            expect.any(Number)
        );
        expect(mockGetHostEmailById).toHaveBeenCalledWith("host-1");
        expect(mockGetAssigneeEmailById).not.toHaveBeenCalled();
        expect(mockSendTaskEscalationEmail).toHaveBeenCalledWith("host@example.com", expect.objectContaining({ id: "task-1" }));
    });

    it("emails the assignee instead of the host when the task has one", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: past, title: "Fix AC", assignee_team_member_id: "member-1" });

        await escalateTask("host-1", "task-1");

        expect(mockGetAssigneeEmailById).toHaveBeenCalledWith("member-1", "host-1");
        expect(mockGetHostEmailById).not.toHaveBeenCalled();
        expect(mockSendTaskEscalationEmail).toHaveBeenCalledWith("assignee@example.com", expect.objectContaining({ id: "task-1" }));
    });

    it("releases the claim and throws a client-safe message when resolving the assignee's email fails", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: past, title: "Fix AC", assignee_team_member_id: "member-1" });
        mockGetAssigneeEmailById.mockRejectedValue(new Error("Failed to fetch assignee email: no email found for this assignee"));

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow("Failed to send the escalation email. Please try again or contact support.");
        expect(mockSendTaskEscalationEmail).not.toHaveBeenCalled();
        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", { escalated_at: null });
    });

    it("rejects when a concurrent request already claimed the escalation", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: past, title: "Fix AC" });
        mockEscalateTaskInDb.mockResolvedValue(false);

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow(/already been escalated/);
        expect(mockSendTaskEscalationEmail).not.toHaveBeenCalled();
    });

    it("releases the claim and throws a client-safe message when sending the email fails", async () => {
        const past = Date.now() - 1000;
        mockGetTaskById.mockResolvedValue({ id: "task-1", host_id: "host-1", status: "Pending", due_date: past, title: "Fix AC" });
        mockSendTaskEscalationEmail.mockRejectedValue(new Error("Failed to send escalation email"));

        await expect(escalateTask("host-1", "task-1")).rejects.toThrow("Failed to send the escalation email. Please try again or contact support.");
        expect(mockUpdateTaskInDb).toHaveBeenCalledWith(expect.anything(), "task-1", { escalated_at: null });
    });
});
