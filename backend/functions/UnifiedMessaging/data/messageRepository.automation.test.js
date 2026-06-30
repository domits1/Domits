jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const MessageRepository = require("./messageRepository.js").default;

describe("MessageRepository automated message eligibility", () => {
  test("inserts only through the final active/paid/current-owner condition", async () => {
    const message = { id: "message-1", automationDeliveryId: "delivery-1" };
    const query = jest.fn(async () => [{ id: "message-1" }]);
    Database.getInstance.mockResolvedValue({
      options: { schema: "main" },
      query,
      getRepository: jest.fn(() => ({ findOne: jest.fn(async () => message) })),
    });
    const repository = new MessageRepository();

    await expect(repository.createAutomatedMessageIfEligible({
      threadId: "thread-1",
      senderId: "host-1",
      recipientId: "guest-1",
      content: "Welcome Taylor",
      automationDeliveryId: "delivery-1",
      automationId: "automation-1",
      bookingId: "booking-1",
      propertyId: "property-1",
      metadata: "{}",
      createdAt: 1_000,
    })).resolves.toEqual({ message, created: true });

    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain("delivery.status = 'PROCESSING'");
    expect(sql).toContain("automation.status = 'ACTIVE'");
    expect(sql).toContain("LOWER(TRIM(booking.status)) = 'paid'");
    expect(sql).toContain("property.hostid = $3");
    expect(parameters).toEqual(expect.arrayContaining([
      "delivery-1",
      "automation-1",
      "booking-1",
      "property-1",
    ]));
  });
});
