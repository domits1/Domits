/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactList from "./ContactList";
import { getMessageCapabilities } from "./messageCapabilities";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import { markThreadRead } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { getIdToken } from "../../services/getAccessToken";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

jest.mock("../../features/hostdashboard/hostmessages/services/messagingService", () => ({
  __esModule: true,
  markThreadRead: jest.fn(),
}));

jest.mock("../../services/getAccessToken", () => ({
  __esModule: true,
  getIdToken: jest.fn(),
}));

const contacts = [
  {
    partnerId: "host-1",
    hostId: "host-1",
    guestId: "guest-1",
    givenName: "Reservation Host",
    threadId: "thread-1",
    propertyId: "property-1",
    bookingId: "booking-1",
    latestMessage: { text: "See you soon", createdAt: "2026-06-01T10:00:00.000Z" },
  },
];

describe("ContactList message capabilities", () => {
  test("guest inbox hides host-only controls and passes bookingId on contact click", () => {
    const onContactClick = jest.fn();

    render(
      <ContactList
        userId="guest-1"
        dashboardType="guest"
        contacts={contacts}
        pendingContacts={[]}
        loading={false}
        setContacts={jest.fn()}
        onContactClick={onContactClick}
        onCloseChat={jest.fn()}
        onNewMessage={jest.fn()}
        capabilities={getMessageCapabilities("guest")}
      />
    );

    expect(screen.queryByTitle("Search")).not.toBeInTheDocument();
    expect(screen.queryByTitle("New message")).not.toBeInTheDocument();
    expect(screen.queryByText("All")).not.toBeInTheDocument();
    expect(screen.queryByText("Unread")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText("Reservation Host"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Reservation Host"));
    expect(onContactClick).toHaveBeenCalledWith(
      "host-1",
      "Reservation Host",
      undefined,
      "thread-1",
      "property-1",
      "booking-1",
      null,
      null,
      "DOMITS",
      null,
      null
    );
  });

  test("host inbox keeps creation, search, sort, tabs, and context menu controls", () => {
    render(
      <ContactList
        userId="host-1"
        dashboardType="host"
        contacts={contacts}
        pendingContacts={[]}
        loading={false}
        setContacts={jest.fn()}
        onContactClick={jest.fn()}
        onCloseChat={jest.fn()}
        onNewMessage={jest.fn()}
        capabilities={getMessageCapabilities("host")}
      />
    );

    expect(screen.getByTitle("Search")).toBeInTheDocument();
    expect(screen.getByTitle("New message")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText("Reservation Host"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("ContactList realtime unread sync", () => {
  const baseContact = {
    partnerId: "+31612345678",
    hostId: "host-1",
    guestId: "+31612345678",
    givenName: "Zoro",
    threadId: "thread-1",
    propertyId: "property-1",
    unreadCount: 0,
    latestMessage: { text: "Old message", createdAt: "2026-06-01T09:00:00.000Z" },
  };

  const renderWithSocket = ({ contacts: initialContacts, wsMessage, activeThreadId = null, activeContactId = null }) => {
    const setContacts = jest.fn();

    render(
      <WebSocketContext.Provider value={{ messages: wsMessage ? [wsMessage] : [] }}>
        <ContactList
          userId="host-1"
          dashboardType="host"
          contacts={initialContacts}
          pendingContacts={[]}
          loading={false}
          setContacts={setContacts}
          onContactClick={jest.fn()}
          onCloseChat={jest.fn()}
          onNewMessage={jest.fn()}
          activeThreadId={activeThreadId}
          activeContactId={activeContactId}
          capabilities={getMessageCapabilities("host")}
        />
      </WebSocketContext.Provider>
    );

    return { setContacts };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getIdToken.mockResolvedValue("id-token-1");
    markThreadRead.mockResolvedValue({ threadId: "thread-1", updated: 1 });
  });

  test("incoming realtime message to an inactive thread increments unreadCount", () => {
    const { setContacts } = renderWithSocket({
      contacts: [baseContact],
      wsMessage: {
        userId: "+31612345678",
        senderId: "+31612345678",
        recipientId: "host-1",
        text: "New message from Zoro",
        threadId: "thread-1",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
      activeThreadId: "thread-2",
    });

    const updater = setContacts.mock.calls[0][0];
    const updated = updater([baseContact]);

    expect(updated[0].unreadCount).toBe(1);
    expect(updated[0].latestMessage.text).toBe("New message from Zoro");
    expect(markThreadRead).not.toHaveBeenCalled();
  });

  test("current user's own outgoing message updates latestMessage but never increments unreadCount", () => {
    const contactWithUnread = { ...baseContact, unreadCount: 2 };
    const { setContacts } = renderWithSocket({
      contacts: [contactWithUnread],
      wsMessage: {
        userId: "host-1",
        senderId: "host-1",
        recipientId: "+31612345678",
        text: "My reply",
        threadId: "thread-1",
        createdAt: "2026-06-01T10:05:00.000Z",
      },
      activeThreadId: "thread-2",
    });

    const updater = setContacts.mock.calls[0][0];
    const updated = updater([contactWithUnread]);

    expect(updated[0].unreadCount).toBe(2);
    expect(updated[0].latestMessage.text).toBe("My reply");
    expect(markThreadRead).not.toHaveBeenCalled();
  });

  test("incoming message to the active thread resets unreadCount to 0 and marks the thread read", async () => {
    const contactWithUnread = { ...baseContact, unreadCount: 3 };
    const { setContacts } = renderWithSocket({
      contacts: [contactWithUnread],
      wsMessage: {
        userId: "+31612345678",
        senderId: "+31612345678",
        recipientId: "host-1",
        text: "Are you there?",
        threadId: "thread-1",
        createdAt: "2026-06-01T10:10:00.000Z",
      },
      activeThreadId: "thread-1",
    });

    const updater = setContacts.mock.calls[0][0];
    const updated = updater([contactWithUnread]);

    expect(updated[0].unreadCount).toBe(0);
    expect(updated[0].latestMessage.text).toBe("Are you there?");

    await waitFor(() => {
      expect(markThreadRead).toHaveBeenCalledWith("thread-1", "id-token-1");
    });
  });

  test("switching the active conversation without a new message does not reprocess the realtime message", () => {
    const wsMessage = {
      userId: "+31612345678",
      senderId: "+31612345678",
      recipientId: "host-1",
      text: "New message from Zoro",
      threadId: "thread-1",
      createdAt: "2026-06-01T10:00:00.000Z",
    };
    const setContacts = jest.fn();
    const wsValue = { messages: [wsMessage] };

    const renderProps = (activeThreadId) => (
      <WebSocketContext.Provider value={wsValue}>
        <ContactList
          userId="host-1"
          dashboardType="host"
          contacts={[baseContact]}
          pendingContacts={[]}
          loading={false}
          setContacts={setContacts}
          onContactClick={jest.fn()}
          onCloseChat={jest.fn()}
          onNewMessage={jest.fn()}
          activeThreadId={activeThreadId}
          activeContactId={null}
          capabilities={getMessageCapabilities("host")}
        />
      </WebSocketContext.Provider>
    );

    const { rerender } = render(renderProps("thread-2"));
    expect(setContacts).toHaveBeenCalledTimes(1);

    rerender(renderProps("thread-1"));
    expect(setContacts).toHaveBeenCalledTimes(1);
    expect(markThreadRead).not.toHaveBeenCalled();
  });

  test("brand-new incoming contact starts at unreadCount 1 when inactive", () => {
    const { setContacts } = renderWithSocket({
      contacts: [],
      wsMessage: {
        userId: "+31699999999",
        senderId: "+31699999999",
        recipientId: "host-1",
        text: "Hello, is this available?",
        threadId: "thread-9",
        createdAt: "2026-06-01T10:15:00.000Z",
      },
      activeThreadId: "thread-1",
    });

    const updater = setContacts.mock.calls[0][0];
    const updated = updater([]);

    expect(updated[0].unreadCount).toBe(1);
    expect(updated[0].latestMessage.text).toBe("Hello, is this available?");
    expect(markThreadRead).not.toHaveBeenCalled();
  });
});
