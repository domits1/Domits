const mockSend = jest.fn();

jest.mock("@aws-sdk/client-lambda", () => ({
    LambdaClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const { getHostEmailById, sendTaskEscalationEmail } = require("../../functions/property-tasks/business/service/taskEscalationService.js");

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
});
