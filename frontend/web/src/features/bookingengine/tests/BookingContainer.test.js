import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import BookingContainer from "../listingdetails/views/bookingContainer";

const mockReservePress = jest.fn();

jest.mock("../listingdetails/views/dateSelectionContainer", () => () => <div>Date selection</div>);
jest.mock("../listingdetails/views/guestSelectionContainer", () => () => <div>Guest selection</div>);
jest.mock("../listingdetails/components/pricing", () => () => <div>Pricing</div>);
jest.mock("../listingdetails/hooks/handleReservePress", () => () => mockReservePress);
jest.mock("../../hostdashboard/hostmessages/context/AuthContext", () => ({
  UserProvider: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../hostdashboard/hostmessages/context/webSocketContext", () => ({
  WebSocketProvider: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../hostdashboard/hostmessages/hooks/useAuth", () => ({
  useAuth: () => ({ userId: "guest-1" }),
}));
jest.mock("../../../components/messages/ChatScreen", () => () => <div>Chat screen</div>);
jest.mock("../listingdetails/utils/dateAvailability", () => ({
  buildUnavailableDateSet: () => new Set(),
  hasUnavailableDateInStayRange: () => false,
  isUnavailableDate: () => false,
}));

jest.mock("../../../utils/policyDisplayUtils", () => ({
  getActiveCancellationPolicyId: jest.fn(() => null),
  parseCancellationPolicyString: jest.fn(() => null),
  parseCancellationPolicy: jest.fn(() => ({ type: undefined, summary: "Policy summary" })),
}));

describe("BookingContainer", () => {
  beforeEach(() => {
    mockReservePress.mockClear();
  });

  test("does not render undefined cancellation badge when policy type is missing", () => {
    render(
      <BookingContainer
        property={{ pricing: { roomRate: 120 }, rules: [] }}
        checkInDate="2026-06-01"
        checkOutDate="2026-06-03"
      />
    );

    expect(screen.queryByText(/undefined cancellation/i)).not.toBeInTheDocument();
  });

  test("does not call reserve handler when property id is missing", () => {
    render(
      <BookingContainer
        property={{ pricing: { roomRate: 120 }, property: {}, rules: [] }}
        checkInDate="2026-06-01"
        checkOutDate="2026-06-03"
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Reserve" })[0]);
    expect(mockReservePress).not.toHaveBeenCalled();
  });
});
