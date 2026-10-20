jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetTeamMemberById = jest.fn();
const mockGetHostSettings = jest.fn();

jest.mock("../../functions/property-tasks/data/taskRepository.js", () => ({
    getTeamMemberById: (...args) => mockGetTeamMemberById(...args),
    getHostSettings: (...args) => mockGetHostSettings(...args),
}));

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-lambda", () => ({
    LambdaClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const mockGetHostEmailById = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskEscalationService.js", () => ({
    getHostEmailById: (...args) => mockGetHostEmailById(...args),
}));

const { notifyTaskAssigned, notifyTaskCompleted } = require("../../functions/property-tasks/business/service/taskNotificationService.js");

const TEAM_MEMBER_ID = "550e8400-e29b-41d4-a716-446655440000";

const task = {
    id: "task-1",
    title: "Clean the villa",
    property_snapshot_label: "Villa Sunshine",
    due_date: new Date("2030-01-01T10:00:00Z").getTime(),
    assignee_team_member_id: TEAM_MEMBER_ID,
};

const activeMember = {
    id: TEAM_MEMBER_ID,
    host_id: "host-1",
    status: "active",
    member_email: "housekeeper@example.com",
    member_user_id: "member-user-1",
};

describe("notifyTaskAssigned", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockGetTeamMemberById.mockResolvedValue(activeMember);
        mockGetHostSettings.mockResolvedValue(null);
        mockSend.mockResolvedValue({ StatusCode: 200 });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("emails the assignee when they have never saved notification settings", async () => {
        await notifyTaskAssigned("host-1", task);

        expect(mockSend).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(mockSend.mock.calls[0][0].Payload);
        expect(payload.body.toEmail).toBe("housekeeper@example.com");
        expect(payload.body.subject).toContain("Clean the villa");
        expect(payload.body.body).toContain("Villa Sunshine");
    });

    it("reads the settings of the assignee, not of the host", async () => {
        await notifyTaskAssigned("host-1", task);

        expect(mockGetHostSettings).toHaveBeenCalledWith(expect.anything(), "member-user-1");
    });

    it("emails the assignee when they have explicitly left assignment emails on", async () => {
        mockGetHostSettings.mockResolvedValue({ notif_email_assigned: true });

        await notifyTaskAssigned("host-1", task);

        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("does not email an assignee who turned assignment emails off", async () => {
        mockGetHostSettings.mockResolvedValue({ notif_email_assigned: false });

        await notifyTaskAssigned("host-1", task);

        expect(mockSend).not.toHaveBeenCalled();
    });

    it("does not email someone whose invite has not been accepted yet", async () => {
        mockGetTeamMemberById.mockResolvedValue({ ...activeMember, status: "pending", member_user_id: null });

        await notifyTaskAssigned("host-1", task);

        expect(mockGetHostSettings).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("does not email a member who is no longer active", async () => {
        mockGetTeamMemberById.mockResolvedValue({ ...activeMember, status: "removed" });

        await notifyTaskAssigned("host-1", task);

        expect(mockSend).not.toHaveBeenCalled();
    });

    it("logs and resolves when the call to the email service itself fails", async () => {
        mockSend.mockRejectedValue(new Error("network down"));

        await expect(notifyTaskAssigned("host-1", task)).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("task assigned"), expect.any(Error));
    });

    it("does not email anyone when the team member no longer belongs to the host", async () => {
        mockGetTeamMemberById.mockResolvedValue(null);

        await notifyTaskAssigned("host-1", task);

        expect(mockGetTeamMemberById).toHaveBeenCalledWith(expect.anything(), TEAM_MEMBER_ID, "host-1");
        expect(mockSend).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("logs and resolves when the email service reports a function error", async () => {
        mockSend.mockResolvedValue({ FunctionError: "Unhandled" });

        await expect(notifyTaskAssigned("host-1", task)).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("task assigned"),
            expect.any(Error)
        );
    });

    it("logs and resolves when reading the settings fails", async () => {
        mockGetHostSettings.mockRejectedValue(new Error("database down"));

        await expect(notifyTaskAssigned("host-1", task)).resolves.toBeUndefined();

        expect(mockSend).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});

describe("notifyTaskCompleted", () => {
    let consoleErrorSpy;

    const completedTask = {
        id: "task-1",
        title: "Clean the villa",
        property_snapshot_label: "Villa Sunshine",
        completed_date: new Date("2030-01-01T12:00:00Z").getTime(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockGetHostSettings.mockResolvedValue(null);
        mockGetHostEmailById.mockResolvedValue("host@example.com");
        mockSend.mockResolvedValue({ StatusCode: 200 });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("emails the host when they have never saved notification settings", async () => {
        await notifyTaskCompleted("host-1", completedTask);

        expect(mockSend).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(mockSend.mock.calls[0][0].Payload);
        expect(payload.body.toEmail).toBe("host@example.com");
        expect(payload.body.subject).toContain("Clean the villa");
        expect(payload.body.body).toContain("Villa Sunshine");
    });

    it("reads the host's own settings row", async () => {
        await notifyTaskCompleted("host-1", completedTask);

        expect(mockGetHostSettings).toHaveBeenCalledWith(expect.anything(), "host-1");
    });

    it("emails the host when they have explicitly left completion emails on", async () => {
        mockGetHostSettings.mockResolvedValue({ notif_email_completed: true });

        await notifyTaskCompleted("host-1", completedTask);

        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("does not email a host who turned completion emails off, and does not look up their address", async () => {
        mockGetHostSettings.mockResolvedValue({ notif_email_completed: false });

        await notifyTaskCompleted("host-1", completedTask);

        expect(mockGetHostEmailById).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("logs and resolves when the host's email address cannot be found", async () => {
        mockGetHostEmailById.mockRejectedValue(new Error("Failed to fetch host email: no email found for this host"));

        await expect(notifyTaskCompleted("host-1", completedTask)).resolves.toBeUndefined();

        expect(mockSend).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("task completed"),
            expect.any(Error)
        );
    });

    it("logs and resolves when the email service reports a function error", async () => {
        mockSend.mockResolvedValue({ FunctionError: "Unhandled" });

        await expect(notifyTaskCompleted("host-1", completedTask)).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining("task completed"),
            expect.any(Error)
        );
    });

    it("says no completion time was recorded when the task has none", async () => {
        await notifyTaskCompleted("host-1", { ...completedTask, completed_date: null });

        const payload = JSON.parse(mockSend.mock.calls[0][0].Payload);
        expect(payload.body.body).toContain("no completion time recorded");
    });
});
