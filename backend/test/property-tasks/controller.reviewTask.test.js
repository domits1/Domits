jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({
    approveTask: jest.fn(),
    rejectTask: jest.fn(),
}));

jest.mock("../../functions/property-tasks/business/service/taskChecklistService.js", () => ({}));

const mockResolveEffectiveHostId = jest.fn();
jest.mock("../../functions/property-tasks/business/service/pomService.js", () => ({
    resolveEffectiveHostId: (...args) => mockResolveEffectiveHostId(...args),
}));

const mockGetUser = jest.fn();
jest.mock("../../functions/property-tasks/auth/authManager.js", () => ({
    AuthManager: jest.fn().mockImplementation(() => ({ getUser: mockGetUser })),
}));

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const { approveTask, rejectTask } = require("../../functions/property-tasks/business/service/taskService.js");
const { BadRequestException } = require("../../functions/property-tasks/util/exception/badRequestException.js");

const event = { headers: { Authorization: "token-1" }, queryStringParameters: { id: "task-1" } };

describe.each([
    ["approveTask", () => approveTask, (controller) => controller.approveTask(event)],
    ["rejectTask", () => rejectTask, (controller) => controller.rejectTask(event)],
])("Controller.%s", (_name, service, call) => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "host-1", isPOM: false });
        service().mockResolvedValue({ message: "done" });
    });

    it.each([
        "Host",
        "Admin",
        "General Manager",
        "Reservation Manager",
        "Guest Experience Manager",
        "Financial Manager",
        "Distribution Manager",
        "Revenue Manager",
        "Sales Manager",
        "Property Operations Manager",
    ])("lets a %s review the task, and records who did it", async (role) => {
        mockGetUser.mockResolvedValue({ username: "user-1", role });

        const response = await call(new Controller());

        expect(response.statusCode).toBe(200);
        expect(service()).toHaveBeenCalledWith("host-1", "task-1", "user-1");
    });

    it.each(["Traveler", "Housekeeper", "", undefined])("refuses someone whose role is %p, and does not touch the task", async (role) => {
        mockGetUser.mockResolvedValue({ username: "user-1", role });

        const response = await call(new Controller());

        expect(response.statusCode).toBe(401);
        expect(service()).not.toHaveBeenCalled();
    });

    it("reviews the host's task when a manager is acting for that host", async () => {
        mockGetUser.mockResolvedValue({ username: "manager-1", role: "Property Operations Manager" });
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "host-9", isPOM: true });

        await call(new Controller());

        expect(service()).toHaveBeenCalledWith("host-9", "task-1", "manager-1");
    });

    it("passes the service's complaint on as a client error", async () => {
        mockGetUser.mockResolvedValue({ username: "user-1", role: "Host" });
        service().mockRejectedValue(new BadRequestException("Only a completed task can be reviewed"));

        const response = await call(new Controller());

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe("Only a completed task can be reviewed");
    });
});
