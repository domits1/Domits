import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Auth } from "aws-amplify";
import { toast } from "react-toastify";
import ReservationDetails from "./ReservationDetails";
import { getGuestBookingPropertyDetails, getGuestBookings, updateBookingSpecialRequest } from "./services/bookingAPI";
import { fetchPropertySummaries } from "./services/propertySummaryService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    currentUserInfo: jest.fn(),
  },
}));
jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
// updateBookingSpecialRequest is not one of the page's own calls, but SpecialRequestsSection imports it
// from the same module, so the factory has to provide it too.
jest.mock("./services/bookingAPI", () => ({
  getGuestBookings: jest.fn(),
  getGuestBookingPropertyDetails: jest.fn(),
  cancelGuestBooking: jest.fn(),
  updateBookingSpecialRequest: jest.fn(),
}));
jest.mock("./services/propertySummaryService", () => ({
  fetchPropertySummaries: jest.fn(),
}));
// useEffectiveHostId reads the user context, whose provider is not what is under test here.
const mockUserContext = { role: "Traveler", isPOM: false, memberships: [], isLoading: false };
jest.mock("../auth/UserContext", () => ({
  useUser: () => mockUserContext,
}));

const RESERVATION_ROUTE = "/guestdashboard/reservation/booking-1";
const SPECIAL_REQUEST_ERROR = "Could not update your special request. Please try again.";

const booking = {
  id: "booking-1",
  paymentid: "payment-1",
  property_id: "property-1",
  status: "Paid",
  bookingtype: "direct",
  hostid: "host-1",
  guestname: "Test Guest",
  title: "Canal House",
  city: "Amsterdam",
  propertyImage: "https://images.test/canal-house.jpg",
  arrivaldate: Date.UTC(2027, 0, 10),
  departuredate: Date.UTC(2027, 0, 13),
  createdat: Date.UTC(2026, 9, 1),
};

// Shaped like the property details API: amenities as { amenityId }, house rules as { rule, value }.
const buildPropertyDetails = (overrides = {}) => ({
  property: { title: "Canal House" },
  location: { street: "Prinsengracht", houseNumber: "1", postalCode: "1015", city: "Amsterdam", country: "NL" },
  images: [],
  pricing: { roomRate: 100 },
  amenities: [{ amenityId: "1" }, { amenityId: "2" }],
  rules: [
    { rule: "ChildrenAllowed", value: false },
    { rule: "SmokingAllowed", value: false },
    { rule: "PetsAllowed", value: true },
    { rule: "Parties/EventsAllowed", value: false },
    { rule: "CancellationPolicy:Flexible", value: true },
  ],
  checkIn: { checkIn: { from: "15:00:00", till: "18:00:00" }, checkOut: { from: "11:00:00" } },
  customRules: [],
  ...overrides,
});

const renderReservation = () =>
  render(
    <MemoryRouter initialEntries={[RESERVATION_ROUTE]}>
      <Routes>
        <Route path="/guestdashboard/reservation/:reservationId" element={<ReservationDetails />} />
      </Routes>
    </MemoryRouter>
  );

const waitForReservation = () => screen.findByRole("heading", { level: 1, name: "Canal House" });

describe("ReservationDetails", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "guest-1" } });
    getGuestBookings.mockResolvedValue([booking]);
    getGuestBookingPropertyDetails.mockResolvedValue(buildPropertyDetails());
    fetchPropertySummaries.mockResolvedValue({});
  });

  describe("amenities and house rules", () => {
    test("renders the amenities from the API data and skips ids the catalogue does not know", async () => {
      getGuestBookingPropertyDetails.mockResolvedValue(
        buildPropertyDetails({ amenities: [{ amenityId: "1" }, { amenityId: "2" }, { amenityId: "no-such-amenity" }] })
      );

      renderReservation();
      await waitForReservation();

      expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
      expect(screen.getByText("Air conditioning")).toBeInTheDocument();
      expect(screen.queryByText("No amenities have been listed for this property.")).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("undefined");
    });

    test("renders the house rules from the API data, without the cancellation policy entry", async () => {
      renderReservation();
      await waitForReservation();

      expect(screen.getByText("Children not allowed")).toBeInTheDocument();
      expect(screen.getByText("Smoking not allowed")).toBeInTheDocument();
      expect(screen.getByText("Pets allowed")).toBeInTheDocument();
      expect(screen.getByText("Parties and Events not allowed")).toBeInTheDocument();
      // A cancellation policy is stored as a rule too, but it has its own section and is not a house rule.
      expect(screen.queryByText("Cancellation Policy: Flexible allowed")).not.toBeInTheDocument();
      expect(screen.queryByText("No additional house rules have been provided.")).not.toBeInTheDocument();
    });
  });

  describe("check-in line", () => {
    test("shows the window without seconds when both from and till exist", async () => {
      renderReservation();
      await waitForReservation();

      expect(screen.getByText("Check-in: 15:00–18:00")).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("undefined");
    });

    test("shows only the start when till is missing, never 'undefined'", async () => {
      getGuestBookingPropertyDetails.mockResolvedValue(
        buildPropertyDetails({ checkIn: { checkIn: { from: "15:00:00" }, checkOut: { from: "11:00:00" } } })
      );

      renderReservation();
      await waitForReservation();

      expect(screen.getByText("Check-in from 15:00")).toBeInTheDocument();
      expect(screen.queryByText(/^Check-in: /)).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("undefined");
    });

    test("shows the no-instructions line when there is no checkIn at all, never 'undefined'", async () => {
      getGuestBookingPropertyDetails.mockResolvedValue(buildPropertyDetails({ checkIn: undefined }));

      renderReservation();
      await waitForReservation();

      expect(screen.getByText("No additional check-in instructions have been shared yet.")).toBeInTheDocument();
      expect(screen.queryByText(/^Check-in( from|:) /)).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("undefined");
    });
  });

  describe("when the property details cannot be loaded", () => {
    test("still shows the reservation from the booking, with every section in its empty state", async () => {
      getGuestBookingPropertyDetails.mockRejectedValue(new Error("property details unavailable"));

      renderReservation();
      await waitForReservation();

      expect(screen.getByText("No amenities have been listed for this property.")).toBeInTheDocument();
      expect(screen.getByText("No additional house rules have been provided.")).toBeInTheDocument();
      expect(screen.getByText("No additional check-in instructions have been shared yet.")).toBeInTheDocument();
      expect(screen.getByText("No additional special instructions have been shared yet.")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("undefined");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Falling back to booking-only reservation details"),
        expect.any(Error)
      );
    });
  });

  describe("special request box", () => {
    const findBox = async () => {
      renderReservation();
      await waitForReservation();
      return {
        textarea: screen.getByRole("textbox"),
        saveButton: screen.getByRole("button", { name: "Save request" }),
      };
    };

    test("limits the text to 500 characters", async () => {
      const { textarea } = await findBox();

      expect(textarea).toHaveAttribute("maxlength", "500");
    });

    test("keeps Save disabled until the text changes, and again once the change is saved", async () => {
      const user = userEvent.setup();
      updateBookingSpecialRequest.mockResolvedValue({});
      const { textarea, saveButton } = await findBox();

      expect(saveButton).toBeDisabled();

      await user.type(textarea, "Extra pillows");
      expect(saveButton).toBeEnabled();

      await user.click(saveButton);
      await waitFor(() => expect(saveButton).toBeDisabled());
    });

    test("saves the request for this booking and shows a success toast", async () => {
      const user = userEvent.setup();
      updateBookingSpecialRequest.mockResolvedValue({});
      const { textarea, saveButton } = await findBox();

      await user.type(textarea, "Late check-in around 9pm");
      await user.click(saveButton);

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Special request updated."));
      expect(updateBookingSpecialRequest).toHaveBeenCalledWith("booking-1", "Late check-in around 9pm");
      expect(toast.error).not.toHaveBeenCalled();
    });

    test("shows an error toast when the API rejects, and lets the guest try again", async () => {
      const user = userEvent.setup();
      jest.spyOn(console, "error").mockImplementation(() => {});
      updateBookingSpecialRequest.mockRejectedValue(new Error("Update special request failed: 500"));
      const { textarea, saveButton } = await findBox();

      await user.type(textarea, "Extra pillows");
      await user.click(saveButton);

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SPECIAL_REQUEST_ERROR));
      expect(toast.success).not.toHaveBeenCalled();
      expect(saveButton).toBeEnabled();
      expect(textarea).toHaveValue("Extra pillows");
    });
  });
});
