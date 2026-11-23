import DeliveryWorker from "../worker/deliveryWorker.js";

const createHarness = ({
  automationStatus = "ACTIVE",
  bookingStatus = "Paid",
  initialDeliveryStatus = "SCHEDULED",
  beforeAuthorize = null,
  sendOutcomes = null,
  sendError = null,
  template = "Hi {{guestName}}, welcome to {{propertyName}} from {{checkInDate}} to {{checkOutDate}}.",
  checkIn = { checkInFrom: "15:00:00", checkOutTill: "11:00:00" },
  location = { street: "Keizersgracht", housenumber: 12, housenumberextension: null, postalcode: "1015 CJ", city: "Amsterdam" },
  guests = 2,
  automation = {},
  scheduledFor = 1_000,
  arrival = Date.UTC(2026, 5, 20),
  departure = Date.UTC(2026, 5, 23),
} = {}) => {
  let currentAutomationStatus = automationStatus;
  let currentBookingStatus = bookingStatus;
  let currentArrival = arrival;
  const delivery = {
    id: "delivery-1",
    automationId: "automation-1",
    bookingId: "booking-1",
    scheduledFor,
    status: initialDeliveryStatus,
    templateSnapshot: template,
  };
  const deliveryRepository = {
    delivery,
    listDue: jest.fn(async () => (["SCHEDULED", "PROCESSING"].includes(delivery.status) ? [delivery] : [])),
    claim: jest.fn(async () => {
      if (!["SCHEDULED", "PROCESSING"].includes(delivery.status)) return false;
      delivery.status = "PROCESSING";
      return true;
    }),
    authorizeSend: jest.fn(async (request) => {
      if (beforeAuthorize) {
        await beforeAuthorize({
          pauseAutomation: () => { currentAutomationStatus = "PAUSED"; },
          cancelBooking: () => { currentBookingStatus = "Cancelled"; },
          moveArrival: (value) => { currentArrival = value; },
        });
      }
      return (
        currentAutomationStatus === "ACTIVE" &&
        currentBookingStatus === "Paid" &&
        request.arrivalDate === currentArrival &&
        request.departureDate === departure
      );
    }),
    reschedule: jest.fn(async (_id, nextScheduledFor) =>
      Object.assign(delivery, { status: "SCHEDULED", scheduledFor: nextScheduledFor })
    ),
    markSent: jest.fn(async (_id, patch) => Object.assign(delivery, patch, {
      status: "SENT",
      failureReason: patch.diagnostic || null,
    })),
    markFailed: jest.fn(async (_id, reason) => Object.assign(delivery, { status: "FAILED", failureReason: reason })),
    markCancelled: jest.fn(async (_id, reason) => Object.assign(delivery, { status: "CANCELLED", failureReason: reason })),
  };
  let sendAttempt = 0;
  const unifiedMessagingClient = {
    sendAutomatedDomitsMessage: jest.fn(async () => {
      if (sendOutcomes) {
        const outcome = sendOutcomes[Math.min(sendAttempt, sendOutcomes.length - 1)];
        sendAttempt += 1;
        if (outcome instanceof Error) throw outcome;
        return outcome;
      }
      if (sendError) throw sendError;
      return { messageId: "message-1", threadId: "thread-1" };
    }),
  };
  const worker = new DeliveryWorker({
    deliveryRepository,
    automationRepository: {
      getById: jest.fn(async () => ({
        id: "automation-1",
        hostId: "host-1",
        propertyId: "property-1",
        status: currentAutomationStatus,
        ...automation,
      })),
    },
    bookingContextRepository: {
      getBookingContext: jest.fn(async () => ({
        booking: {
          id: "booking-1",
          hostid: "host-1",
          guestid: "guest-1",
          property_id: "property-1",
          guestname: "Taylor",
          arrivaldate: currentArrival,
          departuredate: departure,
          guests,
          status: currentBookingStatus,
        },
        property: { id: "property-1", title: "Canal Loft" },
        checkIn,
        location,
      })),
    },
    unifiedMessagingClient,
  });
  return { worker, deliveryRepository, unifiedMessagingClient };
};

describe("AutomatedMessaging delivery worker", () => {
  test("duplicate worker execution sends once and stores the message ID", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness();
    await worker.processDue({ now: 2_000 });
    await worker.processDue({ now: 2_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.delivery).toMatchObject({ status: "SENT", messageId: "message-1" });
  });

  test("paused automation does not send", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({ automationStatus: "PAUSED" });
    await worker.processDue({ now: 2_000 });
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("cancelled booking does not send", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({ bookingStatus: "Cancelled" });
    await worker.processDue({ now: 2_000 });
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("automation paused after claim but before final authorization does not send", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({
      beforeAuthorize: async ({ pauseAutomation }) => pauseAutomation(),
    });

    await worker.processDue({ now: 2_000 });

    expect(deliveryRepository.authorizeSend).toHaveBeenCalledTimes(1);
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("booking cancelled after claim but before final authorization does not send", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({
      beforeAuthorize: async ({ cancelBooking }) => cancelBooking(),
    });

    await worker.processDue({ now: 2_000 });

    expect(deliveryRepository.authorizeSend).toHaveBeenCalledTimes(1);
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("stale processing delivery can be reclaimed and sent once", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({
      initialDeliveryStatus: "PROCESSING",
    });

    await worker.processDue({ now: 2_000 });

    expect(deliveryRepository.claim).toHaveBeenCalledTimes(1);
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.delivery.status).toBe("SENT");
  });

  test("retry reconciles an existing message and stores its ID without a duplicate", async () => {
    const firstAttempt = new Error("Lambda response lost after insert");
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({
      sendOutcomes: [
        firstAttempt,
        {
          messageId: "message-existing",
          threadId: "thread-1",
          reused: true,
          diagnostic: "Existing automated message reconciled.",
        },
      ],
    });

    await worker.processDue({ now: 2_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(2);
    expect(deliveryRepository.delivery).toMatchObject({
      status: "SENT",
      messageId: "message-existing",
      failureReason: "Existing automated message reconciled.",
    });
  });

  describe("new variables", () => {
    const TEMPLATE =
      "Check-in {{checkInTime}}, check-out {{checkOutTime}}. {{propertyAddress}} in {{propertyCity}} for {{numberOfGuests}} guests.";

    test("sends the rendered check-in time, check-out time, address, city and number of guests", async () => {
      const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({ template: TEMPLATE });

      await worker.processDue({ now: 2_000 });

      expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
      expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Check-in 15:00, check-out 11:00. Keizersgracht 12, 1015 CJ in Amsterdam for 2 guests.",
        })
      );
      expect(deliveryRepository.delivery).toMatchObject({ status: "SENT" });
    });

    test.each([
      ["a property with no check-in row", { checkIn: null }, "checkInTime, checkOutTime"],
      ["a property with no location", { location: null }, "propertyAddress, propertyCity"],
      ["a booking without a number of guests", { guests: null }, "numberOfGuests"],
    ])("does not send for %s and says which values are missing", async (_label, harnessPatch, missing) => {
      const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({
        template: TEMPLATE,
        ...harnessPatch,
      });

      const results = await worker.processDue({ now: 2_000 });

      expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
      expect(deliveryRepository.authorizeSend).not.toHaveBeenCalled();
      expect(deliveryRepository.delivery).toMatchObject({ status: "FAILED", failureReason: `Missing values: ${missing}` });
      expect(results).toEqual([expect.objectContaining({ status: "FAILED", failureReason: `Missing values: ${missing}` })]);
    });

    test("sends a template that does not use the missing value", async () => {
      const { worker, unifiedMessagingClient } = createHarness({
        template: "Welcome, {{guestName}}. Check-out {{checkOutTime}}.",
        location: null,
      });

      await worker.processDue({ now: 2_000 });

      expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
    });

    test("names only the values the template uses and that are missing, in the order of the template", async () => {
      const { worker, deliveryRepository } = createHarness({
        template: "{{propertyCity}} {{guestName}} {{checkInTime}}",
        checkIn: null,
        location: null,
      });

      await worker.processDue({ now: 2_000 });

      expect(deliveryRepository.delivery.failureReason).toBe("Missing values: propertyCity, checkInTime");
    });
  });

  test("a template with an unsupported variable fails with the generic reason", async () => {
    const { worker, deliveryRepository } = createHarness({ template: "Hi {{wifiPassword}}" });

    await worker.processDue({ now: 2_000 });

    expect(deliveryRepository.delivery).toMatchObject({
      status: "FAILED",
      failureReason: "Approved template values are missing.",
    });
  });

  test("failed send stores a safe failure status", async () => {
    const error = new Error("secret provider detail");
    error.code = "DOMITS_DIRECT_DELIVERY_FAILED";
    const { worker, deliveryRepository } = createHarness({ sendError: error });
    await worker.processDue({ now: 2_000 });
    expect(deliveryRepository.delivery).toMatchObject({ status: "FAILED", failureReason: "Domits Direct delivery failed." });
  });
});

describe("AutomatedMessaging delivery worker, stay-date safety", () => {
  const HOUR_MS = 60 * 60 * 1000;
  const STAY_AUTOMATION = {
    triggerType: "CHECK_IN",
    offsetDirection: "BEFORE",
    offsetAmount: 3,
    offsetUnit: "DAYS",
    sendTime: "10:00",
  };
  const PLANNED = Date.parse("2026-06-17T08:00:00Z");
  const stayHarness = (options = {}) =>
    createHarness({ automation: STAY_AUTOMATION, scheduledFor: PLANNED, ...options });

  test("sends when the dates are unchanged and checks the dates it used before sending", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness();

    await worker.processDue({ now: PLANNED + 60_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.authorizeSend).toHaveBeenCalledWith(
      expect.objectContaining({
        arrivalDate: Date.UTC(2026, 5, 20),
        departureDate: Date.UTC(2026, 5, 23),
      })
    );
    expect(deliveryRepository.delivery.status).toBe("SENT");
  });

  test("still sends exactly 6 hours after the planned time", async () => {
    const { worker, unifiedMessagingClient } = stayHarness();

    await worker.processDue({ now: PLANNED + 6 * HOUR_MS });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
  });

  test("cancels when it is more than 6 hours late and never sends", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness();

    await worker.processDue({ now: PLANNED + 6 * HOUR_MS + 1 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery).toMatchObject({ status: "CANCELLED", failureReason: "Send time has passed." });
  });

  test("reschedules instead of sending when the stay moved later and the new time is ahead", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness({
      arrival: Date.UTC(2026, 5, 25),
      departure: Date.UTC(2026, 5, 28),
    });

    const [result] = await worker.processDue({ now: PLANNED + 60_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.authorizeSend).not.toHaveBeenCalled();
    expect(deliveryRepository.reschedule).toHaveBeenCalledWith("delivery-1", Date.parse("2026-06-22T08:00:00Z"));
    expect(deliveryRepository.delivery).toMatchObject({
      status: "SCHEDULED",
      scheduledFor: Date.parse("2026-06-22T08:00:00Z"),
    });
    expect(result).toEqual({ id: "delivery-1", status: "RESCHEDULED" });
  });

  test("cancels when the stay moved earlier so that the send time is already behind", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness({
      arrival: Date.UTC(2026, 5, 18),
      departure: Date.UTC(2026, 5, 21),
    });

    await worker.processDue({ now: PLANNED + 60_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.reschedule).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery).toMatchObject({
      status: "CANCELLED",
      failureReason: "Stay dates changed and the send time has passed.",
    });
  });

  test("cancels when the booking is no longer paid", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness({ bookingStatus: "Cancelled" });

    await worker.processDue({ now: PLANNED + 60_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("cancels with a clear reason when the stored rule cannot be calculated", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness({
      automation: { ...STAY_AUTOMATION, offsetUnit: "WEEKS" },
    });

    await worker.processDue({ now: PLANNED + 60_000 });

    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery).toMatchObject({
      status: "CANCELLED",
      failureReason: "Send time could not be calculated.",
    });
  });

  test("does not send when the dates change between the check and the final authorization", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = stayHarness({
      beforeAuthorize: async ({ moveArrival }) => moveArrival(Date.UTC(2026, 5, 21)),
    });

    await worker.processDue({ now: PLANNED + 60_000 });

    expect(deliveryRepository.authorizeSend).toHaveBeenCalledTimes(1);
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).not.toHaveBeenCalled();
    expect(deliveryRepository.delivery.status).toBe("CANCELLED");
  });

  test("a booking-paid delivery is not held to the stay-date rules, however late it is", async () => {
    const { worker, deliveryRepository, unifiedMessagingClient } = createHarness({ scheduledFor: 1_000 });

    await worker.processDue({ now: 1_000 + 3 * 24 * HOUR_MS });

    expect(deliveryRepository.reschedule).not.toHaveBeenCalled();
    expect(unifiedMessagingClient.sendAutomatedDomitsMessage).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.authorizeSend).toHaveBeenCalledWith(
      expect.objectContaining({ arrivalDate: Date.UTC(2026, 5, 20), departureDate: Date.UTC(2026, 5, 23) })
    );
  });
});

