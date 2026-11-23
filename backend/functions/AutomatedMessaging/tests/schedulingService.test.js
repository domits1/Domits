import SchedulingService, { calculateScheduledFor } from "../business/schedulingService.js";

const createDeliveryRepository = () => {
  const records = new Map();
  return {
    records,
    createScheduled: jest.fn(async (data) => {
      if (!records.has(data.idempotencyKey)) records.set(data.idempotencyKey, { id: "delivery-1", ...data });
      return records.get(data.idempotencyKey);
    }),
  };
};

describe("AutomatedMessaging booking-paid scheduling", () => {
  test("active automation schedules once when the event is processed twice", async () => {
    const deliveryRepository = createDeliveryRepository();
    const service = new SchedulingService({
      outboxRepository: {},
      deliveryRepository,
      bookingContextRepository: {
        getBooking: jest.fn(async () => ({
          id: "booking-1",
          hostid: "host-1",
          property_id: "property-1",
          status: "Paid",
        })),
      },
      automationRepository: {
        listActiveForBooking: jest.fn(async () => [
          {
            id: "automation-1",
            offsetAmount: 2,
            offsetUnit: "HOURS",
            template: "Hi {{guestName}}",
          },
        ]),
      },
    });
    const event = { bookingId: "booking-1", eventVersion: 1, occurredAt: 1_000 };

    await service.processEvent(event);
    await service.processEvent(event);

    expect(deliveryRepository.records.size).toBe(1);
    expect([...deliveryRepository.records.values()][0].scheduledFor).toBe(calculateScheduledFor(1_000, 2, "HOURS"));
  });

  test("paused automation does not schedule", async () => {
    const deliveryRepository = createDeliveryRepository();
    const service = new SchedulingService({
      outboxRepository: {},
      deliveryRepository,
      bookingContextRepository: {
        getBooking: jest.fn(async () => ({ id: "booking-1", hostid: "host-1", property_id: "property-1", status: "Paid" })),
      },
      automationRepository: { listActiveForBooking: jest.fn(async () => []) },
    });

    expect(await service.processEvent({ bookingId: "booking-1", eventVersion: 1, occurredAt: 1_000 })).toEqual([]);
    expect(deliveryRepository.createScheduled).not.toHaveBeenCalled();
  });
});

describe("AutomatedMessaging stay-date scheduling", () => {
  const NOW = Date.parse("2026-06-01T00:00:00Z");
  const BOOKING = {
    id: "booking-1",
    hostid: "host-1",
    property_id: "property-1",
    status: "Paid",
    arrivaldate: Date.parse("2026-06-20T00:00:00Z"),
    departuredate: Date.parse("2026-06-23T00:00:00Z"),
  };
  const CHECK_IN_ROW = { checkInFrom: "15:00:00", checkOutTill: "11:00:00" };
  const EVENT = { bookingId: "booking-1", eventVersion: 1, occurredAt: NOW };

  const createDeliveries = () => {
    const records = new Map();
    const store = (status) => async (data, failureReason = null) => {
      if (!records.has(data.idempotencyKey)) {
        records.set(data.idempotencyKey, { id: `delivery-${records.size + 1}`, ...data, status, failureReason });
      }
      return records.get(data.idempotencyKey);
    };
    return {
      records,
      createScheduled: jest.fn(store("SCHEDULED")),
      createCancelled: jest.fn(store("CANCELLED")),
    };
  };

  const setup = ({ automations, booking = BOOKING, checkIn = CHECK_IN_ROW } = {}) => {
    const deliveryRepository = createDeliveries();
    const bookingContextRepository = {
      getBooking: jest.fn(async () => booking),
      getPropertyCheckIn: jest.fn(async () => checkIn),
    };
    const service = new SchedulingService({
      outboxRepository: {},
      deliveryRepository,
      bookingContextRepository,
      automationRepository: { listActiveForBooking: jest.fn(async () => automations) },
      clock: () => NOW,
    });
    return { service, deliveryRepository, bookingContextRepository };
  };

  const automation = (patch) => ({
    id: "automation-1",
    template: "Hi {{guestName}}",
    offsetAmount: 0,
    offsetUnit: "MINUTES",
    ...patch,
  });

  test("schedules a check-in automation from the booking dates", async () => {
    const { service, deliveryRepository } = setup({
      automations: [
        automation({
          triggerType: "CHECK_IN",
          offsetDirection: "BEFORE",
          offsetAmount: 3,
          offsetUnit: "DAYS",
          sendTime: "10:00",
        }),
      ],
    });

    const deliveries = await service.processEvent(EVENT);

    expect(deliveries).toHaveLength(1);
    expect(deliveryRepository.createScheduled).toHaveBeenCalledWith({
      automationId: "automation-1",
      bookingId: "booking-1",
      eventType: "CHECK_IN",
      eventVersion: 1,
      scheduledFor: Date.parse("2026-06-17T08:00:00Z"),
      templateSnapshot: "Hi {{guestName}}",
      idempotencyKey: "automation-1:booking-1:CHECK_IN:1",
    });
  });

  test("schedules a check-out automation after the check-out time of the property", async () => {
    const { service, deliveryRepository } = setup({
      automations: [
        automation({ triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 3, offsetUnit: "HOURS" }),
      ],
    });

    await service.processEvent(EVENT);

    expect(deliveryRepository.createScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CHECK_OUT",
        scheduledFor: Date.parse("2026-06-23T12:00:00Z"),
        idempotencyKey: "automation-1:booking-1:CHECK_OUT:1",
      })
    );
  });

  test("keeps the booking-paid schedule and idempotency key next to stay-date automations", async () => {
    const { service, deliveryRepository } = setup({
      automations: [
        automation({ id: "paid", triggerType: "BOOKING_PAID", offsetAmount: 2, offsetUnit: "HOURS" }),
        automation({ id: "legacy", offsetAmount: 1, offsetUnit: "DAYS" }),
        automation({ id: "stay", triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" }),
      ],
    });

    await service.processEvent(EVENT);

    expect(deliveryRepository.createScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "BOOKING_PAID",
        idempotencyKey: "paid:booking-1:BOOKING_PAID:1",
        scheduledFor: calculateScheduledFor(NOW, 2, "HOURS"),
      })
    );
    expect(deliveryRepository.createScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "BOOKING_PAID",
        idempotencyKey: "legacy:booking-1:BOOKING_PAID:1",
        scheduledFor: calculateScheduledFor(NOW, 1, "DAYS"),
      })
    );
    expect(deliveryRepository.records.has("stay:booking-1:CHECK_IN:1")).toBe(true);
  });

  test("schedules once when the event is processed twice", async () => {
    const { service, deliveryRepository } = setup({
      automations: [automation({ triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" })],
    });

    await service.processEvent(EVENT);
    await service.processEvent(EVENT);

    expect(deliveryRepository.records.size).toBe(1);
  });

  test("records a cancelled delivery with a clear reason when the send time has already passed", async () => {
    const { service, deliveryRepository } = setup({
      automations: [
        automation({
          triggerType: "CHECK_IN",
          offsetDirection: "BEFORE",
          offsetAmount: 30,
          offsetUnit: "DAYS",
          sendTime: "10:00",
        }),
      ],
    });

    const deliveries = await service.processEvent(EVENT);

    expect(deliveryRepository.createScheduled).not.toHaveBeenCalled();
    expect(deliveryRepository.createCancelled).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CHECK_IN",
        scheduledFor: Date.parse("2026-05-21T08:00:00Z"),
        idempotencyKey: "automation-1:booking-1:CHECK_IN:1",
      }),
      "Send time had already passed when the booking was paid."
    );
    expect(deliveries).toEqual([expect.objectContaining({ status: "CANCELLED" })]);
  });

  test("schedules a send time that is still ahead and cancels one that is behind", async () => {
    const { service, deliveryRepository } = setup({
      automations: [automation({ triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" })],
      booking: { ...BOOKING, arrivaldate: Date.parse("2026-06-01T00:00:00Z") },
    });

    await service.processEvent(EVENT);
    expect(deliveryRepository.createScheduled).toHaveBeenCalled();

    const later = setup({
      automations: [automation({ triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" })],
      booking: { ...BOOKING, arrivaldate: Date.parse("2026-05-31T00:00:00Z") },
    });
    await later.service.processEvent(EVENT);
    expect(later.deliveryRepository.createCancelled).toHaveBeenCalled();
  });

  test("a rule that cannot be calculated is cancelled and the other automations still schedule", async () => {
    const { service, deliveryRepository } = setup({
      automations: [
        automation({ id: "broken", triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 1, offsetUnit: "WEEKS" }),
        automation({ id: "fine", triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 1, offsetUnit: "DAYS" }),
        automation({ id: "paid", triggerType: "BOOKING_PAID", offsetAmount: 1, offsetUnit: "HOURS" }),
      ],
    });

    const deliveries = await service.processEvent(EVENT);

    expect(deliveryRepository.createCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "broken:booking-1:CHECK_IN:1" }),
      "Send time could not be calculated."
    );
    expect(deliveryRepository.records.has("fine:booking-1:CHECK_OUT:1")).toBe(true);
    expect(deliveryRepository.records.has("paid:booking-1:BOOKING_PAID:1")).toBe(true);
    expect(deliveries).toHaveLength(3);
  });

  test("loads the property times once, and only when a stay-date automation exists", async () => {
    const stay = setup({
      automations: [
        automation({ id: "a", triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" }),
        automation({ id: "b", triggerType: "CHECK_OUT", offsetDirection: "AFTER", sendTime: "10:00" }),
      ],
    });
    await stay.service.processEvent(EVENT);
    expect(stay.bookingContextRepository.getPropertyCheckIn).toHaveBeenCalledTimes(1);
    expect(stay.bookingContextRepository.getPropertyCheckIn).toHaveBeenCalledWith("property-1");

    const paidOnly = setup({ automations: [automation({ triggerType: "BOOKING_PAID", offsetAmount: 1, offsetUnit: "HOURS" })] });
    await paidOnly.service.processEvent(EVENT);
    expect(paidOnly.bookingContextRepository.getPropertyCheckIn).not.toHaveBeenCalled();
  });

  test("uses the fallback times when the property has no check-in row", async () => {
    const { service, deliveryRepository } = setup({
      automations: [automation({ triggerType: "CHECK_IN", offsetDirection: "AFTER" })],
      checkIn: null,
    });

    await service.processEvent(EVENT);

    expect(deliveryRepository.createScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledFor: Date.parse("2026-06-20T13:00:00Z") })
    );
  });

  test("does not schedule anything for a booking that is not paid", async () => {
    const { service, deliveryRepository } = setup({
      automations: [automation({ triggerType: "CHECK_IN", offsetDirection: "AFTER", sendTime: "10:00" })],
      booking: { ...BOOKING, status: "Cancelled" },
    });

    expect(await service.processEvent(EVENT)).toEqual([]);
    expect(deliveryRepository.createScheduled).not.toHaveBeenCalled();
    expect(deliveryRepository.createCancelled).not.toHaveBeenCalled();
  });
});

