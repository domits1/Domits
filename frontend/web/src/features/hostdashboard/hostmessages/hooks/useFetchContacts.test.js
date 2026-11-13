/**
 * @jest-environment jsdom
 */

import React from "react";
import PropTypes from "prop-types";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import useFetchContacts from "./useFetchContacts";
import { getAccessToken, getIdToken } from "../../../../services/getAccessToken";
import { fetchUserProfileById, getEmptyUserProfile } from "../../services/fetchUserProfileById";
import fetchBookingDetailsAndAccommodation from "../utils/FetchBookingDetails";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
  getIdToken: jest.fn(),
}));

jest.mock("../../services/fetchUserProfileById", () => ({
  fetchUserProfileById: jest.fn(),
  getEmptyUserProfile: jest.fn((userId) => ({
    userId,
    givenName: userId ? `Unknown ${userId}` : "Unknown",
    profileImage: null,
  })),
}));

jest.mock("../utils/FetchBookingDetails", () => ({
  __esModule: true,
  default: jest.fn(async ({ propertyId }) => ({
    accoImage: null,
    bookingStatus: null,
    arrivalDate: null,
    departureDate: null,
    propertyId: propertyId || null,
    propertyTitle: null,
  })),
}));

const Harness = ({ userId = "host-1", role = "host" }) => {
  const { contacts, pendingContacts, loading } = useFetchContacts(userId, role);

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="contacts">
        {contacts
          .map(
            (contact) =>
              `${contact.threadId || "legacy"}:${contact.partnerId}:${contact.platform}:${contact.unreadCount ?? "none"}`
          )
          .join("|")}
      </div>
      <div data-testid="pending">{pendingContacts.length}</div>
    </div>
  );
};

Harness.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  role: PropTypes.string,
};

const NamesHarness = () => {
  const { contacts } = useFetchContacts("host-1", "host");

  return <div data-testid="names">{contacts.map((contact) => `${contact.partnerId}=${contact.givenName}`).join("|")}</div>;
};

const LabelsHarness = () => {
  const { contacts } = useFetchContacts("host-1", "host");

  return <div data-testid="labels">{contacts.map((contact) => `${contact.threadId}=${contact.channelLabel}`).join("|")}</div>;
};

const okJson = (payload) => ({
  ok: true,
  json: async () => payload,
});

describe("useFetchContacts history merging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getIdToken.mockResolvedValue("host-token-1");
    getAccessToken.mockReturnValue("host-access-token-1");
    fetchUserProfileById.mockImplementation(async (userId) => ({
      ...getEmptyUserProfile(userId),
      givenName: `Profile ${userId}`,
    }));

    globalThis.fetch = jest.fn(async (url) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/threads")) {
        return okJson([
          {
            id: "external-thread-1",
            hostId: "host-1",
            guestId: "+31612345678",
            propertyId: null,
            bookingId: null,
            platform: "WHATSAPP",
            externalThreadId: "wa-thread-1",
            integrationAccountId: "integration-1",
            unreadCount: 4,
          },
        ]);
      }

      if (requestUrl.includes("/messages")) {
        return okJson([
          {
            id: "message-1",
            senderId: "+31612345678",
            recipientId: "host-1",
            content: "Old WhatsApp message",
            createdAt: "2026-06-01T10:00:00.000Z",
          },
        ]);
      }

      if (requestUrl.includes("FetchContacts")) {
        return okJson({
          body: JSON.stringify({
            accepted: [
              {
                userId: "legacy-guest-1",
                hostId: "host-1",
                propertyId: "property-1",
                Status: "accepted",
              },
            ],
            pending: [],
          }),
        });
      }

      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("host keeps old legacy conversations alongside external unified threads", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("contacts")).toHaveTextContent("external-thread-1:+31612345678:WHATSAPP:4");
    expect(screen.getByTestId("contacts")).toHaveTextContent("legacy:legacy-guest-1:DOMITS");
    expect(screen.getByTestId("pending")).toHaveTextContent("0");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/threads"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer host-token-1" }),
      })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("FetchContacts"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hostID: "host-1" }),
      })
    );

    expect(fetchBookingDetailsAndAccommodation).toHaveBeenCalledWith(
      expect.objectContaining({ token: "host-access-token-1" })
    );
  });

  test.each([
    ["the booking guest name when the thread has one", { guestName: "Tst Domits" }, "Tst Domits"],
    ["a name label when the thread has no guest name", {}, "Channex guest"],
  ])("shows a Channex guest with %s, not the guest id as a phone number", async (_label, threadPatch, expectedName) => {
    const channexGuestId = "CHANNEX_GUEST:e8731e65-851c-41ec-b786-4d604d8d7f67";
    const fetchUnifiedData = globalThis.fetch.getMockImplementation();
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes("/threads")) {
        return okJson([
          {
            id: "channex-thread-1",
            hostId: "host-1",
            guestId: channexGuestId,
            propertyId: "property-1",
            bookingId: "booking-1",
            platform: "CHANNEX",
            externalThreadId: "channex-message-thread-1",
            integrationAccountId: "integration-2",
            unreadCount: 1,
            ...threadPatch,
          },
        ]);
      }
      return fetchUnifiedData(url);
    });

    render(<NamesHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("names")).toHaveTextContent(`${channexGuestId}=${expectedName}`);
    });
    expect(screen.getByTestId("names")).not.toHaveTextContent("+8731658514178646048767");
    expect(fetchUserProfileById).not.toHaveBeenCalledWith(channexGuestId);
  });

  test.each([
    ["the Channex code BookingCom as Booking.com", "BookingCom", "Booking.com"],
    ["an unknown source as it is", "Airbnb", "Airbnb"],
    ["Channex when the thread has no booking source", undefined, "Channex"],
  ])("labels a Channex conversation with %s", async (_label, bookingSource, expectedLabel) => {
    const fetchUnifiedData = globalThis.fetch.getMockImplementation();
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes("/threads")) {
        return okJson([
          {
            id: "channex-thread-1",
            hostId: "host-1",
            guestId: "CHANNEX_GUEST:channex-booking-1",
            propertyId: "property-1",
            bookingId: "booking-1",
            platform: "CHANNEX",
            bookingSource,
          },
        ]);
      }
      return fetchUnifiedData(url);
    });

    render(<LabelsHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("labels")).toHaveTextContent(`channex-thread-1=${expectedLabel}`);
    });
  });

  test("keeps formatting WhatsApp guests as phone numbers", async () => {
    render(<NamesHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("names")).toHaveTextContent("+31612345678=+31 6 1234 5678");
    });
  });
});
