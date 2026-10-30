const mockSendEmail = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskNotificationService.js", () => ({
    sendEmail: (...args) => mockSendEmail(...args),
}));

const mockGetHostEmailById = jest.fn();
const mockGetAssigneeEmailById = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskEscalationService.js", () => ({
    getHostEmailById: (...args) => mockGetHostEmailById(...args),
    getAssigneeEmailById: (...args) => mockGetAssigneeEmailById(...args),
}));

const { notifyTaskApproved, notifyTaskRejected } = require("../../functions/property-tasks/business/service/taskReviewNotificationService.js");

const task = {
    id: "task-1",
    host_id: "host-1",
    title: "Fix AC",
    property_snapshot_label: "Villa Sunshine",
    assignee_team_member_id: "member-1",
};

describe.each([
    ["notifyTaskApproved", notifyTaskApproved, "Task approved: Fix AC"],
    ["notifyTaskRejected", notifyTaskRejected, "Task rejected: Fix AC"],
])("%s", (_name, notify, expectedSubject) => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockGetAssigneeEmailById.mockResolvedValue("assignee@example.com");
        mockGetHostEmailById.mockResolvedValue("host@example.com");
        mockSendEmail.mockResolvedValue();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("emails the assignee, naming the task and its property", async () => {
        await notify(task);

        expect(mockGetAssigneeEmailById).toHaveBeenCalledWith("member-1", "host-1");
        expect(mockSendEmail).toHaveBeenCalledWith("assignee@example.com", expectedSubject, expect.stringContaining('"Fix AC" (property: Villa Sunshine)'));
        expect(mockGetHostEmailById).not.toHaveBeenCalled();
    });

    it("emails the host when the task has no assignee", async () => {
        await notify({ ...task, assignee_team_member_id: null });

        expect(mockGetAssigneeEmailById).not.toHaveBeenCalled();
        expect(mockSendEmail).toHaveBeenCalledWith("host@example.com", expectedSubject, expect.any(String));
    });

    it("logs and resolves when the email cannot be sent, so the approval or rejection itself still stands", async () => {
        mockSendEmail.mockRejectedValue(new Error("email service down"));

        await expect(notify(task)).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("task-1"), expect.any(Error));
    });

    it("logs and resolves when the recipient's address cannot be found", async () => {
        mockGetAssigneeEmailById.mockRejectedValue(new Error("no email found"));

        await expect(notify(task)).resolves.toBeUndefined();

        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});

describe("what each email says", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAssigneeEmailById.mockResolvedValue("assignee@example.com");
        mockSendEmail.mockResolvedValue();
    });

    it("tells the assignee an approved task was approved", async () => {
        await notifyTaskApproved(task);

        expect(mockSendEmail.mock.calls[0][2]).toContain("was approved");
    });

    it("tells the assignee a rejected task is open again and needs to be completed again", async () => {
        await notifyTaskRejected(task);

        expect(mockSendEmail.mock.calls[0][2]).toContain("was rejected and reopened as In progress");
    });
});
