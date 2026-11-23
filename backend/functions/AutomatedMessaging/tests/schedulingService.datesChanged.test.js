import SchedulingService from "../business/schedulingService.js";

const NOW = Date.parse("2026-06-01T00:00:00Z");
const PAID_BOOKING = {
  id: "booking-1",
  hostid: "host-1",
  property_id: "property-1",
  status: "Paid",
  arrivaldate: Date.parse("2026-06-20T00:00:00Z"),
  departuredate: Date.parse("2026-06-23T00:00:00Z"),
};
const PLANNED = Date.parse("2026-06-17T08:00:00Z");
const CHECK_IN_RULE = {
  triggerType: "CHECK_IN",
  offsetDirection: "BEFORE",
  offsetAmount: 3,
  offsetUnit: "DAYS",
  sendTime: "10:00",
};

const stayDelivery = (id, automationId, scheduledFor = PLANNED) => ({
  id,
  automationId,
  bookingId: "booking-1",
  eventType: "CHECK_IN",
  scheduledFor,
  status: "SCHEDULED",
});

const setup = ({ booking = PAID_BOOKING, deliveries = [], automations = {}, events = [] } = {}) => {
  const deliveryRepository = {
    listScheduledStayByBooking: jest.fn(async () => deliveries),
    cancelScheduled: jest.fn(async () => true),
    rescheduleScheduled: jest.fn(async () => true),
    createScheduled: jest.fn(async (data) => ({ id: "created", ...data })),
    createCancelled: jest.fn(async (data) => ({ id: "cancelled", ...data })),
  };
  const bookingContextRepository = {
    getBooking: jest.fn(async () => booking),
    getPropertyCheckIn: jest.fn(async () => ({ checkInFrom: "15:00:00", checkOutTill: "11:00:00" })),
  };
  const outboxRepository = {
    listProcessable: jest.fn(async () => events),
    claim: jest.fn(async () => true),
    markProcessed: jest.fn(async () => {}),
    markFailed: jest.fn(async () => {}),
  };
  const automationRepository = {
    getById: jest.fn(async (id) => automations[id] ?? null),
    listActiveForBooking: jest.fn(async () => []),
  };
  const service = new SchedulingService({
    outboxRepository,
    automationRepository,
    deliveryRepository,
    bookingContextRepository,
    clock: () => NOW,
  });
  return { service, deliveryRepository, bookingContextRepository, outboxRepository, automationRepository };
};

const datesChanged = { id: "event-1", bookingId: "booking-1", eventType: "BOOKING_DATES_CHANGED", eventVersion: 1 };

describe("AutomatedMessaging stay dates changed", () => {
  test("does nothing when the booking has no scheduled stay-date delivery", async () => {
    const { service, bookingContextRepository, deliveryRepository } = setup();

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(0);

    expect(deliveryRepository.listScheduledStayByBooking).toHaveBeenCalledWith("booking-1");
    expect(bookingContextRepository.getBooking).not.toHaveBeenCalled();
  });

  test.each([
    ["is cancelled", { ...PAID_BOOKING, status: "Cancelled" }],
    ["no longer exists", null],
  ])("cancels every scheduled stay-date delivery when the booking %s", async (_label, booking) => {
    const { service, deliveryRepository } = setup({
      booking,
      deliveries: [stayDelivery("delivery-1", "automation-1"), stayDelivery("delivery-2", "automation-2")],
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(2);

    expect(deliveryRepository.cancelScheduled).toHaveBeenCalledWith(
      "delivery-1",
      "Booking is no longer eligible for this automation."
    );
    expect(deliveryRepository.cancelScheduled).toHaveBeenCalledWith(
      "delivery-2",
      "Booking is no longer eligible for this automation."
    );
    expect(deliveryRepository.rescheduleScheduled).not.toHaveBeenCalled();
  });

  test("leaves a delivery alone when its time is unchanged", async () => {
    const { service, deliveryRepository } = setup({
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE } },
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(0);

    expect(deliveryRepository.cancelScheduled).not.toHaveBeenCalled();
    expect(deliveryRepository.rescheduleScheduled).not.toHaveBeenCalled();
  });

  test("reschedules a delivery when the stay moved and the new time is ahead", async () => {
    const { service, deliveryRepository } = setup({
      booking: { ...PAID_BOOKING, arrivaldate: Date.parse("2026-06-25T00:00:00Z") },
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE } },
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(1);

    expect(deliveryRepository.rescheduleScheduled).toHaveBeenCalledWith(
      "delivery-1",
      Date.parse("2026-06-22T08:00:00Z")
    );
    expect(deliveryRepository.cancelScheduled).not.toHaveBeenCalled();
  });

  test("reschedules a delivery earlier when the stay moved earlier and the new time is still ahead", async () => {
    const { service, deliveryRepository } = setup({
      booking: { ...PAID_BOOKING, arrivaldate: Date.parse("2026-06-10T00:00:00Z") },
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE } },
    });

    await service.processDatesChanged(datesChanged);

    expect(deliveryRepository.rescheduleScheduled).toHaveBeenCalledWith(
      "delivery-1",
      Date.parse("2026-06-07T08:00:00Z")
    );
  });

  test("cancels a delivery when the stay moved so that the send time has passed", async () => {
    const { service, deliveryRepository } = setup({
      booking: { ...PAID_BOOKING, arrivaldate: Date.parse("2026-06-02T00:00:00Z") },
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE } },
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(1);

    expect(deliveryRepository.cancelScheduled).toHaveBeenCalledWith(
      "delivery-1",
      "Stay dates changed and the send time has passed."
    );
    expect(deliveryRepository.rescheduleScheduled).not.toHaveBeenCalled();
  });

  test("handles each delivery with its own rule and loads the property times once", async () => {
    const checkOutRule = {
      triggerType: "CHECK_OUT",
      offsetDirection: "AFTER",
      offsetAmount: 1,
      offsetUnit: "DAYS",
      sendTime: "10:00",
    };
    const { service, deliveryRepository, bookingContextRepository } = setup({
      booking: { ...PAID_BOOKING, arrivaldate: Date.parse("2026-06-25T00:00:00Z"), departuredate: Date.parse("2026-06-28T00:00:00Z") },
      deliveries: [
        stayDelivery("delivery-1", "automation-1"),
        { ...stayDelivery("delivery-2", "automation-2", Date.parse("2026-06-24T08:00:00Z")), eventType: "CHECK_OUT" },
      ],
      automations: {
        "automation-1": { id: "automation-1", ...CHECK_IN_RULE },
        "automation-2": { id: "automation-2", ...checkOutRule },
      },
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(2);

    expect(deliveryRepository.rescheduleScheduled).toHaveBeenCalledWith("delivery-1", Date.parse("2026-06-22T08:00:00Z"));
    expect(deliveryRepository.rescheduleScheduled).toHaveBeenCalledWith("delivery-2", Date.parse("2026-06-29T08:00:00Z"));
    expect(bookingContextRepository.getPropertyCheckIn).toHaveBeenCalledTimes(1);
    expect(bookingContextRepository.getPropertyCheckIn).toHaveBeenCalledWith("property-1");
  });

  test("cancels with a clear reason a delivery whose stored rule cannot be calculated", async () => {
    const { service, deliveryRepository } = setup({
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE, offsetUnit: "WEEKS" } },
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(1);

    expect(deliveryRepository.cancelScheduled).toHaveBeenCalledWith("delivery-1", "Send time could not be calculated.");
  });

  test("leaves a delivery whose automation no longer exists to the worker", async () => {
    const { service, deliveryRepository } = setup({
      deliveries: [stayDelivery("delivery-1", "gone")],
    });

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(0);

    expect(deliveryRepository.cancelScheduled).not.toHaveBeenCalled();
    expect(deliveryRepository.rescheduleScheduled).not.toHaveBeenCalled();
  });

  test("does not count a delivery that stopped being scheduled in the meantime", async () => {
    const { service, deliveryRepository } = setup({
      booking: { ...PAID_BOOKING, arrivaldate: Date.parse("2026-06-25T00:00:00Z") },
      deliveries: [stayDelivery("delivery-1", "automation-1")],
      automations: { "automation-1": { id: "automation-1", ...CHECK_IN_RULE } },
    });
    deliveryRepository.rescheduleScheduled.mockResolvedValue(false);

    await expect(service.processDatesChanged(datesChanged)).resolves.toBe(0);
  });
});

describe("AutomatedMessaging outbox routing", () => {
  const paidEvent = { id: "event-paid", bookingId: "booking-1", eventType: "BOOKING_PAID", eventVersion: 1, occurredAt: NOW };

  test("sends each event type to its own handler and marks them processed", async () => {
    const unknown = { id: "event-other", bookingId: "booking-1", eventType: "SOMETHING_NEW", eventVersion: 1 };
    const { service, outboxRepository } = setup({ events: [paidEvent, datesChanged, unknown] });
    service.processEvent = jest.fn(async () => [{ id: "d" }, { id: "e" }]);
    service.processDatesChanged = jest.fn(async () => 3);

    const results = await service.processOutbox();

    expect(service.processEvent).toHaveBeenCalledTimes(1);
    expect(service.processEvent).toHaveBeenCalledWith(paidEvent);
    expect(service.processDatesChanged).toHaveBeenCalledTimes(1);
    expect(service.processDatesChanged).toHaveBeenCalledWith(datesChanged);
    expect(results).toEqual([
      { eventId: "event-paid", scheduled: 2 },
      { eventId: "event-1", updated: 3 },
      { eventId: "event-other", scheduled: 0 },
    ]);
    expect(outboxRepository.markProcessed).toHaveBeenCalledTimes(3);
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });

  test("an unknown event type schedules nothing and touches no delivery", async () => {
    const unknown = { id: "event-other", bookingId: "booking-1", eventType: "SOMETHING_NEW", eventVersion: 2 };
    const { service, deliveryRepository, bookingContextRepository, outboxRepository } = setup({ events: [unknown] });

    await service.processOutbox();

    expect(outboxRepository.markProcessed).toHaveBeenCalledWith("event-other");
    expect(bookingContextRepository.getBooking).not.toHaveBeenCalled();
    expect(deliveryRepository.createScheduled).not.toHaveBeenCalled();
    expect(deliveryRepository.createCancelled).not.toHaveBeenCalled();
    expect(deliveryRepository.cancelScheduled).not.toHaveBeenCalled();
  });

  test("a date-change event never creates a booking-paid delivery", async () => {
    const { service, deliveryRepository, automationRepository } = setup({ events: [datesChanged] });

    await service.processOutbox();

    expect(automationRepository.listActiveForBooking).not.toHaveBeenCalled();
    expect(deliveryRepository.createScheduled).not.toHaveBeenCalled();
  });

  test("marks the event failed when the date-change handling throws", async () => {
    const { service, outboxRepository, deliveryRepository } = setup({ events: [datesChanged] });
    deliveryRepository.listScheduledStayByBooking.mockRejectedValue(new Error("database down"));

    const results = await service.processOutbox();

    expect(outboxRepository.markFailed).toHaveBeenCalledWith("event-1", "Booking-paid event processing failed.");
    expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
    expect(results).toEqual([{ eventId: "event-1", scheduled: 0, failed: true }]);
  });

  test("skips an event that another worker has already claimed", async () => {
    const { service, outboxRepository } = setup({ events: [datesChanged] });
    outboxRepository.claim.mockResolvedValue(false);
    service.processDatesChanged = jest.fn();

    expect(await service.processOutbox()).toEqual([]);
    expect(service.processDatesChanged).not.toHaveBeenCalled();
  });
});
