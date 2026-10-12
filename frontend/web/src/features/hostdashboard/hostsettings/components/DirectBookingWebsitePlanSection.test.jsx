import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        priceUnavailable: "Price unavailable",
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
        checkoutPending: "Confirming Elite subscription...",
        checkoutSuccess: "Your Elite subscription is active.",
        checkoutCancelled: "Checkout was cancelled. Your plan has not changed.",
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

const essentialsPlan = (overrides = {}) => ({
  plan: "essentials",
  priceCents: 0,
  elitePriceCents: 4300,
  currency: "EUR",
  status: "ACTIVE",
  effectiveUntil: null,
  ...overrides,
});

describe("DirectBookingWebsitePlanSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  test("shows the current Essentials plan and the Elite price supplied by the API", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({ elitePriceCents: 5200 }));

    render(<DirectBookingWebsitePlanSection />);

    expect(
      await screen.findByText("Direct Booking Website subscription")
    ).toBeInTheDocument();
    expect(await screen.findAllByText("Essentials")).toHaveLength(1);
    expect(screen.getByText("€52.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Upgrade to Elite" })
    ).toBeEnabled();
  });

  test("does not offer checkout when the backend has not supplied the Elite price", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({ elitePriceCents: null }));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByText("Price unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upgrade to Elite" })
    ).toBeDisabled();
    expect(changeWebsiteRatePlan).not.toHaveBeenCalled();
  });

  test("reactivates Elite when cancellation is scheduled", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 4300,
      effectiveUntil: "2026-11-01T00:00:00.000Z",
    }));
    changeWebsiteRatePlan.mockResolvedValue({
      action: "upgrade_restored",
      plan: essentialsPlan({
        plan: "elite",
        priceCents: 4300,
        effectiveUntil: null,
      }),
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

  test("shows a change error when reactivating Elite fails", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 4300,
      effectiveUntil: "2026-11-01T00:00:00.000Z",
    }));
    changeWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Reactivate Elite" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change plan");
  });

  test("redirects to Stripe when the backend returns a checkout URL", async () => {
    const checkoutUrl = "https://checkout.stripe.com/cs_test";
    const redirectToCheckout = jest.fn();
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan());
    changeWebsiteRatePlan.mockResolvedValue({
      action: "checkout_required",
      checkoutUrl,
    });

    render(
      <DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Upgrade to Elite" })
    );

    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith(checkoutUrl);
    });
    expect(
      screen.getByRole("button", { name: "Processing..." })
    ).toBeDisabled();
  });

  test("keeps the displayed Elite plan and shows an error when a PATCH fails", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 4300,
      effectiveUntil: null,
    }));
    changeWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to Essentials" })
    );

    expect(changeWebsiteRatePlan).toHaveBeenCalledWith("essentials");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change plan");
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(screen.getByText("€43.00")).toBeInTheDocument();
  });

  test("shows an error and does not redirect when checkout URL is missing", async () => {
    const redirectToCheckout = jest.fn();
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan());
    changeWebsiteRatePlan.mockResolvedValue({
      action: "checkout_required",
    });

    render(
      <DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Upgrade to Elite" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not start checkout");
    expect(redirectToCheckout).not.toHaveBeenCalled();
  });

  test("shows a load error when the API fails", async () => {
    getWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load plan");
  });

  test("shows a pending state after successful checkout until the webhook activates Elite", async () => {
    window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan());

    render(<DirectBookingWebsitePlanSection />);

    expect(
      await screen.findByText("We're confirming your Elite subscription. This can take a few moments.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Processing..." })
    ).toBeDisabled();
    expect(changeWebsiteRatePlan).not.toHaveBeenCalled();
  });

  test("keeps the Checkout success marker when the plan read fails", async () => {
    window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
    getWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load plan");
    expect(window.location.search).toBe("?websiteCheckout=success");
  });

  test("shows a cancellation notice when Stripe returns to the cancel URL", async () => {
    window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=cancelled");
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan());

    render(<DirectBookingWebsitePlanSection />);

    expect(
      await screen.findByText("Checkout was cancelled. Your plan has not changed.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade to Elite" })).toBeEnabled();
  });
});
