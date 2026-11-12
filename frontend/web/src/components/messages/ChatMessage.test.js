/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatMessage from "./ChatMessage";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

const baseMessage = {
  userId: "host-1",
  text: "Hello",
  createdAt: "2026-01-01T10:00:00.000Z",
};

describe("ChatMessage delivery status indicator", () => {
  test.each([
    ["pending", "…"],
    ["sent", "✓"],
    ["delivered", "✓✓"],
    ["failed", "!"],
  ])("renders %s deliveryStatus correctly", (deliveryStatus, expectedText) => {
    render(<ChatMessage message={{ ...baseMessage, deliveryStatus }} userId="host-1" />);
    expect(screen.getByText(expectedText, { selector: ".message-status", exact: true })).toBeInTheDocument();
  });

  test.each([undefined, "unknown"])(
    "renders no status indicator for missing or unsupported deliveryStatus: %s",
    (deliveryStatus) => {
      render(<ChatMessage message={{ ...baseMessage, deliveryStatus }} userId="host-1" />);
      expect(screen.queryByText(() => true, { selector: ".message-status" })).not.toBeInTheDocument();
    }
  );

  test("does not render a status indicator for incoming messages", () => {
    render(
      <ChatMessage message={{ ...baseMessage, userId: "guest-1", deliveryStatus: "delivered" }} userId="host-1" />
    );
    expect(screen.queryByText(() => true, { selector: ".message-status" })).not.toBeInTheDocument();
  });
});

describe("ChatMessage retry button", () => {
  const renderMessage = (patch = {}, props = {}) => {
    const onRetry = jest.fn();
    const message = { ...baseMessage, id: "message-1", deliveryStatus: "failed", ...patch };
    render(<ChatMessage message={message} userId="host-1" onRetry={onRetry} {...props} />);
    return { onRetry, message };
  };

  test("shows Retry next to the failed indicator of an outgoing message and reports the click", () => {
    const { onRetry, message } = renderMessage();

    expect(screen.getByText("!", { selector: ".message-status", exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledWith(message);
  });

  test.each(["pending", "sent", "delivered", undefined])("shows no Retry for an outgoing %s message", (status) => {
    renderMessage({ deliveryStatus: status });

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  test("shows no Retry for a failed incoming message", () => {
    renderMessage({ userId: "guest-1" });

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  test("shows no Retry when the parent offers no retry handler", () => {
    render(<ChatMessage message={{ ...baseMessage, deliveryStatus: "failed" }} userId="host-1" />);

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  test("while retrying, shows pending and a disabled Retry button", () => {
    const { onRetry } = renderMessage({}, { isRetrying: true });

    expect(screen.getByText("…", { selector: ".message-status", exact: true })).toBeInTheDocument();
    expect(screen.queryByText("!", { selector: ".message-status", exact: true })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Retry" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
