import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HostFinanceTab from "./HostFinanceTab";
import { RefreshFunctions } from "../hooks/refreshFunctions";
import { fetchHostOwnedListings } from "../../services/hostTaskPropertyService";

jest.mock("../hooks/refreshFunctions", () => ({
  RefreshFunctions: jest.fn(),
}));

jest.mock("../../services/hostTaskPropertyService", () => ({
  fetchHostOwnedListings: jest.fn(),
}));

jest.mock("../mocks/financeDemoData", () => ({
  isFinanceDemoMode: () => false,
}));

jest.mock("./InvoicesSection", () => () => null);
jest.mock("./MonthlyPayoutDayPicker", () => () => null);

const buildFinanceState = (overrides = {}) => ({
  toast: null,
  stripeAccountError: null,
  payouts: [],
  charges: [],
  faqs: [],
  accountId: null,
  onboardingComplete: false,
  chargesEnabled: true,
  payoutsEnabled: true,
  isProcessing: false,
  processingStep: null,
  payoutInterval: null,
  weekly_anchor: null,
  monthly_anchor: null,
  loadingStates: {
    account: false,
    hostBalance: false,
    getPayoutSchedule: false,
  },
  balanceView: {
    currency: "EUR",
    availableTotal: 0,
    incomingTotal: 0,
    pctAvailable: 0,
    total: 0,
  },
  setPayoutInterval: jest.fn(),
  setWeeklyAnchor: jest.fn(),
  setMonthlyAnchor: jest.fn(),
  handleStripeAction: jest.fn(),
  handlePayoutSchedule: jest.fn(),
  ...overrides,
});

const renderFinance = () =>
  render(
    <MemoryRouter>
      <HostFinanceTab />
    </MemoryRouter>
  );

describe("HostFinanceTab Stripe recovery messages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RefreshFunctions.mockReturnValue(buildFinanceState());
    fetchHostOwnedListings.mockResolvedValue([
      { property: { id: "property-1", status: "INACTIVE" } },
    ]);
  });

  it("shows a persistent Stripe lookup error before onboarding is complete", async () => {
    const message = "We couldn't verify your saved Stripe connection. Contact Domits support.";
    RefreshFunctions.mockReturnValue(buildFinanceState({ stripeAccountError: message }));

    renderFinance();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("No FAQs found")).not.toBeInTheDocument();
  });

  it("keeps the Stripe action toast visible when finance sections are hidden", () => {
    const message = "Stripe could not create an onboarding link.";
    RefreshFunctions.mockReturnValue(buildFinanceState({
      toast: { message, type: "error" },
    }));

    renderFinance();

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
});
