import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ReservationDetails from "../../features/guestdashboard/ReservationDetails";
import { getGuestBookings, getGuestBookingPropertyDetails } from "../../features/guestdashboard/services/bookingAPI";
import { toast } from "react-toastify";

const mockNavigate = jest.fn();
let mockPath;
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPath }) }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("../../hooks/useDashboardIdentity", () => ({ __esModule: true,
  default: () => ({ userId: "guest-1", loading: false, error: null }) }));
jest.mock("../../features/guestdashboard/services/bookingAPI", () => ({
  getGuestBookings: jest.fn(), getGuestBookingPropertyDetails: jest.fn(), cancelGuestBooking: jest.fn(),
}));
jest.mock("../../features/guestdashboard/services/propertySummaryService", () => ({ fetchPropertySummaries: async () => ({}) }));
jest.mock("../../features/guestdashboard/components/PropertyCard", () => () => null);
jest.mock("../../features/guestdashboard/components/CheckInInstructions", () => () => null);
jest.mock("../../features/guestdashboard/components/HouseRules", () => () => null);
jest.mock("../../features/guestdashboard/components/PaymentSummary", () => () => null);
jest.mock("../../features/guestdashboard/components/BookingDetails", () => () => null);
jest.mock("../../features/guestdashboard/components/CancellationPolicySection", () => ({
  __esModule: true, default: () => null, resolveGuestCancellationPolicy: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPath = "/guestdashboard/reservation/booking-1";
  getGuestBookings.mockResolvedValue([{ id: "booking-1", paymentid: "payment-1", guestid: "guest-1",
    property_id: "property-1", title: "Lovely home", status: "Paid", arrivaldate: Date.now() - 86400000,
    departuredate: Date.now() - 60000, guests: 1 }]);
  getGuestBookingPropertyDetails.mockResolvedValue({ property: { title: "Lovely home" } });
});

it("opens the review form using Booking.id rather than the displayed reservation/payment number", async () => {
  render(<ReservationDetails />);
  fireEvent.click(await screen.findByRole("button", { name: "Leave a Review" }));
  expect(mockNavigate).toHaveBeenCalledWith("/review?bookingId=booking-1", { state: { propertyTitle: "Lovely home" } });
});

it("refuses to create a review link when only a legacy payment identifier exists", async () => {
  mockPath = "/guestdashboard/reservation/payment-1";
  getGuestBookings.mockResolvedValue([{ paymentid: "payment-1", guestid: "guest-1", property_id: "property-1",
    status: "Paid", departuredate: Date.now() - 60000 }]);
  render(<ReservationDetails />);
  fireEvent.click(await screen.findByRole("button", { name: "Leave a Review" }));
  expect(toast.error).toHaveBeenCalledWith("This reservation is missing a booking id.");
  expect(mockNavigate).not.toHaveBeenCalled();
});
