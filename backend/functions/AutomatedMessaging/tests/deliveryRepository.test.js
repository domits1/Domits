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

describe("DeliveryRepository send-time safety", () => {
  const updateBuilder = (affected) => {
    const builder = {};
    ["update", "set", "where", "andWhere"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.execute = jest.fn(async () => ({ affected }));
    return builder;
  };

  const withBuilder = (builder) => Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => builder) });

  test("puts a processing delivery back to scheduled with the new time", async () => {
    const builder = updateBuilder(1);
    withBuilder(builder);
    const repository = new DeliveryRepository();

    await expect(repository.reschedule("delivery-1", 5_000)).resolves.toBe(true);

    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SCHEDULED", scheduledFor: 5_000, failureReason: null })
    );
    expect(builder.where).toHaveBeenCalledWith("id = :id", { id: "delivery-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("status = :processing", { processing: "PROCESSING" });
  });

  test("reports false when the delivery is no longer processing", async () => {
    withBuilder(updateBuilder(0));

    await expect(new DeliveryRepository().reschedule("delivery-1", 5_000)).resolves.toBe(false);
  });

  test("authorizes a send only for the arrival and departure the worker used", async () => {
    const builder = updateBuilder(1);
    withBuilder(builder);
    const repository = new DeliveryRepository();

    await expect(
      repository.authorizeSend({
        deliveryId: "delivery-1",
        automationId: "automation-1",
        bookingId: "booking-1",
        hostId: "host-1",
        propertyId: "property-1",
        arrivalDate: 100,
        departureDate: 200,
        now: 1_000,
      })
    ).resolves.toBe(true);

    const [sql, parameters] = builder.andWhere.mock.calls.find(([text]) => text.includes("EXISTS"));
    expect(sql).toContain("booking.arrivaldate = :arrivalDate");
    expect(sql).toContain("booking.departuredate = :departureDate");
    expect(parameters).toMatchObject({ arrivalDate: 100, departureDate: 200 });
  });
});

describe("DeliveryRepository scheduled stay-date deliveries", () => {
  const updateBuilder = (affected) => {
    const builder = {};
    ["update", "set", "where", "andWhere"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.execute = jest.fn(async () => ({ affected }));
    return builder;
  };

  test("lists only scheduled check-in and check-out deliveries of the booking", async () => {
    const builder = {};
    ["where", "andWhere", "orderBy"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.getMany = jest.fn(async () => [{ id: "delivery-1" }]);
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => builder) })),
    });

    await expect(new DeliveryRepository().listScheduledStayByBooking("booking-1")).resolves.toEqual([
      { id: "delivery-1" },
    ]);

    expect(builder.where).toHaveBeenCalledWith("delivery.bookingId = :bookingId", { bookingId: "booking-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("delivery.status = :scheduled", { scheduled: "SCHEDULED" });
    expect(builder.andWhere).toHaveBeenCalledWith("delivery.eventType IN (:...stayTriggers)", {
      stayTriggers: ["CHECK_IN", "CHECK_OUT"],
    });
  });

  test("cancels a delivery only while it is still scheduled", async () => {
    const builder = updateBuilder(1);
    Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => builder) });

    await expect(new DeliveryRepository().cancelScheduled("delivery-1", "Reason.")).resolves.toBe(true);

    expect(builder.set).toHaveBeenCalledWith(expect.objectContaining({ status: "CANCELLED", failureReason: "Reason." }));
    expect(builder.where).toHaveBeenCalledWith("id = :id", { id: "delivery-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("status = :scheduled", { scheduled: "SCHEDULED" });
  });

  test("moves a delivery only while it is still scheduled", async () => {
    const builder = updateBuilder(1);
    Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => builder) });

    await expect(new DeliveryRepository().rescheduleScheduled("delivery-1", 9_000)).resolves.toBe(true);

    expect(builder.set).toHaveBeenCalledWith(expect.objectContaining({ scheduledFor: 9_000 }));
    expect(builder.set).not.toHaveBeenCalledWith(expect.objectContaining({ status: expect.anything() }));
    expect(builder.andWhere).toHaveBeenCalledWith("status = :scheduled", { scheduled: "SCHEDULED" });
  });

  test.each([
    ["cancelScheduled", ["delivery-1", "Reason."]],
    ["rescheduleScheduled", ["delivery-1", 9_000]],
  ])("%s reports false when the delivery is no longer scheduled", async (method, args) => {
    Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => updateBuilder(0)) });

    await expect(new DeliveryRepository()[method](...args)).resolves.toBe(false);
  });
});

