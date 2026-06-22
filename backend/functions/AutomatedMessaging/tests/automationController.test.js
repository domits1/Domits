import AutomationController from "../controller/automationController.js";
import AutomationService from "../business/automationService.js";

const hostEvent = (body = null, role = "host") => ({
  body: body === null ? null : JSON.stringify(body),
  requestContext: {
    authorizer: {
      claims: { sub: "host-1", "custom:group": role },
    },
  },
});

const createHarness = () => {
  const records = [];
  const automationRepository = {
    listByHost: jest.fn(async (hostId) => records.filter((item) => item.hostId === hostId)),
    getByIdForHost: jest.fn(async (id, hostId) => records.find((item) => item.id === id && item.hostId === hostId) || null),
    create: jest.fn(async (data) => {
      const record = { id: `automation-${records.length + 1}`, ...data, createdAt: 1, updatedAt: 1 };
      records.push(record);
      return record;
    }),
    update: jest.fn(async (id, hostId, patch) => {
      const record = records.find((item) => item.id === id && item.hostId === hostId);
      Object.assign(record, patch, { updatedAt: 2 });
      return record;
    }),
  };
  const bookingContextRepository = {
    hostOwnsProperty: jest.fn(async (hostId, propertyId) => hostId === "host-1" && propertyId !== "property-other"),
    getBookingContext: jest.fn(),
  };
  const deliveryRepository = { listByAutomation: jest.fn(async () => []) };
  const service = new AutomationService({ automationRepository, bookingContextRepository, deliveryRepository });
  return {
    controller: new AutomationController(service),
    records,
    bookingContextRepository,
    deliveryRepository,
  };
};

const validAutomation = {
  name: "Paid booking welcome",
  propertyId: "property-1",
  triggerType: "BOOKING_PAID",
  offsetAmount: 2,
  offsetUnit: "HOURS",
  channel: "DOMITS_DIRECT",
  template: "Hi {{guestName}}, your stay at {{propertyName}} is confirmed.",
};

describe("AutomatedMessaging host management", () => {
  test("host can create, update, and list an owned automation", async () => {
    const { controller } = createHarness();
    const created = await controller.create(hostEvent(validAutomation));
    expect(created.statusCode).toBe(201);
    expect(created.response).toMatchObject({ id: "automation-1", status: "DRAFT", propertyId: "property-1" });

    const updated = await controller.update(
      hostEvent({ name: "Updated welcome", offsetAmount: 1, offsetUnit: "DAYS" }),
      "automation-1"
    );
    expect(updated.response).toMatchObject({ name: "Updated welcome", offsetAmount: 1, offsetUnit: "DAYS" });

    const listed = await controller.list(hostEvent());
    expect(listed.response).toHaveLength(1);
    expect(listed.response[0].name).toBe("Updated welcome");
  });

  test("guest is rejected", async () => {
    const { controller } = createHarness();
    await expect(controller.create(hostEvent(validAutomation, "guest"))).rejects.toMatchObject({ statusCode: 403 });
  });

  test("host cannot create an automation for another host's property", async () => {
    const { controller } = createHarness();
    await expect(
      controller.create(hostEvent({ ...validAutomation, propertyId: "property-other" }))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("unsupported template variables are rejected", async () => {
    const { controller } = createHarness();
    await expect(
      controller.create(hostEvent({ ...validAutomation, template: "Pay here: {{paymentLink}}" }))
    ).rejects.toMatchObject({ statusCode: 400, details: { unknownVariables: ["paymentLink"] } });
  });

  test("non-object JSON bodies are rejected as a bad request", async () => {
    const { controller } = createHarness();
    await expect(controller.create(hostEvent())).rejects.toMatchObject({ statusCode: 400 });
    await expect(controller.create({ ...hostEvent(), body: "null" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("preview verifies an explicitly selected property", async () => {
    const { controller } = createHarness();
    await expect(
      controller.preview(hostEvent({ template: "Hi {{guestName}}", propertyId: "property-other" }))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("list excludes property automations after ownership transfer", async () => {
    const { controller, bookingContextRepository } = createHarness();
    await controller.create(hostEvent(validAutomation));
    bookingContextRepository.hostOwnsProperty.mockResolvedValue(false);

    await expect(controller.list(hostEvent())).resolves.toMatchObject({ response: [] });
  });

  test("get, status changes, and delivery history reject transferred properties", async () => {
    const { controller, bookingContextRepository, deliveryRepository } = createHarness();
    await controller.create(hostEvent(validAutomation));
    bookingContextRepository.hostOwnsProperty.mockResolvedValue(false);

    await expect(controller.get(hostEvent(), "automation-1")).rejects.toMatchObject({ statusCode: 403 });
    await expect(controller.activate(hostEvent(), "automation-1")).rejects.toMatchObject({ statusCode: 403 });
    await expect(controller.pause(hostEvent(), "automation-1")).rejects.toMatchObject({ statusCode: 403 });
    await expect(controller.deliveries(hostEvent(), "automation-1")).rejects.toMatchObject({ statusCode: 403 });
    expect(deliveryRepository.listByAutomation).not.toHaveBeenCalled();
  });

  test("host-wide automation remains accessible to its creator", async () => {
    const { controller } = createHarness();
    const created = await controller.create(hostEvent({ ...validAutomation, propertyId: null }));

    await expect(controller.get(hostEvent(), created.response.id)).resolves.toMatchObject({
      response: { propertyId: null },
    });
  });

  test("property-scoped automation remains accessible to the current owner", async () => {
    const { controller } = createHarness();
    const created = await controller.create(hostEvent(validAutomation));

    await expect(controller.get(hostEvent(), created.response.id)).resolves.toMatchObject({
      response: { propertyId: "property-1" },
    });
  });

  test("authenticated host operations stop when the deployment schema gate fails", async () => {
    const schemaError = Object.assign(new Error("Schema missing"), {
      statusCode: 503,
      code: "SCHEMA_NOT_READY",
    });
    const service = { list: jest.fn() };
    const controller = new AutomationController(service, {
      assertReady: jest.fn(async () => { throw schemaError; }),
    });

    await expect(controller.list(hostEvent())).rejects.toBe(schemaError);
    expect(service.list).not.toHaveBeenCalled();
  });
});
