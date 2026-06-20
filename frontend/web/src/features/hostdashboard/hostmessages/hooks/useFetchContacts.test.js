/**
 * @jest-environment jsdom
 */

import React from "react";
import PropTypes from "prop-types";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import useFetchContacts from "./useFetchContacts";
import { getAccessToken } from "../../../../services/getAccessToken";
import { fetchUserProfileById, getEmptyUserProfile } from "../../services/fetchUserProfileById";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
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
        {contacts.map((contact) => `${contact.threadId || "legacy"}:${contact.partnerId}:${contact.platform}`).join("|")}
      </div>
      <div data-testid="pending">{pendingContacts.length}</div>
    </div>
  );
};

Harness.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  role: PropTypes.string,
};

const okJson = (payload) => ({
  ok: true,
  json: async () => payload,
});

describe("useFetchContacts history merging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("host-token-1");
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

    expect(screen.getByTestId("contacts")).toHaveTextContent("external-thread-1:+31612345678:WHATSAPP");
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
  });
});
