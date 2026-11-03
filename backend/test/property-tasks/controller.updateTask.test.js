jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({
    getTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    getUploadUrl: jest.fn(),
    getViewUrl: jest.fn(),
    escalateTask: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskChecklistService.js", () => ({
    getChecklistItems: jest.fn(),
    createChecklistItem: jest.fn(),
    updateChecklistItem: jest.fn(),
    deleteChecklistItem: jest.fn(),
}));

const mockResolveEffectiveHostId = jest.fn();
jest.mock("../../functions/property-tasks/business/service/pomService.js", () => ({
    resolveEffectiveHostId: (...args) => mockResolveEffectiveHostId(...args),
}));

const mockGetUser = jest.fn();
jest.mock("../../functions/property-tasks/auth/authManager.js", () => ({
    AuthManager: jest.fn().mockImplementation(() => ({ getUser: mockGetUser })),
}));

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const { createTask, updateTask } = require("../../functions/property-tasks/business/service/taskService.js");

const event = {
    headers: { Authorization: "token-1" },
    queryStringParameters: { id: "task-1" },
    body: JSON.stringify({ status: "Completed" }),
};

describe("Controller.updateTask", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue({ username: "user-1", role: "Property Operations Manager" });
        updateTask.mockResolvedValue({ message: "Task updated successfully" });
    });

    it("tells the service a team member made the change when the caller acts for a host", async () => {
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "host-1", isPOM: true });

        const response = await new Controller().updateTask(event);

        expect(response.statusCode).toBe(200);
        expect(updateTask).toHaveBeenCalledWith("host-1", "task-1", { status: "Completed" }, { actorIsTeamMember: true, actorId: "user-1" });
    });

    it("tells the service the host made the change when the caller is the host", async () => {
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "user-1", isPOM: false });

        await new Controller().updateTask(event);

        expect(updateTask).toHaveBeenCalledWith("user-1", "task-1", { status: "Completed" }, { actorIsTeamMember: false, actorId: "user-1" });
    });
});

describe("Controller.createTask", () => {
    it("tells the service which signed-in person is creating the task, even when acting for a host", async () => {
        mockGetUser.mockResolvedValue({ username: "user-1", role: "Property Operations Manager" });
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "host-1", isPOM: true });
        createTask.mockResolvedValue({ id: "task-1" });
        const body = { title: "Clean the villa" };

        const response = await new Controller().createTask({ headers: { Authorization: "token-1" }, body: JSON.stringify(body) });

        expect(response.statusCode).toBe(201);
        expect(createTask).toHaveBeenCalledWith("host-1", body, { actorId: "user-1" });
    });
});
