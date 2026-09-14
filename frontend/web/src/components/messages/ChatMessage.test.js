/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
