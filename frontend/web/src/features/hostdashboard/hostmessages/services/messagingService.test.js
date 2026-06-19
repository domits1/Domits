import { getGuestBookingDetailsByBookingId, getHostBookingDetails, sendUnifiedMessage } from "./messagingService";

describe("messagingService unified REST client", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "message-1", threadId: "thread-1" }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("sendUnifiedMessage sends bearer auth and bookingId", async () => {
    await sendUnifiedMessage({
      senderId: "guest-1",
      recipientId: "host-1",
      content: "Hello host",
      propertyId: "property-1",
      bookingId: "booking-1",
      token: "access-token-1",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/send",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access-token-1",
        },
      })
    );

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual(
      expect.objectContaining({
        senderId: "guest-1",
        recipientId: "host-1",
        propertyId: "property-1",
        bookingId: "booking-1",
        content: "Hello host",
      })
    );
  });

  test("sendUnifiedMessage does not call /send without a token", async () => {
    global.fetch.mockClear();

    await expect(
      sendUnifiedMessage({
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello host",
        bookingId: "booking-1",
        token: null,
      })
    ).rejects.toMatchObject({
      code: "AUTH_TOKEN_REQUIRED",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("getGuestBookingDetailsByBookingId loads the exact authorized booking", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            {
              id: "booking-1",
              guestid: "guest-1",
              hostid: "host-1",
              property_id: "property-1",
              status: "Paid",
            },
            {
              id: "booking-2",
              guestid: "guest-1",
              hostid: "host-1",
              property_id: "property-1",
              status: "Paid",
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ property: { title: "Exact stay" }, images: ["image.jpg"] }),
      });

    const result = await getGuestBookingDetailsByBookingId({
      bookingId: "booking-2",
      guestId: "guest-1",
      token: "raw-token-1",
    });

    expect(result.bookingDetails.id).toBe("booking-2");
    expect(result.accommodation.property.title).toBe("Exact stay");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("guestId=guest-1"),
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "raw-token-1",
        },
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("bookingId=booking-2"),
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "raw-token-1",
        },
      })
    );
  });

  test("getGuestBookingDetailsByBookingId rejects a booking owned by another guest", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify([
          {
            id: "booking-2",
            guestid: "guest-2",
            hostid: "host-1",
            property_id: "property-1",
            status: "Paid",
          },
        ]),
    });

    await expect(
      getGuestBookingDetailsByBookingId({
        bookingId: "booking-2",
        guestId: "guest-1",
        token: "raw-token-1",
      })
    ).rejects.toThrow("Booking not found.");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("getHostBookingDetails does not randomly choose between multiple legacy matches", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify([
          {
            id: "property-1",
            res: {
              response: [
                {
                  id: "booking-1",
                  hostid: "host-1",
                  guestid: "guest-1",
                  property_id: "property-1",
                },
                {
                  id: "booking-2",
                  hostid: "host-1",
                  guestid: "guest-1",
                  property_id: "property-1",
                },
              ],
            },
          },
        ]),
    });

    await expect(
      getHostBookingDetails({
        hostId: "host-1",
        guestId: "guest-1",
        propertyId: "property-1",
        token: "host-token-1",
      })
    ).rejects.toThrow("Multiple bookings match this host conversation; bookingId is required.");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
