import MessageService from "./messageService.js";

describe("MessageService internal automated Domits delivery", () => {
  test("reuses the exact booking thread and creates one idempotent message", async () => {
    const realtimePublisher = jest.fn();
    const service = new MessageService({ realtimePublisher });
    const existingThread = {
      id: "thread-booking-1",
      hostId: "host-1",
      guestId: "guest-1",
      propertyId: "property-1",
      bookingId: "booking-1",
      platform: "DOMITS",
    };
    service.bookingRepository = {
      getBookingById: jest.fn(async () => ({
        id: "booking-1",
        hostid: "host-1",
        guestid: "guest-1",
        property_id: "property-1",
        status: "Paid",
      })),
    };
    service.threadRepository = {
      findThreadByBookingId: jest.fn(async () => existingThread),
      getThreadById: jest.fn(async () => existingThread),
      createThread: jest.fn(),
      updateThreadActivity: jest.fn(),
    };
    let existingMessage = null;
    service.messageRepository = {
      findByAutomationDeliveryId: jest.fn(async () => existingMessage),
      createAutomatedMessageIfEligible: jest.fn(async (data) => {
        existingMessage = { id: "message-1", ...data };
        return { message: existingMessage, created: true };
      }),
    };
    const context = {
      deliveryId: "delivery-1",
      automationId: "automation-1",
      bookingId: "booking-1",
      hostId: "host-1",
      propertyId: "property-1",
      content: "Welcome Taylor",
    };

    const first = await service.sendAutomatedDomitsMessage(context);
    const second = await service.sendAutomatedDomitsMessage(context);

    expect(first.response.threadId).toBe("thread-booking-1");
    expect(second.response).toMatchObject({ id: "message-1", reused: true });
    expect(service.threadRepository.createThread).not.toHaveBeenCalled();
    expect(service.messageRepository.createAutomatedMessageIfEligible).toHaveBeenCalledTimes(1);
    expect(service.messageRepository.createAutomatedMessageIfEligible).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-booking-1",
        senderId: "host-1",
        recipientId: "guest-1",
        automationDeliveryId: "delivery-1",
      })
    );
    expect(realtimePublisher).toHaveBeenCalledTimes(1);
  });

  test("rejects a spoofed automation host before creating a message", async () => {
    const service = new MessageService({ realtimePublisher: jest.fn() });
    service.bookingRepository = {
      getBookingById: jest.fn(async () => ({
        id: "booking-1",
        hostid: "host-1",
        guestid: "guest-1",
        property_id: "property-1",
        status: "Paid",
      })),
    };
    service.messageRepository = {
      findByAutomationDeliveryId: jest.fn(async () => null),
      createAutomatedMessageIfEligible: jest.fn(),
    };
    service.threadRepository = {
      findThreadByBookingId: jest.fn(),
      createThread: jest.fn(),
    };

    await expect(service.sendAutomatedDomitsMessage({
      deliveryId: "delivery-1",
      automationId: "automation-1",
      bookingId: "booking-1",
      hostId: "host-spoofed",
      propertyId: "property-1",
      content: "Welcome Taylor",
    })).rejects.toMatchObject({ statusCode: 403 });

    expect(service.threadRepository.findThreadByBookingId).not.toHaveBeenCalled();
    expect(service.messageRepository.createAutomatedMessageIfEligible).not.toHaveBeenCalled();
  });

  test("treats a stored message as sent when post-insert side effects fail", async () => {
    const service = new MessageService({
      realtimePublisher: jest.fn(async () => {
        throw new Error("websocket unavailable");
      }),
    });
    service.bookingRepository = {
      getBookingById: jest.fn(async () => ({
        id: "booking-1",
        hostid: "host-1",
        guestid: "guest-1",
        property_id: "property-1",
        status: "Paid",
      })),
    };
    service.threadRepository = {
      findThreadByBookingId: jest.fn(async () => ({ id: "thread-1" })),
      updateThreadActivity: jest.fn(async () => {
        throw new Error("thread activity unavailable");
      }),
    };
    service.messageRepository = {
      findByAutomationDeliveryId: jest.fn(async () => null),
      createAutomatedMessageIfEligible: jest.fn(async (data) => ({
        message: { id: "message-1", ...data },
        created: true,
      })),
    };

    const result = await service.sendAutomatedDomitsMessage({
      deliveryId: "delivery-1",
      automationId: "automation-1",
      bookingId: "booking-1",
      hostId: "host-1",
      propertyId: "property-1",
      content: "Welcome Taylor",
    });

    expect(result.statusCode).toBe(201);
    expect(result.response).toMatchObject({
      id: "message-1",
      diagnostic: "Message stored; post-insert side effects incomplete: thread activity, realtime publish.",
    });
    expect(service.messageRepository.createAutomatedMessageIfEligible).toHaveBeenCalledTimes(1);
  });

  test("does not create a message when final database eligibility is lost", async () => {
    const realtimePublisher = jest.fn();
    const service = new MessageService({ realtimePublisher });
    service.bookingRepository = {
      getBookingById: jest.fn(async () => ({
        id: "booking-1",
        hostid: "host-1",
        guestid: "guest-1",
        property_id: "property-1",
        status: "Paid",
      })),
    };
    service.threadRepository = {
      findThreadByBookingId: jest.fn(async () => ({ id: "thread-1" })),
      updateThreadActivity: jest.fn(),
    };
    service.messageRepository = {
      findByAutomationDeliveryId: jest.fn(async () => null),
      createAutomatedMessageIfEligible: jest.fn(async () => ({ message: null, created: false })),
    };

    await expect(service.sendAutomatedDomitsMessage({
      deliveryId: "delivery-1",
      automationId: "automation-1",
      bookingId: "booking-1",
      hostId: "host-1",
      propertyId: "property-1",
      content: "Welcome Taylor",
    })).rejects.toMatchObject({ statusCode: 403 });

    expect(service.threadRepository.updateThreadActivity).not.toHaveBeenCalled();
    expect(realtimePublisher).not.toHaveBeenCalled();
  });
});
