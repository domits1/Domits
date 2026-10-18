const mockChannexWebhookService = {
  handleWebhookEvent: jest.fn(),
};

jest.mock("../business/channexWebhookService.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockChannexWebhookService),
}));

const ChannexWebhookController = require("./channexWebhookController.js").default;

describe("ChannexWebhookController", () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ChannexWebhookController();
  });

  test("delegates the Lambda event to ChannexWebhookService.handleWebhookEvent only", async () => {
    const event = {
      httpMethod: "POST",
      path: "/default/webhooks/channex",
      headers: { "X-Channex-Webhook-Secret": "test-secret" },
      body: JSON.stringify({ event: "message", payload: {} }),
    };
    mockChannexWebhookService.handleWebhookEvent.mockResolvedValue({
      statusCode: 200,
      response: { ok: true },
    });

    const result = await controller.handleWebhookEvent(event);

    expect(mockChannexWebhookService.handleWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mockChannexWebhookService.handleWebhookEvent).toHaveBeenCalledWith(event);
    expect(result).toEqual({ statusCode: 200, response: { ok: true } });
  });
});
