import DeliveryWorker from "../worker/deliveryWorker.js";

const createHarness = ({
  automationStatus = "ACTIVE",
  bookingStatus = "Paid",
  initialDeliveryStatus = "SCHEDULED",
  beforeAuthorize = null,
  sendOutcomes = null,
  sendError = null,
} = {}) => {
  let currentAutomationStatus = automationStatus;
  let currentBookingStatus = bookingStatus;
  const delivery = {
    id: "delivery-1",
    automationId: "automation-1",
    bookingId: "booking-1",
    scheduledFor: 1_000,
    status: initialDeliveryStatus,
    templateSnapshot: "Hi {{guestName}}, welcome to {{propertyName}} from {{checkInDate}} to {{checkOutDate}}.",
  };
  const deliveryRepository = {
    delivery,
    listDue: jest.fn(async () => (["SCHEDULED", "PROCESSING"].includes(delivery.status) ? [delivery] : [])),
    claim: jest.fn(async () => {
      if (!["SCHEDULED", "PROCESSING"].includes(delivery.status)) return false;
      delivery.status = "PROCESSING";
      return true;
    }),
    authorizeSend: jest.fn(async () => {
      if (beforeAuthorize) {
        await beforeAuthorize({
          pauseAutomation: () => { currentAutomationStatus = "PAUSED"; },
          cancelBooking: () => { currentBookingStatus = "Cancelled"; },
        });
      }
      return currentAutomationStatus === "ACTIVE" && currentBookingStatus === "Paid";
    }),
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
          arrivaldate: Date.UTC(2026, 5, 20),
          departuredate: Date.UTC(2026, 5, 23),
          status: currentBookingStatus,
        },
        property: { id: "property-1", title: "Canal Loft" },
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

  test("failed send stores a safe failure status", async () => {
    const error = new Error("secret provider detail");
    error.code = "DOMITS_DIRECT_DELIVERY_FAILED";
    const { worker, deliveryRepository } = createHarness({ sendError: error });
    await worker.processDue({ now: 2_000 });
    expect(deliveryRepository.delivery).toMatchObject({ status: "FAILED", failureReason: "Domits Direct delivery failed." });
  });
});
