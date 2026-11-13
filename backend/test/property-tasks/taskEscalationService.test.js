const mockSend = jest.fn();

jest.mock("@aws-sdk/client-lambda", () => ({
    LambdaClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const { getHostEmailById, getAssigneeEmailById, sendTaskEscalationEmail } = require("../../functions/property-tasks/business/service/taskEscalationService.js");

const encodePayload = (body) => Buffer.from(JSON.stringify(body));

describe("getHostEmailById", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns the host's email from a well-formed GetUserInfo response", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({
                statusCode: 200,
                body: JSON.stringify([{ Attributes: [{ Name: "email", Value: "host@example.com" }] }]),
            }),
        });

        await expect(getHostEmailById("host-1")).resolves.toBe("host@example.com");
    });

    it("throws when GetUserInfo returns a FunctionError", async () => {
        mockSend.mockResolvedValue({ FunctionError: "Unhandled", Payload: encodePayload({}) });

        await expect(getHostEmailById("host-1")).rejects.toThrow(/Failed to fetch host email/);
    });

    it("throws when the response body is malformed", async () => {
        mockSend.mockResolvedValue({ Payload: encodePayload({ statusCode: 200, body: "not valid json" }) });

        await expect(getHostEmailById("host-1")).rejects.toThrow(/Failed to fetch host email/);
    });

    it("throws when no email attribute is present", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({
                statusCode: 200,
                body: JSON.stringify([{ Attributes: [{ Name: "sub", Value: "abc-123" }] }]),
            }),
        });

        await expect(getHostEmailById("host-1")).rejects.toThrow(/no email found/);
    });
});

describe("getAssigneeEmailById", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns the assignee's email from a well-formed host-team response", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({ statusCode: 200, body: JSON.stringify({ email: "assignee@example.com" }) }),
        });

        await expect(getAssigneeEmailById("member-1", "host-1")).resolves.toBe("assignee@example.com");
    });

    it("scopes the lookup to the requesting host", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({ statusCode: 200, body: JSON.stringify({ email: "assignee@example.com" }) }),
        });

        await getAssigneeEmailById("member-1", "host-1");

        const sentPayload = JSON.parse(mockSend.mock.calls[0][0].Payload);
        expect(sentPayload.queryStringParameters).toEqual({ id: "member-1", hostId: "host-1" });
    });

    it("throws when host-team returns a FunctionError", async () => {
        mockSend.mockResolvedValue({ FunctionError: "Unhandled", Payload: encodePayload({}) });

        await expect(getAssigneeEmailById("member-1", "host-1")).rejects.toThrow(/Failed to fetch assignee email/);
    });

    it("throws when host-team responds with a non-200 status", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({ statusCode: 404, body: JSON.stringify({ message: "Team member not found" }) }),
        });

        await expect(getAssigneeEmailById("member-1", "host-1")).rejects.toThrow(/Failed to fetch assignee email/);
    });

    it("throws when the response body is malformed", async () => {
        mockSend.mockResolvedValue({ Payload: encodePayload({ statusCode: 200, body: "not valid json" }) });

        await expect(getAssigneeEmailById("member-1", "host-1")).rejects.toThrow(/Failed to fetch assignee email/);
    });

    it("throws when no email is present in the response", async () => {
        mockSend.mockResolvedValue({
            Payload: encodePayload({ statusCode: 200, body: JSON.stringify({}) }),
        });

        await expect(getAssigneeEmailById("member-1", "host-1")).rejects.toThrow(/no email found/);
    });
});

describe("sendTaskEscalationEmail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const task = { title: "Fix AC", property_snapshot_label: "Villa Sunshine", due_date: Date.now() };

    it("resolves when the email sends successfully", async () => {
        mockSend.mockResolvedValue({ StatusCode: 200 });

        await expect(sendTaskEscalationEmail("host@example.com", task)).resolves.toBeUndefined();
    });

    it("throws when EmailNotificationService returns a FunctionError", async () => {
        mockSend.mockResolvedValue({ FunctionError: "Unhandled" });

        await expect(sendTaskEscalationEmail("host@example.com", task)).rejects.toThrow(/Failed to send escalation email/);
    });

    describe("the text of the email", () => {
        const sentBody = () => JSON.parse(mockSend.mock.calls[0][0].Payload).body.body;

        beforeEach(() => {
            mockSend.mockResolvedValue({ StatusCode: 200 });
        });

        it("says the task was escalated and when it is due, without claiming it is late", async () => {
            const dueDate = Date.now() + 24 * 60 * 60 * 1000;

            await sendTaskEscalationEmail("host@example.com", { ...task, due_date: dueDate });

            expect(sentBody()).toContain('The task "Fix AC" (property: Villa Sunshine) was escalated.');
            expect(sentBody()).toContain(`Due: ${new Date(dueDate).toISOString()}`);
            expect(sentBody()).not.toContain("passed its due date");
        });

        it("says no due date is set when the task has none", async () => {
            await sendTaskEscalationEmail("host@example.com", { ...task, due_date: null });

            expect(sentBody()).toContain("Due: no due date set");
        });
    });
});
