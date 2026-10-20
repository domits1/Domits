import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookingOverview from "../BookingOverview";
import FetchPropertyDetails from "../services/FetchPropertyDetails";

jest.mock("aws-amplify", () => ({
  Auth: { currentAuthenticatedUser: jest.fn().mockRejectedValue(new Error("not signed in")) },
}));
jest.mock("@stripe/stripe-js", () => ({ loadStripe: jest.fn() }));
jest.mock("@stripe/react-stripe-js", () => ({ Elements: ({ children }) => children }));
jest.mock("../views/SetupForm.js", () => () => null);
jest.mock("../components/ShareModal", () => () => null);
jest.mock("../CancellationPolicySection", () => () => null);
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));
jest.mock("../services/FetchPropertyDetails");

const PRICING = {
  title: "Canal House",
  city: "Amsterdam",
  country: "NL",
  images: [],
  roomRate: 100,
  cleaning: 10,
  differenceInDays: 3,
  platformFee: 30,
  total: 340,
  bookingType: "direct",
  rules: [],
};

// Midday UTC keeps the local calendar day stable in every timezone from UTC-12 to UTC+11.
const CHECK_IN_MS = Date.UTC(2027, 0, 10, 12);
const CHECK_OUT_MS = Date.UTC(2027, 0, 13, 12);

const renderOverview = (query) =>
  render(
    <MemoryRouter initialEntries={[`/bookingoverview?${query}`]}>
      <BookingOverview />
    </MemoryRouter>
  );

describe("BookingOverview stay dates", () => {
  beforeEach(() => {
    FetchPropertyDetails.mockResolvedValue(PRICING);
  });

  test("formats epoch-millisecond query params, which the listing page sends, as DD/MM/YYYY", async () => {
    renderOverview(`id=property-1&checkInDate=${CHECK_IN_MS}&checkOutDate=${CHECK_OUT_MS}&guests=2`);

    expect(await screen.findByText(/10\/01\/2027\s*-\s*13\/01\/2027/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  test("keeps YYYY-MM-DD query params working", async () => {
    renderOverview("id=property-1&checkInDate=2027-01-10&checkOutDate=2027-01-13&guests=2");

    expect(await screen.findByText(/10\/01\/2027\s*-\s*13\/01\/2027/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });
});
