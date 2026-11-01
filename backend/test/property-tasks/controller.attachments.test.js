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
const { getViewUrl } = require("../../functions/property-tasks/business/service/taskService.js");
const { UnauthorizedException } = require("../../functions/property-tasks/util/exception/unauthorizedException.js");

const viewEvent = (query) => ({
    headers: { Authorization: "token-1" },
    queryStringParameters: { action: "view-url", ...query },
});

describe("Controller.getViewUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue({ username: "user-1", role: "Host" });
        mockResolveEffectiveHostId.mockResolvedValue({ effectiveHostId: "host-1", isPOM: true });
        getViewUrl.mockResolvedValue("https://signed.example/view");
    });

    it("asks for the link as the host the signed-in user acts for", async () => {
        const response = await new Controller().getViewUrl(viewEvent({ taskId: "task-9", key: "tasks/host-1/a.jpg", asHostId: "host-1" }));

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ viewUrl: "https://signed.example/view" });
        expect(mockGetUser).toHaveBeenCalledWith("token-1");
        expect(mockResolveEffectiveHostId).toHaveBeenCalledWith("user-1", "Host", "host-1");
        expect(getViewUrl).toHaveBeenCalledWith("host-1", "task-9", "tasks/host-1/a.jpg");
    });

    it("answers 401 and asks for no link when the user is not on that host's team", async () => {
        mockResolveEffectiveHostId.mockRejectedValue(new UnauthorizedException("You are not a co-host for this host."));

        const response = await new Controller().getViewUrl(viewEvent({ taskId: "task-9", key: "k", asHostId: "host-2" }));

        expect(response.statusCode).toBe(401);
        expect(getViewUrl).not.toHaveBeenCalled();
    });

    it("answers 401 and asks for no link without a signed-in user", async () => {
        mockGetUser.mockRejectedValue(new UnauthorizedException("No authorization token provided."));

        const response = await new Controller().getViewUrl({ headers: {}, queryStringParameters: { taskId: "task-9", key: "k" } });

        expect(response.statusCode).toBe(401);
        expect(getViewUrl).not.toHaveBeenCalled();
    });

    it("passes the service's refusal on", async () => {
        getViewUrl.mockRejectedValue(Object.assign(new Error("Attachment not found"), { statusCode: 404 }));

        const response = await new Controller().getViewUrl(viewEvent({ taskId: "task-9", key: "k" }));

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ message: "Attachment not found" });
    });
});
