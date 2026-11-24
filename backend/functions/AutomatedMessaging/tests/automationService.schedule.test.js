import AutomationService from "../business/automationService.js";

const BASE = { name: "Welcome", template: "Hi {{guestName}}", triggerType: "BOOKING_PAID" };

const service = () => new AutomationService({});

const normalize = (patch, options) => service().normalizeDefinition({ ...BASE, ...patch }, options);

const rejects = (patch) => expect(() => normalize(patch)).toThrow(expect.objectContaining({ statusCode: 400 }));

describe("AutomationService trigger and schedule validation", () => {
  test.each([
    ["CHECK_IN", "BEFORE"],
    ["CHECK_IN", "AFTER"],
    ["CHECK_OUT", "BEFORE"],
    ["CHECK_OUT", "AFTER"],
  ])("accepts a %s automation %s the stay date", (triggerType, offsetDirection) => {
    const definition = normalize({ triggerType, offsetDirection, offsetAmount: 2, offsetUnit: "DAYS" });

    expect(definition).toMatchObject({ triggerType, offsetDirection, offsetAmount: 2, offsetUnit: "DAYS", sendTime: null });
  });

  test("rejects a trigger that does not exist", () => {
    rejects({ triggerType: "BOOKING_CANCELLED" });
  });

  test.each([undefined, null, "", "SIDEWAYS"])("rejects a stay trigger with the direction %p", (offsetDirection) => {
    rejects({ triggerType: "CHECK_IN", offsetDirection, offsetAmount: 1, offsetUnit: "DAYS" });
  });

  test("keeps a send time with days and with no offset", () => {
    expect(normalize({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" }))
      .toMatchObject({ offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" });
    expect(normalize({ triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 0, sendTime: "09:30" }))
      .toMatchObject({ offsetAmount: 0, sendTime: "09:30" });
  });

  test.each(["HOURS", "MINUTES"])("rejects a send time with an offset in %s", (offsetUnit) => {
    rejects({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 2, offsetUnit, sendTime: "10:00" });
  });

  test.each(["24:00", "9:00", "10:60", "10:00:00", "noon"])("rejects the send time %p", (sendTime) => {
    rejects({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 1, offsetUnit: "DAYS", sendTime });
  });

  test.each([null, undefined, ""])("treats an empty send time %p as none", (sendTime) => {
    const definition = normalize({ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 1, offsetUnit: "HOURS", sendTime });

    expect(definition.sendTime).toBeNull();
  });

  test.each([undefined, null, "", "AFTER"])("stores no direction for a booking-paid automation sent with %p", (offsetDirection) => {
    const definition = normalize({ offsetDirection, offsetAmount: 2, offsetUnit: "HOURS" });

    expect(definition).toMatchObject({ triggerType: "BOOKING_PAID", offsetDirection: null, sendTime: null });
  });

  test("rejects BEFORE and a send time on a booking-paid automation", () => {
    rejects({ offsetDirection: "BEFORE", offsetAmount: 1, offsetUnit: "DAYS" });
    rejects({ sendTime: "10:00", offsetAmount: 1, offsetUnit: "DAYS" });
  });

  test("an old automation without the new fields still passes validation", () => {
    const legacy = { ...BASE, offsetAmount: 5, offsetUnit: "MINUTES" };

    expect(service().normalizeDefinition(legacy)).toMatchObject({ offsetDirection: null, sendTime: null, offsetAmount: 5 });
  });

  test("a partial update that does not mention the schedule leaves it out of the patch", () => {
    expect(service().normalizeDefinition({ name: "Renamed" }, { partial: true })).toEqual({
      name: "Renamed",
      channel: "DOMITS_DIRECT",
    });
  });
});

describe("AutomationService create, update and the DTO", () => {
  const stored = {
    id: "automation-1",
    hostId: "host-1",
    propertyId: null,
    name: "Reminder",
    template: "Hi {{guestName}}",
    channel: "DOMITS_DIRECT",
    status: "DRAFT",
    triggerType: "CHECK_IN",
    offsetDirection: "BEFORE",
    offsetAmount: 3,
    offsetUnit: "DAYS",
    sendTime: "10:00",
  };

  const build = (automations) =>
    new AutomationService({
      automationRepository: automations,
      bookingContextRepository: { hostOwnsProperty: jest.fn(async () => true) },
    });

  test("create saves the direction and send time and returns them", async () => {
    const create = jest.fn(async (data) => ({ id: "automation-1", ...data }));
    const saved = await build({ create }).create("host-1", {
      name: "Reminder",
      template: "Hi {{guestName}}",
      triggerType: "CHECK_IN",
      offsetDirection: "BEFORE",
      offsetAmount: 3,
      offsetUnit: "DAYS",
      sendTime: "10:00",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", sendTime: "10:00", hostId: "host-1" })
    );
    expect(saved).toMatchObject({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", sendTime: "10:00" });
  });

  test("returns null for the new fields of an automation saved before they existed", async () => {
    const legacy = { ...stored, triggerType: "BOOKING_PAID", offsetDirection: undefined, sendTime: undefined };
    const result = await build({ getByIdForHost: jest.fn(async () => legacy) }).get("host-1", "automation-1");

    expect(result).toMatchObject({ offsetDirection: null, sendTime: null });
  });

  test("update re-validates the whole rule and refuses a send time after the unit changed to hours", async () => {
    const update = jest.fn();
    const target = build({ getByIdForHost: jest.fn(async () => stored), update });

    await expect(target.update("host-1", "automation-1", { offsetUnit: "HOURS" })).rejects.toMatchObject({ statusCode: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  test("activating validates the stored rule", async () => {
    const update = jest.fn(async () => ({ ...stored, status: "ACTIVE" }));
    const broken = { ...stored, offsetDirection: null };
    const target = build({ getByIdForHost: jest.fn(async () => broken), update });

    await expect(target.setStatus("host-1", "automation-1", "ACTIVE")).rejects.toMatchObject({ statusCode: 400 });
    expect(update).not.toHaveBeenCalled();
  });
});
