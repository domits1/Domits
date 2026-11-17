const mockCreateTask = jest.fn();

jest.mock("../../functions/property-tasks/business/service/taskService.js", () => ({
    getTasks: jest.fn(),
    createTask: (...args) => mockCreateTask(...args),
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

const { Controller } = require("../../functions/property-tasks/controller/controller.js");

const SECRET = "test-internal-secret";

const buildEvent = (overrides = {}) => ({
    headers: { "x-internal-secret": SECRET },
    body: JSON.stringify({ hostId: "host-1", taskData: { title: "Clean the property" } }),
    ...overrides,
});

describe("Controller.internalCreateTask", () => {
    const originalSecret = process.env.INTERNAL_TASK_SECRET;
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INTERNAL_TASK_SECRET = SECRET;
        mockCreateTask.mockResolvedValue({ id: "task-1" });
    });
    afterAll(() => {
        process.env.INTERNAL_TASK_SECRET = originalSecret;
    });

    it("creates the task when the secret is valid", async () => {
        const controller = new Controller();

        const response = await controller.internalCreateTask(buildEvent());

        expect(response.statusCode).toBe(201);
        expect(mockCreateTask).toHaveBeenCalledWith("host-1", { title: "Clean the property" });
    });

    it("rejects when the secret header is missing", async () => {
        const controller = new Controller();

        const response = await controller.internalCreateTask(buildEvent({ headers: {} }));

        expect(response.statusCode).toBe(401);
        expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it("rejects when the secret header is wrong", async () => {
        const controller = new Controller();

        const response = await controller.internalCreateTask(buildEvent({ headers: { "x-internal-secret": "wrong" } }));

        expect(response.statusCode).toBe(401);
        expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it("returns 400 when hostId is missing, even with a valid secret", async () => {
        const controller = new Controller();

        const response = await controller.internalCreateTask(buildEvent({
            body: JSON.stringify({ taskData: { title: "Clean the property" } }),
        }));

        expect(response.statusCode).toBe(400);
        expect(mockCreateTask).not.toHaveBeenCalled();
    });
});
