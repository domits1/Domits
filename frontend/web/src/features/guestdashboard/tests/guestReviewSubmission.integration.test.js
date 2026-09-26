import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GuestReviewForm from "../GuestReviewForm";
import ReservationDetails from "../ReservationDetails";
import useDashboardIdentity from "../../../hooks/useDashboardIdentity";
import { getGuestBookingPropertyDetails, getGuestBookings } from "../services/bookingAPI";
import { createReview } from "../services/reviewAPI";
import { fetchPropertySummaries } from "../services/propertySummaryService";

jest.mock("../../../hooks/useDashboardIdentity");
jest.mock("../services/bookingAPI");
jest.mock("../services/reviewAPI");
jest.mock("../services/propertySummaryService");
jest.mock("../utils/image", () => ({
  placeholderImage: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  normalizeImageUrl: jest.fn((value) => value || ""),
  resolveAccommodationImageUrl: jest.fn(() => null),
  resolvePrimaryAccommodationImageUrl: jest.fn(() => null),
}));
jest.mock("../../../utils/accommodationImage", () => ({
  placeholderImage: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  normalizeImageUrl: jest.fn((value) => value || ""),
  resolveAccommodationImageUrl: jest.fn(() => null),
  resolvePrimaryAccommodationImageUrl: jest.fn(() => null),
}));

jest.mock("../components/PropertyCard", () => function PropertyCard() {
  return <div data-testid="property-card" />;
});

jest.mock("../components/CheckInInstructions", () => function CheckInInstructions() {
  return <div data-testid="check-in-instructions" />;
});

jest.mock("../components/HouseRules", () => function HouseRules() {
  return <div data-testid="house-rules" />;
});

jest.mock("../components/CancellationPolicySection", () => ({
  __esModule: true,
  default: function CancellationPolicySection() {
    return <div data-testid="cancellation-policy" />;
  },
  resolveGuestCancellationPolicy: jest.fn(() => null),
}));

jest.mock("../components/PaymentSummary", () => function PaymentSummary() {
  return <div data-testid="payment-summary" />;
});

jest.mock("../components/BookingDetails", () => function BookingDetails() {
  return <div data-testid="booking-details" />;
});

jest.mock("../../../components/loaders/PulseBarsLoader", () => function PulseBarsLoader() {
  return <div>Loading reservation...</div>;
});

const completedBooking = {
  id: "booking-1",
  property_id: "property-1",
  hostid: "host-1",
  status: "Completed",
  arrivaldate: Date.parse("2026-08-01T00:00:00.000Z"),
  departuredate: Date.parse("2026-08-05T00:00:00.000Z"),
  guests: 2,
};

const upcomingBooking = {
  ...completedBooking,
  id: "booking-2",
  status: "Confirmed",
};

const propertyDetails = {
  property: {
    title: "Canal Apartment",
  },
  location: {
    city: "Amsterdam",
    country: "Netherlands",
  },
  host: {
    id: "host-1",
    givenName: "Mila",
  },
  images: [],
  pricing: {},
  rules: [],
  checkIn: {
    checkIn: { from: "15:00" },
    checkOut: { from: "11:00" },
  },
};

const renderWithRoutes = ({ initialEntry, reviewFormElement = <GuestReviewForm /> }) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/guestdashboard/reservation/:bookingId" element={<ReservationDetails />} />
        <Route path="/guestdashboard/reviews/new" element={reviewFormElement} />
        <Route path="/guestdashboard/bookings" element={<div>Bookings page</div>} />
        <Route path="/guestdashboard/reviews" element={<div>Review history</div>} />
      </Routes>
    </MemoryRouter>
  );
};

const clickFiveStarsFor = (label) => {
  const ratingGroup = screen.getByLabelText(label);
  fireEvent.click(ratingGroup.querySelector('button[aria-label="5 stars"]'));
};

const fillValidReviewForm = () => {
  clickFiveStarsFor("Overall rating");
  clickFiveStarsFor("Cleanliness rating");
  clickFiveStarsFor("Accuracy rating");
  clickFiveStarsFor("Communication rating");
  clickFiveStarsFor("Location rating");
  clickFiveStarsFor("Check-in rating");
  clickFiveStarsFor("Value rating");

  fireEvent.change(screen.getByLabelText("Review title"), {
    target: { value: "Wonderful stay" },
  });

  fireEvent.change(screen.getByLabelText("Written review"), {
    target: { value: "The apartment was clean, calm, and close to everything we needed." },
  });

  fireEvent.change(screen.getByLabelText("Private feedback"), {
    target: { value: "A second set of towels would be helpful." },
  });
};

describe("guest review submission integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useDashboardIdentity.mockReturnValue({
      userId: "guest-1",
      loading: false,
      error: "",
    });

    getGuestBookingPropertyDetails.mockResolvedValue(propertyDetails);
    fetchPropertySummaries.mockResolvedValue({});
    createReview.mockResolvedValue({
      review: {
        id: "review-1",
        status: "SUBMITTED",
      },
    });
  });

  it("lets a guest open and submit a review from an eligible completed reservation", async () => {
    getGuestBookings.mockResolvedValue([completedBooking]);

    renderWithRoutes({
      initialEntry: "/guestdashboard/reservation/booking-1",
    });

    const writeReviewButton = await screen.findByRole("button", {
      name: /write a review/i,
    });

    fireEvent.click(writeReviewButton);

    expect(await screen.findByRole("heading", { name: /review your stay/i })).toBeInTheDocument();
    expect(screen.getByText("Canal Apartment")).toBeInTheDocument();
    expect(screen.getByText(/hosted by mila/i)).toBeInTheDocument();
    expect(screen.getByText(/verified stay/i)).toBeInTheDocument();

    fillValidReviewForm();

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() => {
      expect(createReview).toHaveBeenCalledWith({
        bookingId: "booking-1",
        propertyId: "property-1",
        reviewType: "GUEST_TO_PROPERTY",
        overallRating: 5,
        title: "Wonderful stay",
        publicReview: "The apartment was clean, calm, and close to everything we needed.",
        privateFeedback: "A second set of towels would be helpful.",
        categoryRatings: {
          cleanliness: 5,
          accuracy: 5,
          communication: 5,
          location: 5,
          checkIn: 5,
          value: 5,
        },
        status: "SUBMITTED",
      });
    });

    expect(await screen.findByRole("heading", { name: /review submitted/i })).toBeInTheDocument();
  });

  it("does not show the review action for an ineligible non-completed reservation", async () => {
    getGuestBookings.mockResolvedValue([upcomingBooking]);

    renderWithRoutes({
      initialEntry: "/guestdashboard/reservation/booking-2",
    });

    await screen.findByTestId("property-card");

    expect(screen.queryByRole("button", { name: /write a review/i })).not.toBeInTheDocument();
    expect(createReview).not.toHaveBeenCalled();
  });

  it("blocks direct submission when reservation context is missing", async () => {
    renderWithRoutes({
      initialEntry: "/guestdashboard/reviews/new",
    });

    fillValidReviewForm();

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Missing booking information for this review.");
    expect(createReview).not.toHaveBeenCalled();
  });
});
