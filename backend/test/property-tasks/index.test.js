const mockGetTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockGetUploadUrl = jest.fn();
const mockGetViewUrl = jest.fn();
const mockGetChecklistItems = jest.fn();
const mockCreateChecklistItem = jest.fn();
const mockUpdateChecklistItem = jest.fn();
const mockDeleteChecklistItem = jest.fn();

jest.mock("../../functions/property-tasks/controller/controller.js", () => ({
    Controller: jest.fn().mockImplementation(() => ({
        getTasks: mockGetTasks,
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask,
        getUploadUrl: mockGetUploadUrl,
        getViewUrl: mockGetViewUrl,
        getChecklistItems: mockGetChecklistItems,
        createChecklistItem: mockCreateChecklistItem,
        updateChecklistItem: mockUpdateChecklistItem,
        deleteChecklistItem: mockDeleteChecklistItem,
    })),
}));

describe("property-tasks handler routing", () => {
    let handler;
    const fakeResponse = { statusCode: 200, body: "{}" };

    beforeAll(async () => {
        const mod = await import("../../functions/property-tasks/index.js");
        handler = mod.handler;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        [mockGetTasks, mockCreateTask, mockUpdateTask, mockDeleteTask, mockGetUploadUrl, mockGetViewUrl,
            mockGetChecklistItems, mockCreateChecklistItem, mockUpdateChecklistItem, mockDeleteChecklistItem]
            .forEach(fn => fn.mockResolvedValue(fakeResponse));
    });

    it("GET with no action routes to getTasks", async () => {
        await handler({ httpMethod: "GET", queryStringParameters: null });
        expect(mockGetTasks).toHaveBeenCalledTimes(1);
    });

    it("GET with action=upload-url routes to getUploadUrl", async () => {
        await handler({ httpMethod: "GET", queryStringParameters: { action: "upload-url" } });
        expect(mockGetUploadUrl).toHaveBeenCalledTimes(1);
    });

    it("GET with action=view-url routes to getViewUrl", async () => {
        await handler({ httpMethod: "GET", queryStringParameters: { action: "view-url" } });
        expect(mockGetViewUrl).toHaveBeenCalledTimes(1);
    });

    it("GET with action=checklist routes to getChecklistItems", async () => {
        await handler({ httpMethod: "GET", queryStringParameters: { action: "checklist" } });
        expect(mockGetChecklistItems).toHaveBeenCalledTimes(1);
        expect(mockGetTasks).not.toHaveBeenCalled();
    });

    it("POST with no action routes to createTask", async () => {
        await handler({ httpMethod: "POST", queryStringParameters: null });
        expect(mockCreateTask).toHaveBeenCalledTimes(1);
    });

    it("POST with action=checklist routes to createChecklistItem", async () => {
        await handler({ httpMethod: "POST", queryStringParameters: { action: "checklist" } });
        expect(mockCreateChecklistItem).toHaveBeenCalledTimes(1);
        expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it("PATCH with no action routes to updateTask", async () => {
        await handler({ httpMethod: "PATCH", queryStringParameters: null });
        expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    });

    it("PATCH with action=checklist routes to updateChecklistItem", async () => {
        await handler({ httpMethod: "PATCH", queryStringParameters: { action: "checklist" } });
        expect(mockUpdateChecklistItem).toHaveBeenCalledTimes(1);
        expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it("DELETE with no action routes to deleteTask", async () => {
        await handler({ httpMethod: "DELETE", queryStringParameters: null });
        expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    });

    it("DELETE with action=checklist routes to deleteChecklistItem", async () => {
        await handler({ httpMethod: "DELETE", queryStringParameters: { action: "checklist" } });
        expect(mockDeleteChecklistItem).toHaveBeenCalledTimes(1);
        expect(mockDeleteTask).not.toHaveBeenCalled();
    });

    it("OPTIONS returns 200 with CORS headers, without touching the controller", async () => {
        const res = await handler({ httpMethod: "OPTIONS" });
        expect(res.statusCode).toBe(200);
        expect(res.headers["Access-Control-Allow-Methods"]).toContain("PATCH");
        expect(mockGetTasks).not.toHaveBeenCalled();
    });

    it("an unsupported method returns 404", async () => {
        const res = await handler({ httpMethod: "PUT" });
        expect(res.statusCode).toBe(404);
    });

    it("returns 500 when the controller throws", async () => {
        mockGetTasks.mockRejectedValue(new Error("boom"));
        const res = await handler({ httpMethod: "GET", queryStringParameters: null });
        expect(res.statusCode).toBe(500);
    });
});
