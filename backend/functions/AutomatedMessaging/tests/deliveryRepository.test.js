jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const DeliveryRepository = require("../data/deliveryRepository.js").default;

const insertBuilder = () => {
  const builder = {};
  ["insert", "into", "values", "orIgnore"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.execute = jest.fn(async () => ({}));
  return builder;
};

describe("DeliveryRepository cancelled deliveries", () => {
  const data = {
    automationId: "automation-1",
    bookingId: "booking-1",
    eventType: "CHECK_IN",
    eventVersion: 1,
    scheduledFor: 1_000,
    templateSnapshot: "Hi",
    idempotencyKey: "automation-1:booking-1:CHECK_IN:1",
  };

  const setup = () => {
    const builder = insertBuilder();
    const findOne = jest.fn(async () => ({ id: "delivery-1", status: "CANCELLED" }));
    Database.getInstance.mockResolvedValue({
      createQueryBuilder: jest.fn(() => builder),
      getRepository: jest.fn(() => ({ findOne })),
    });
    return { builder, findOne };
  };

  test("stores a cancelled delivery with its reason, once per idempotency key", async () => {
    const { builder, findOne } = setup();
    const repository = new DeliveryRepository();

    const delivery = await repository.createCancelled(data, "Send time had already passed when the booking was paid.");

    expect(builder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        ...data,
        status: "CANCELLED",
        failureReason: "Send time had already passed when the booking was paid.",
        messageId: null,
        renderedContent: null,
        sentAt: null,
      })
    );
    expect(builder.orIgnore).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({ where: { idempotencyKey: data.idempotencyKey } });
    expect(delivery).toEqual({ id: "delivery-1", status: "CANCELLED" });
  });

  test("still creates scheduled deliveries as before", async () => {
    const { builder } = setup();
    const repository = new DeliveryRepository();

    await repository.createScheduled(data);

    expect(builder.values).toHaveBeenCalledWith(
      expect.objectContaining({ ...data, status: "SCHEDULED", failureReason: null })
    );
  });
});
