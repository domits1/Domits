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

    const buildElement = (threadId) => (
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
          activeThreadId={threadId}
          activeContactId={activeContactId}
          capabilities={getMessageCapabilities("host")}
        />
      </WebSocketContext.Provider>
    );

    const { rerender: rerenderElement } = render(buildElement(activeThreadId));

    return {
      setContacts,
      rerender: (nextActiveThreadId) => rerenderElement(buildElement(nextActiveThreadId)),
    };
  };

  // processIncomingMessage may queue more than one setContacts update (e.g. an unrelated
  // hydration update alongside a mark-read confirmation), so replay every queued updater
  // in order to get the true final state, rather than assuming a fixed call index/count.
  const applyQueuedUpdates = (calls, initialState) =>
    calls.reduce((state, [updaterFn]) => updaterFn(state), initialState);

  const renderActiveThreadMessage = (contactWithUnread) =>
    renderWithSocket({
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

  test("incoming message to the active thread increments locally, then resets to 0 only once markThreadRead succeeds", async () => {
    const contactWithUnread = { ...baseContact, unreadCount: 3 };
    const { setContacts } = renderActiveThreadMessage(contactWithUnread);

    const firstUpdater = setContacts.mock.calls[0][0];
    const afterFirstUpdate = firstUpdater([contactWithUnread]);

    expect(afterFirstUpdate[0].unreadCount).toBe(4);
    expect(afterFirstUpdate[0].latestMessage.text).toBe("Are you there?");

    await waitFor(() => {
      expect(markThreadRead).toHaveBeenCalledWith("thread-1", "id-token-1");
    });

    await waitFor(() => {
      expect(applyQueuedUpdates(setContacts.mock.calls, [contactWithUnread])[0].unreadCount).toBe(0);
    });
  });

  test("markThreadRead failure does not leave unreadCount falsely at 0", async () => {
    markThreadRead.mockRejectedValue(new Error("network error"));

    const contactWithUnread = { ...baseContact, unreadCount: 3 };
    const { setContacts } = renderActiveThreadMessage(contactWithUnread);

    const firstUpdater = setContacts.mock.calls[0][0];
    const afterFirstUpdate = firstUpdater([contactWithUnread]);
    expect(afterFirstUpdate[0].unreadCount).toBe(4);

    await waitFor(() => {
      expect(markThreadRead).toHaveBeenCalledWith("thread-1", "id-token-1");
    });

    // Flush the rejected promise chain and any unrelated hydration update, then confirm
    // that across every queued updater, unreadCount was never reset to 0.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(applyQueuedUpdates(setContacts.mock.calls, [contactWithUnread])[0].unreadCount).toBe(4);
  });

  test("active-contact fallback without a threadId increments unreadCount and never calls markThreadRead", () => {
    const contactWithUnread = { ...baseContact, threadId: null, unreadCount: 1 };
    const { setContacts } = renderWithSocket({
      contacts: [contactWithUnread],
      wsMessage: {
        userId: "+31612345678",
        senderId: "+31612345678",
        recipientId: "host-1",
        text: "Legacy message, no threadId",
        threadId: null,
        createdAt: "2026-06-01T10:20:00.000Z",
      },
      activeThreadId: null,
      activeContactId: "+31612345678",
    });

    const updater = setContacts.mock.calls[0][0];
    const updated = updater([contactWithUnread]);

    expect(updated[0].unreadCount).toBe(2);
    expect(updated[0].latestMessage.text).toBe("Legacy message, no threadId");
    expect(markThreadRead).not.toHaveBeenCalled();
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

    const { setContacts, rerender } = renderWithSocket({
      contacts: [baseContact],
      wsMessage,
      activeThreadId: "thread-2",
    });
    expect(setContacts).toHaveBeenCalledTimes(1);

    rerender("thread-1");
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

describe("ContactList search filtering", () => {
  const contactsForSearch = [
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
    {
      partnerId: "guest-2",
      hostId: "host-1",
      guestId: "guest-2",
      givenName: "Zoro Roronoa",
      threadId: "thread-2",
      propertyId: "property-2",
      bookingId: "booking-42",
      latestMessage: { text: "Looking forward to it", createdAt: "2026-06-02T10:00:00.000Z" },
    },
  ];

  const renderForSearch = () =>
    render(
      <ContactList
        userId="host-1"
        dashboardType="host"
        contacts={contactsForSearch}
        pendingContacts={[]}
        loading={false}
        setContacts={jest.fn()}
        onContactClick={jest.fn()}
        onCloseChat={jest.fn()}
        onNewMessage={jest.fn()}
        capabilities={getMessageCapabilities("host")}
      />
    );

  test("host can search conversations by contact name", () => {
    renderForSearch();

    fireEvent.change(screen.getByPlaceholderText("Search or start new chat"), { target: { value: "Zoro" } });

    expect(screen.getByText("Zoro Roronoa")).toBeInTheDocument();
    expect(screen.queryByText("Reservation Host")).not.toBeInTheDocument();
  });

  test("host can search conversations by booking ID", () => {
    renderForSearch();

    fireEvent.change(screen.getByPlaceholderText("Search or start new chat"), { target: { value: "booking-42" } });

    expect(screen.getByText("Zoro Roronoa")).toBeInTheDocument();
    expect(screen.queryByText("Reservation Host")).not.toBeInTheDocument();
  });
});
