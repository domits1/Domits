/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Messages from "./Messages";

let mockContacts = [];

jest.mock("../../features/hostdashboard/hostmessages/context/AuthContext", () => ({
  UserProvider: ({ children }) => <>{children}</>,
  useUser: () => ({ userId: "guest-1", accessToken: "access-token-1" }),
}));

jest.mock("../../features/hostdashboard/hostmessages/context/webSocketContext", () => ({
  WebSocketProvider: ({ children }) => <>{children}</>,
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useAuth", () => ({
  useAuth: () => ({ userId: "guest-1", accessToken: "access-token-1" }),
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useFetchContacts", () => ({
  __esModule: true,
  default: () => ({
    contacts: mockContacts,
    pendingContacts: [],
    loading: false,
    setContacts: jest.fn(),
  }),
}));

jest.mock("./ContactList", () => (props) => (
  <div data-testid="contact-list">
    {(props.contacts || []).map((contact) => (
      <button
        key={contact.threadId || contact.partnerId}
        type="button"
        onClick={() =>
          props.onContactClick(
            contact.partnerId,
            contact.givenName,
            contact.profileImage,
            contact.threadId,
            contact.propertyId,
            contact.bookingId,
            contact.propertyTitle,
            contact.accoImage,
            contact.platform || "DOMITS",
            contact.integrationAccountId || null,
            contact.externalThreadId || null
          )
        }
      >
        {contact.givenName}
      </button>
    ))}
  </div>
));

jest.mock("./ChatScreen", () => (props) => (
  <div
    data-testid="chat-screen"
    data-contact-id={props.contactId || ""}
    data-thread-id={props.threadId || ""}
    data-booking-id={props.bookingId || ""}
    data-property-id={props.propertyId || ""}
  />
));

jest.mock("./NewContactModal", () => () => null);
jest.mock("./ListingPanel", () => () => <div data-testid="listing-panel" />);

const renderMessages = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/guestdashboard/messages" element={<Messages dashboardType="guest" />} />
      </Routes>
    </MemoryRouter>
  );

describe("Messages booking URL context", () => {
  beforeEach(() => {
    mockContacts = [
      {
        partnerId: "host-1",
        givenName: "Reservation Host",
        threadId: "thread-1",
        propertyId: "property-1",
        bookingId: "booking-1",
        propertyTitle: "Exact stay",
      },
    ];
  });

  test("selects the exact booking thread from a direct bookingId URL", async () => {
    renderMessages("/guestdashboard/messages?bookingId=booking-1");

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "host-1");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-thread-id", "thread-1");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-1");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-property-id", "property-1");
  });

  test("loads guest messages without booking context when the URL has no bookingId", () => {
    renderMessages("/guestdashboard/messages");

    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "");
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "");
  });

  test("uses router state only as a fallback when bookingId is absent from the URL", async () => {
    renderMessages({
      pathname: "/guestdashboard/messages",
      state: {
        messageContext: {
          contactId: "host-2",
          contactName: "State Host",
          threadId: "thread-2",
          propertyId: "property-2",
          bookingId: "booking-2",
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "host-2");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-2");
  });

  test("prefers the URL bookingId over stale router state", async () => {
    renderMessages({
      pathname: "/guestdashboard/messages",
      search: "?bookingId=booking-1",
      state: {
        messageContext: {
          contactId: "host-stale",
          contactName: "Stale Host",
          threadId: "thread-stale",
          propertyId: "property-stale",
          bookingId: "booking-stale",
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "booking-1");
    });
  });

  test("does not select a conversation for an unauthorized or missing bookingId", async () => {
    renderMessages("/guestdashboard/messages?bookingId=missing-booking");

    await waitFor(() => {
      expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-booking-id", "missing-booking");
    });
    expect(screen.getByTestId("chat-screen")).toHaveAttribute("data-contact-id", "");
  });
});
