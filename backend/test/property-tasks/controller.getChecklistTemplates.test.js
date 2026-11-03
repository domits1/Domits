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

const mockGetUser = jest.fn();
jest.mock("../../functions/property-tasks/auth/authManager.js", () => ({
    AuthManager: jest.fn().mockImplementation(() => ({ getUser: mockGetUser })),
}));

const { Controller } = require("../../functions/property-tasks/controller/controller.js");
const { CHECKLIST_TEMPLATES } = require("../../functions/property-tasks/business/model/checklistTemplates.js");
const { UnauthorizedException } = require("../../functions/property-tasks/util/exception/unauthorizedException.js");

describe("Controller.getChecklistTemplates", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockResolvedValue({ username: "host-1", role: "Host" });
    });

    it("returns the checklist templates for an authenticated caller", async () => {
        const controller = new Controller();

        const response = await controller.getChecklistTemplates({ headers: { Authorization: "token-1" } });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(CHECKLIST_TEMPLATES);
    });

    it("rejects an unauthenticated caller", async () => {
        mockGetUser.mockRejectedValue(new UnauthorizedException("No authorization token provided."));
        const controller = new Controller();

        const response = await controller.getChecklistTemplates({ headers: {} });

        expect(response.statusCode).toBe(401);
    });
});
