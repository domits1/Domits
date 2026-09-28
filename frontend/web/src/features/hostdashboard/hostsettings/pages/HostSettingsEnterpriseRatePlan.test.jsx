import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import HostSettingsEnterpriseRatePlan from "./HostSettingsEnterpriseRatePlan";
import { getEnterpriseRatePlan } from "../services/enterpriseRatePlanService";

jest.mock("../services/enterpriseRatePlanService", () => ({
  getEnterpriseRatePlan: jest.fn(),
}));

jest.mock("../hooks/useSettingsTrans", () => ({
  __esModule: true,
  default: () => ({
    hub: { breadcrumb: "Settings" },
    t: {
      enterprise: {
        breadcrumb: "Enterprise Rate Plan",
        title: "Enterprise Rate Plan",
        subtitle: "Simple pricing",
        loading: "Loading enterprise rate plan...",
        loadError: "We couldn't load your enterprise rate plan right now.",
        notActiveTitle: "You are not on an Enterprise plan",
        notActiveDescription: "This account does not have an active Enterprise rate plan.",
        currentPlan: "Current Plan",
        currentRate: "Current Rate",
        planName: "Enterprise",
        perActivePropertyMonth: "active property / month",
        active: "Active",
        activeProperties: "Active Properties",
        billableProperties: "Billable properties",
        pricePerProperty: "Price per Property",
        estimatedMonthlyCost: "Estimated Monthly Cost",
        basedOnPropertyCount: "Based on your current property count",
        pricing: "Pricing",
        pricingLabel: "Enterprise pricing",
        monthlySubscription: "Monthly Subscription",
        nextInvoice: "Next Invoice",
        nextInvoiceLabel: "Next invoice",
        billingFrequency: "Billing frequency",
        monthly: "Monthly",
        billingUnit: "Billing unit",
        activeProperty: "Active Property",
        billingHistory: "Billing History",
        noInvoices: "No invoices available yet",
        invoicesDescription: "Your enterprise invoices will appear here once billing history is available.",
        billingContact: "Billing Contact",
        billingContactTitle: "Billing contact",
        billingContactDescription: "Billing contact management will be available here.",
      },
    },
  }),
}));

jest.mock("../components/SettingsSubPage", () => ({
  __esModule: true,
  default: ({ children, title, subtitle }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

describe("HostSettingsEnterpriseRatePlan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows loading state", () => {
    getEnterpriseRatePlan.mockReturnValue(new Promise(() => {}));

    render(<HostSettingsEnterpriseRatePlan />);

    expect(
      screen.getByText("Loading enterprise rate plan...")
    ).toBeInTheDocument();
  });

  test("shows inactive state when no enterprise plan exists", async () => {
    getEnterpriseRatePlan.mockResolvedValue(null);

    render(<HostSettingsEnterpriseRatePlan />);

    expect(
      await screen.findByText("You are not on an Enterprise plan")
    ).toBeInTheDocument();
  });

  test("shows error state when the request fails", async () => {
    getEnterpriseRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<HostSettingsEnterpriseRatePlan />);

    expect(
      await screen.findByText("We couldn't load your enterprise rate plan right now.")
    ).toBeInTheDocument();
  });

  test("shows plan details for an active enterprise plan", async () => {
    getEnterpriseRatePlan.mockResolvedValue({
      activeProperties: 100,
      pricePerProperty: 49,
      currency: "EUR",
      estimatedMonthlyCost: 4900,
    });

    render(<HostSettingsEnterpriseRatePlan />);

    await waitFor(() =>
      expect(screen.getByText("Enterprise")).toBeInTheDocument()
    );

    expect(screen.getAllByText("€49.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("€4,900.00").length).toBeGreaterThan(0);
  });
});
