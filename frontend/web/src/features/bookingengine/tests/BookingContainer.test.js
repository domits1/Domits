import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { LanguageContext } from "../../../context/LanguageContext.js";
import BookingContainer from "../listingdetails/views/bookingContainer";

const renderWithProviders = (ui) =>
  render(
    <LanguageContext.Provider value={{ language: "en" }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </LanguageContext.Provider>
  );

const mockReservePress = jest.fn();

jest.mock("../listingdetails/views/dateSelectionContainer", () => () => <div>Date selection</div>);
jest.mock("../listingdetails/views/guestSelectionContainer", () => () => <div>Guest selection</div>);
jest.mock("../listingdetails/components/pricing", () => () => <div>Pricing</div>);
jest.mock("../listingdetails/hooks/handleReservePress", () => () => mockReservePress);
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
    renderWithProviders(
      <BookingContainer
        property={{ pricing: { roomRate: 120 }, rules: [] }}
        checkInDate="2026-06-01"
        checkOutDate="2026-06-03"
      />
    );

    expect(screen.queryByText(/undefined cancellation/i)).not.toBeInTheDocument();
  });

  test("does not call reserve handler when property id is missing", () => {
    renderWithProviders(
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
