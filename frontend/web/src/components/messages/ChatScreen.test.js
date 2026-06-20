/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatScreen from "./ChatScreen";
import { getMessageCapabilities } from "./messageCapabilities";

const mockSendMessage = jest.fn();
const mockFetchMessages = jest.fn();

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");
jest.mock("./MessageToast", () => () => <div data-testid="message-toast" />);

jest.mock("../../features/hostdashboard/hostmessages/hooks/useAuth", () => ({
  useAuth: () => ({ accessToken: "access-token-1" }),
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useSendMessage", () => ({
  useSendMessage: () => ({
    sendMessage: mockSendMessage,
    sending: false,
  }),
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useFetchMessages", () => ({
  useFetchMessages: () => ({
    fetchMessages: mockFetchMessages,
    messagesByRecipient: {},
    messagesByThread: {},
  }),
}));

jest.mock("../../features/hostdashboard/hostmessages/components/chatUploadAttachment", () => () => (
  <button type="button">Attach</button>
));

jest.mock("./BookingTab", () => {
  const PropTypes = require("prop-types");

  function MockBookingTab({ bookingId }) {
    return <div data-testid="booking-tab" data-booking-id={bookingId || ""} />;
  }

  MockBookingTab.propTypes = {
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  return MockBookingTab;
});

describe("ChatScreen reservation messaging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMessage.mockResolvedValue({ success: true, saved: { id: "message-1", threadId: "thread-1" } });
  });

  test("fetches and sends guest messages with bookingId and bearer-token context", async () => {
    render(
      <ChatScreen
        userId="guest-1"
        contactId="host-1"
        contactName="Reservation Host"
        propertyId="property-1"
        bookingId="booking-1"
        dashboardType="guest"
        capabilities={getMessageCapabilities("guest")}
      />
    );

    expect(mockFetchMessages).toHaveBeenCalledWith(
      "host-1",
      null,
      expect.objectContaining({
        bookingId: "booking-1",
        propertyId: "property-1",
        accessToken: "access-token-1",
      })
    );
    expect(screen.getByTestId("booking-tab")).toHaveAttribute("data-booking-id", "booking-1");

    fireEvent.change(screen.getByPlaceholderText("Type a message"), { target: { value: "Hello host" } });
    fireEvent.click(screen.getByTitle("Send"));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        "host-1",
        "Hello host",
        [],
        expect.objectContaining({
          bookingId: "booking-1",
          propertyId: "property-1",
          hostId: "host-1",
          guestId: "guest-1",
          platform: "DOMITS",
        })
      );
    });
  });
});
