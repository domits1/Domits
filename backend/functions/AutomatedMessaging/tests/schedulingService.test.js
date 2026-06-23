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
