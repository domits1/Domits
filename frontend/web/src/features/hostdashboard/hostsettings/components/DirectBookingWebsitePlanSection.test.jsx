import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import DirectBookingWebsitePlanSection from "./DirectBookingWebsitePlanSection";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "../services/websiteRatePlanService";

jest.mock("../services/websiteRatePlanService", () => ({
  changeWebsiteRatePlan: jest.fn(),
  getWebsiteRatePlan: jest.fn(),
}));

jest.mock("../hooks/useSettingsTrans", () => ({
  __esModule: true,
  default: () => ({
    language: "en",
    t: {
      websitePlan: {
        sectionTitle: "Direct Booking Website subscription",
        sectionSubtitle: "Choose a plan",
        loading: "Loading your website plan...",
        loadError: "Could not load plan",
        essentials: "Essentials",
        essentialsDescription: "Basic website",
        essentialsFeaturesTitle: "Included",
        featureBasicWebsite: "Basic booking",
        featureBasicCustomization: "Basic customization and SEO",
        elite: "Elite",
        eliteDescription: "More tools",
        eliteFeaturesTitle: "Everything in Essentials, plus",
        featureCustomDomain: "Custom domain",
        featureAdvancedBuilder: "Advanced builder",
        featureLocalization: "Multiple languages",
        featureGrowthTools: "Growth tools",
        currentPlan: "Current plan",
        scheduled: "Scheduled",
        status: { ACTIVE: "Active" },
        perMonth: "per month",
        free: "Free",
        upgrade: "Upgrade to Elite",
        restoreElite: "Reactivate Elite",
        switchToEssentials: "Switch to Essentials",
        processing: "Processing...",
        changeError: "Could not change plan",
        checkoutError: "Could not start checkout",
        upgradeNotice: "Redirecting to Stripe",
        downgradeScheduled: "Downgrade scheduled",
        downgradeSuccess: "Downgrade complete",
        restoreSuccess: "Elite subscription restored",
        unchanged: "Plan unchanged",
        effectiveUntil: "Elite remains active until {date}.",
      },
    },
  }),
}));

jest.mock("../utils/formatters", () => ({
  formatCurrency: (amount) => `€${amount.toFixed(2)}`,
}));

describe("DirectBookingWebsitePlanSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows the current Essentials plan and the Elite price", async () => {
    getWebsiteRatePlan.mockResolvedValue({
      plan: "essentials",
      priceCents: 0,
      currency: "EUR",
      status: "ACTIVE",
      effectiveUntil: null,
    });

    render(<DirectBookingWebsitePlanSection />);

    expect(
      await screen.findByText("Direct Booking Website subscription")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Essentials").length).toBeGreaterThan(0);
    expect(screen.getByText("€43.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Upgrade to Elite" })
    ).toBeEnabled();
  });

  test("reactivates Elite when cancellation is scheduled", async () => {
    getWebsiteRatePlan.mockResolvedValue({
      plan: "elite",
      priceCents: 4300,
      currency: "EUR",
      status: "ACTIVE",
      effectiveUntil: "2026-11-01T00:00:00.000Z",
    });
    changeWebsiteRatePlan.mockResolvedValue({
      action: "upgrade_restored",
      plan: {
        plan: "elite",
        priceCents: 4300,
        currency: "EUR",
        status: "ACTIVE",
        effectiveUntil: null,
      },
    });

    render(<DirectBookingWebsitePlanSection />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Reactivate Elite" })
    );

    expect(changeWebsiteRatePlan).toHaveBeenCalledWith("elite");
    expect(
      await screen.findByText("Elite subscription restored")
    ).toBeInTheDocument();
  });

  test("shows a load error when the API fails", async () => {
    getWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load plan");
  });
});
