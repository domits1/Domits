import {
  AccommodationRequestError,
  getAccommodationByPropertyId,
  getAccommodationWithPublicFallback,
  getGuestBookingDetailsByBookingId,
  getHostBookingDetails,
  sendUnifiedMessage,
  markThreadRead,
  markThreadUnread,
  closeThread,
} from "./messagingService";

describe("messagingService unified REST client", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
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

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/send",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access-token-1",
        },
      })
    );

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
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
    globalThis.fetch.mockClear();

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

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("sendUnifiedMessage attaches the saved failed message when /send returns 502", async () => {
    const savedFailedMessage = {
      id: "message-1",
      threadId: "thread-1",
      content: "Hello guest",
      deliveryStatus: "failed",
      errorCode: "THREAD_NOT_FOUND",
    };
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => JSON.stringify(savedFailedMessage),
    });

    await expect(
      sendUnifiedMessage({
        senderId: "host-1",
        recipientId: "CHANNEX_GUEST:booking-1",
        content: "Hello guest",
        platform: "CHANNEX",
        token: "access-token-1",
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining("502"),
      savedMessage: savedFailedMessage,
    });
  });

  test("sendUnifiedMessage does not attach a saved message when the error body is not a failed message", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    });

    const error = await sendUnifiedMessage({
      senderId: "host-1",
      recipientId: "host-2",
      content: "Hello",
      token: "access-token-1",
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error.savedMessage).toBeUndefined();
  });

  test("markThreadRead posts to /threads/{id}/read with the Cognito ID token", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ threadId: "thread-1", updated: 2 }) });

    const result = await markThreadRead("thread-1", "id-token-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads/thread-1/read",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer id-token-1",
        },
      })
    );
    expect(result).toEqual({ threadId: "thread-1", updated: 2 });
  });

  test("markThreadRead does not call the API without a token", async () => {
    globalThis.fetch.mockClear();

    await expect(markThreadRead("thread-1", null)).rejects.toMatchObject({
      code: "AUTH_TOKEN_REQUIRED",
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("markThreadUnread posts to /threads/{id}/unread with the Cognito ID token", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ threadId: "thread-1", updated: 1 }) });

    const result = await markThreadUnread("thread-1", "id-token-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads/thread-1/unread",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer id-token-1",
        },
      })
    );
    expect(result).toEqual({ threadId: "thread-1", updated: 1 });
  });

  test("closeThread posts to /threads/{id}/close with the Cognito ID token", async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ threadId: "thread-1", status: "CLOSED" }) });

    const result = await closeThread("thread-1", "id-token-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads/thread-1/close",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer id-token-1",
        },
      })
    );
    expect(result).toEqual({ threadId: "thread-1", status: "CLOSED" });
  });

  test("closeThread does not call the API without a token", async () => {
    globalThis.fetch.mockClear();

    await expect(closeThread("thread-1", null)).rejects.toMatchObject({
      code: "AUTH_TOKEN_REQUIRED",
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("getGuestBookingDetailsByBookingId loads the exact authorized booking", async () => {
    globalThis.fetch
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
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
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
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
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
    globalThis.fetch.mockResolvedValueOnce({
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

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("getHostBookingDetails does not randomly choose between multiple legacy matches", async () => {
    globalThis.fetch.mockResolvedValueOnce({
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

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("messagingService accommodation requests", () => {
  const LISTING = { property: { title: "Sea Cabin" } };

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => LISTING });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("getAccommodationByPropertyId sends the token it is given", async () => {
    await getAccommodationByPropertyId("hostDashboard/single", "property-1", "host-token-1");

    expect(globalThis.fetch.mock.calls[0][1].headers).toEqual({ Authorization: "host-token-1" });
  });

  test("getAccommodationByPropertyId sends no Authorization header without a token", async () => {
    await expect(getAccommodationByPropertyId("bookingEngine/listingDetails", "property-1", null)).resolves.toEqual(
      LISTING
    );

    expect(globalThis.fetch.mock.calls[0][0]).toContain("/bookingEngine/listingDetails?property=property-1");
    expect(globalThis.fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });

  const failed = (status) => ({ ok: false, status, json: async () => "Request failed." });
  const listed = (payload) => ({ ok: true, status: 200, json: async () => payload });
  const PUBLIC_LISTING = { property: { title: "Sea Cabin", hostId: "other-host" }, location: { city: "Haarlem" } };

  test("a 403 from the host listing loads the public listing without the token", async () => {
    globalThis.fetch.mockResolvedValueOnce(failed(403)).mockResolvedValueOnce(listed(PUBLIC_LISTING));

    await expect(
      getAccommodationWithPublicFallback("hostDashboard/single", "property-1", "host-token-1")
    ).resolves.toEqual(PUBLIC_LISTING);

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("/hostDashboard/single?property=property-1");
    expect(globalThis.fetch.mock.calls[0][1].headers).toEqual({ Authorization: "host-token-1" });
    expect(globalThis.fetch.mock.calls[1][0]).toContain("/bookingEngine/listingDetails?property=property-1");
    expect(globalThis.fetch.mock.calls[1][1].headers).not.toHaveProperty("Authorization");
  });

  test.each([401, 404, 500, 503])("a %i from the host listing is not retried on the public listing", async (status) => {
    globalThis.fetch.mockResolvedValueOnce(failed(status));

    const request = getAccommodationWithPublicFallback("hostDashboard/single", "property-1", "host-token-1");

    await expect(request).rejects.toBeInstanceOf(AccommodationRequestError);
    await expect(request).rejects.toMatchObject({ status });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("a network error on the host listing is not retried on the public listing", async () => {
    const networkError = new TypeError("Failed to fetch");
    globalThis.fetch.mockRejectedValueOnce(networkError);

    const request = getAccommodationWithPublicFallback("hostDashboard/single", "property-1", "host-token-1");

    await expect(request).rejects.toBe(networkError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("a 403 from the public listing is not retried", async () => {
    globalThis.fetch.mockResolvedValueOnce(failed(403));

    await expect(
      getAccommodationWithPublicFallback("bookingEngine/listingDetails", "property-1", null)
    ).rejects.toMatchObject({ status: 403 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("the public listing failure is reported when the fallback fails too", async () => {
    globalThis.fetch.mockResolvedValueOnce(failed(403)).mockResolvedValueOnce(failed(404));

    await expect(
      getAccommodationWithPublicFallback("hostDashboard/single", "property-1", "host-token-1")
    ).rejects.toMatchObject({ status: 404, message: "Failed to fetch accommodation" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("getHostBookingDetails shows the public listing when the host listing answers 403", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            {
              id: "property-1",
              res: {
                response: [{ id: "booking-1", hostid: "host-1", guestid: "guest-1", property_id: "property-1" }],
              },
            },
          ]),
      })
      .mockResolvedValueOnce(failed(403))
      .mockResolvedValueOnce(listed(PUBLIC_LISTING));

    const result = await getHostBookingDetails({
      hostId: "host-1",
      guestId: "guest-1",
      propertyId: "property-1",
      token: "host-token-1",
      accommodationEndpoint: "hostDashboard/single",
    });

    expect(result.bookingDetails.id).toBe("booking-1");
    expect(result.accommodation).toEqual(PUBLIC_LISTING);
    expect(globalThis.fetch.mock.calls[2][0]).toContain("/bookingEngine/listingDetails?property=property-1");
    expect(globalThis.fetch.mock.calls[2][1].headers).not.toHaveProperty("Authorization");
  });
});
