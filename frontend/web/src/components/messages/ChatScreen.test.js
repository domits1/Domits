/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChatScreen from "./ChatScreen";
import { getMessageCapabilities } from "./messageCapabilities";

const mockSendMessage = jest.fn();
const mockRetryMessage = jest.fn();
const mockFetchMessages = jest.fn();
let mockMessagesByThread = {};

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");
jest.mock("./MessageToast", () => () => <div data-testid="message-toast" />);

jest.mock("../../features/hostdashboard/hostmessages/hooks/useAuth", () => ({
  useAuth: () => ({ accessToken: "access-token-1" }),
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useSendMessage", () => ({
  useSendMessage: () => ({
    sendMessage: mockSendMessage,
    retryMessage: mockRetryMessage,
    sending: false,
  }),
}));

jest.mock("../../features/hostdashboard/hostmessages/hooks/useFetchMessages", () => ({
  useFetchMessages: () => ({
    fetchMessages: mockFetchMessages,
    messagesByRecipient: {},
    messagesByThread: mockMessagesByThread,
  }),
}));

jest.mock("../../features/hostdashboard/hostmessages/components/chatUploadAttachment", () => {
  const PropTypes = require("prop-types");

  function MockChatUploadAttachment({ onUploadComplete }) {
    return (
      <button type="button" onClick={() => onUploadComplete("https://example.com/photo.jpg")}>
        Attach
      </button>
    );
  }

  MockChatUploadAttachment.propTypes = {
    onUploadComplete: PropTypes.func.isRequired,
  };

  return MockChatUploadAttachment;
});

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
    mockMessagesByThread = {};
    mockSendMessage.mockResolvedValue({ success: true, saved: { id: "message-1", threadId: "thread-1" } });
  });

  const renderChatScreen = (props = {}) =>
    render(
      <ChatScreen
        userId="guest-1"
        contactId="host-1"
        contactName="Reservation Host"
        propertyId="property-1"
        bookingId="booking-1"
        dashboardType="guest"
        capabilities={getMessageCapabilities("guest")}
        {...props}
      />
    );

  test("keeps the reservation details folded above the input when there is no details panel", () => {
    renderChatScreen();

    const reservationDetails = screen.getByRole("group");
    expect(reservationDetails).not.toHaveAttribute("open");
    expect(within(reservationDetails).getByText("Reservation details")).toBeInTheDocument();
    expect(within(reservationDetails).getByTestId("booking-tab")).toHaveAttribute("data-booking-id", "booking-1");
  });

  test("leaves the reservation details out of the chat when the details panel shows them", () => {
    renderChatScreen({ bookingInDetailsPanel: true });

    expect(screen.queryByTestId("booking-tab")).not.toBeInTheDocument();
  });

  const typeAndSend = (text) => {
    fireEvent.change(screen.getByPlaceholderText("Type a message"), { target: { value: text } });
    fireEvent.click(screen.getByTitle("Send"));
  };

  test("fetches and sends guest messages with bookingId and bearer-token context", async () => {
    renderChatScreen();

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

    typeAndSend("Hello host");

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

  test("optimistic outgoing message shows pending status before the server responds", async () => {
    let resolveSend;
    mockSendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    renderChatScreen();
    typeAndSend("Hello host");

    await waitFor(() => {
      expect(screen.getByText("…", { selector: ".message-status", exact: true })).toBeInTheDocument();
    });

    resolveSend({ success: true, saved: { id: "message-1", threadId: "thread-1", deliveryStatus: "sent" } });

    await waitFor(() => {
      expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
    });
  });

  test("preserves the deliveryStatus returned by the send response", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      saved: { id: "message-1", threadId: "thread-1", deliveryStatus: "sent" },
    });

    renderChatScreen();
    typeAndSend("Hello host");

    await waitFor(() => {
      expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
    });
  });

  test("keeps a message the server saved as failed and marks it as failed", async () => {
    mockSendMessage.mockResolvedValue({
      success: false,
      error: "UnifiedMessaging /send failed: 502",
      saved: { id: "message-1", threadId: "thread-1", deliveryStatus: "failed" },
    });

    renderChatScreen();
    typeAndSend("Hello host");

    await waitFor(() => {
      expect(screen.getByText("!", { selector: ".message-status", exact: true })).toBeInTheDocument();
    });
    expect(screen.getByText("Hello host", { selector: ".message-text" })).toBeInTheDocument();
    expect(screen.getByTestId("message-toast")).toBeInTheDocument();
  });

  test("keeps a message the server did not save as failed instead of removing it", async () => {
    mockSendMessage.mockResolvedValue({ success: false, error: "network error" });

    renderChatScreen();
    typeAndSend("Hello host");

    await waitFor(() => {
      expect(screen.getByTestId("message-toast")).toBeInTheDocument();
    });
    expect(screen.getByText("Hello host", { selector: ".message-text" })).toBeInTheDocument();
    expect(screen.getByText("!", { selector: ".message-status", exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  describe("retry of a failed reply", () => {
    const failedHistoryMessage = {
      id: "message-1",
      userId: "host-1",
      senderId: "host-1",
      recipientId: "guest-1",
      threadId: "thread-1",
      text: "Hello guest",
      content: "Hello guest",
      createdAt: "2026-01-01T10:00:00.000Z",
      deliveryStatus: "failed",
      platform: "CHANNEX",
    };

    const renderHostThread = () => {
      mockMessagesByThread = { "thread-1": [failedHistoryMessage] };
      return render(
        <ChatScreen
          userId="host-1"
          contactId="guest-1"
          contactName="Guest"
          threadId="thread-1"
          platform="CHANNEX"
          dashboardType="host"
          capabilities={getMessageCapabilities("host")}
        />
      );
    };

    test("offers Retry on a failed message loaded from history", () => {
      renderHostThread();

      expect(screen.getByText("!", { selector: ".message-status", exact: true })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    test("retries the saved message by id and shows it as sent without sending a new one", async () => {
      mockRetryMessage.mockResolvedValue({ success: true, saved: { id: "message-1", deliveryStatus: "sent" } });
      renderHostThread();

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
      });
      expect(mockRetryMessage).toHaveBeenCalledWith("message-1");
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
      expect(screen.getAllByText("Hello guest", { selector: ".message-text" })).toHaveLength(1);
    });

    test("shows failed again with the toast when the retry fails", async () => {
      mockRetryMessage.mockResolvedValue({
        success: false,
        error: "UnifiedMessaging /send failed: 502",
        saved: { id: "message-1", deliveryStatus: "failed" },
      });
      renderHostThread();

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByTestId("message-toast")).toBeInTheDocument();
      });
      expect(screen.getByText("!", { selector: ".message-status", exact: true })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).not.toBeDisabled();
    });

    test("shows pending with a disabled button while the retry runs and sends once on a double click", async () => {
      let resolveRetry;
      mockRetryMessage.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          })
      );
      renderHostThread();

      const button = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("…", { selector: ".message-status", exact: true })).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
      expect(mockRetryMessage).toHaveBeenCalledTimes(1);

      resolveRetry({ success: true, saved: { id: "message-1", deliveryStatus: "sent" } });
      await waitFor(() => {
        expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
      });
    });

    test("hides an unsent failed message in another conversation and still retries it to the original guest", async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: false, error: "network error" })
        .mockResolvedValueOnce({ success: true, saved: { id: "message-2", deliveryStatus: "sent" } });
      const screenProps = {
        userId: "host-1",
        contactName: "Guest",
        dashboardType: "host",
        capabilities: getMessageCapabilities("host"),
      };
      const { rerender } = render(<ChatScreen {...screenProps} contactId="guest-a" />);
      typeAndSend("Hello guest A");
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      });

      rerender(<ChatScreen {...screenProps} contactId="guest-b" />);

      expect(screen.queryByText("Hello guest A", { selector: ".message-text" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

      rerender(<ChatScreen {...screenProps} contactId="guest-a" />);
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
      });
      expect(mockSendMessage.mock.calls[1][0]).toBe("guest-a");
    });

    test("sends a message that was never saved as a new message and replaces the failed one", async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: false, error: "network error" })
        .mockResolvedValueOnce({
          success: true,
          saved: { id: "message-2", threadId: "thread-1", deliveryStatus: "sent" },
        });
      renderChatScreen();
      typeAndSend("Hello host");
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByText("✓", { selector: ".message-status", exact: true })).toBeInTheDocument();
      });
      expect(mockRetryMessage).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(mockSendMessage.mock.calls[1].slice(0, 3)).toEqual(mockSendMessage.mock.calls[0].slice(0, 3));
      expect(screen.getAllByText("Hello host", { selector: ".message-text" })).toHaveLength(1);
    });
  });

  describe("attach button per channel", () => {
    const hostChat = ({ platform = "DOMITS", contactId = "guest-1", threadId = "thread-1" } = {}) => (
      <ChatScreen
        userId="host-1"
        contactId={contactId}
        contactName="Guest"
        propertyId="property-1"
        threadId={threadId}
        platform={platform}
        dashboardType="host"
        capabilities={getMessageCapabilities("host")}
      />
    );
    const renderHostChat = (platform) => render(hostChat({ platform }));

    test("drops an unsent attachment, but keeps the typed text, when the host opens another thread", () => {
      const { rerender } = render(hostChat());

      fireEvent.click(screen.getByRole("button", { name: "Attach" }));
      fireEvent.change(screen.getByPlaceholderText("Type a message"), { target: { value: "Draft reply" } });
      expect(screen.getByAltText("First attachment preview")).toBeInTheDocument();

      rerender(hostChat({ platform: "CHANNEX", contactId: "guest-2", threadId: "thread-2" }));

      expect(screen.queryByAltText("First attachment preview")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Type a message")).toHaveValue("Draft reply");
    });

    test("does not offer attachments on a Channex thread, which only supports text replies", () => {
      renderHostChat("CHANNEX");

      expect(screen.queryByRole("button", { name: "Attach" })).not.toBeInTheDocument();
    });

    test("still offers attachments on a Domits thread", () => {
      renderHostChat("DOMITS");

      expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument();
    });
  });
});
