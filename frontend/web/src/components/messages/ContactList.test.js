/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactList from "./ContactList";
import { getMessageCapabilities } from "./messageCapabilities";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

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
