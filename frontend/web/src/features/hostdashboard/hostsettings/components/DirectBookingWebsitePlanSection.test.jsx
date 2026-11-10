import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DirectBookingWebsitePlanSection from "./DirectBookingWebsitePlanSection";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "../services/websiteRatePlanService";
import {
  WEBSITE_CONNECTION_FAILED_MESSAGE,
  WEBSITE_SESSION_EXPIRED_MESSAGE,
  WebsiteConnectionError,
  WebsiteSessionExpiredError,
} from "../../website/services/websiteSession";

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
        checkoutPending: "We\'re confirming your Elite subscription. This can take a few moments.",
        checkoutStillPending: "We haven\'t received confirmation yet. Your payment may still be processing. Refresh this page in a moment; don\'t start another checkout.",
        checkoutSuccess: "Your Elite subscription is active.",
        checkoutCancelled: "Checkout was cancelled. Your plan has not changed.",
        downgradeScheduled: "Downgrade scheduled",
        downgradeSuccess: "Downgrade complete",
        restoreSuccess: "Elite subscription restored",
        unchanged: "Plan unchanged",
        effectiveUntil: "Elite remains active until {date}.",
        withoutPayment: "No payment needed",
        sectionSubtitleWithoutPayment: "Choose the plan for your website",
        upgradeSuccess: "Your website plan is now Elite",
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
  checkoutEnabled: true,
  currency: "EUR",
  status: "ACTIVE",
  effectiveUntil: null,
  ...overrides,
});

const ESSENTIALS_FEATURES = ["Basic website", "Included", "Basic booking", "Basic customization and SEO"];
const ELITE_FEATURES = [
  "More tools",
  "Everything in Essentials, plus",
  "Custom domain",
  "Advanced builder",
  "Multiple languages",
  "Growth tools",
];
const SCHEDULED_END = "2026-12-15T12:00:00.000Z";
const SCHEDULED_END_LINE = `Elite remains active until ${new Date(SCHEDULED_END).toLocaleDateString("en")}.`;

const ESSENTIALS_CURRENT_CARD = {
  texts: ["Essentials", "Current plan", "Free", "per month", ...ESSENTIALS_FEATURES, "Current plan"],
  buttonDisabled: true,
};
const ELITE_UPGRADE_CARD = {
  texts: ["Elite", "€43.00", "per month", ...ELITE_FEATURES, "Upgrade to Elite"],
  buttonDisabled: false,
};
const ESSENTIALS_SWITCH_CARD = {
  texts: ["Essentials", "Free", "per month", ...ESSENTIALS_FEATURES, "Switch to Essentials"],
  buttonDisabled: false,
};
const ELITE_CURRENT_CARD = {
  texts: ["Elite", "Current plan", "€43.00", "per month", ...ELITE_FEATURES, "Current plan"],
  buttonDisabled: true,
};
const ESSENTIALS_SCHEDULED_CARD = {
  texts: ["Essentials", "Scheduled", "Free", "per month", ...ESSENTIALS_FEATURES, "Scheduled"],
  buttonDisabled: true,
};
const ELITE_REACTIVATE_CARD = {
  texts: ["Elite", "Current plan", "€43.00", "per month", ...ELITE_FEATURES, "Reactivate Elite"],
  buttonDisabled: false,
};
const ELITE_UPGRADE_UNAVAILABLE_CARD = { ...ELITE_UPGRADE_CARD, buttonDisabled: true };
const ELITE_PRICE_UNAVAILABLE_CARD = {
  texts: ["Elite", "Price unavailable", "per month", ...ELITE_FEATURES, "Upgrade to Elite"],
  buttonDisabled: true,
};
const ELITE_WITHOUT_SUBSCRIPTION_CARD = {
  texts: ["Elite", "Current plan", "No payment needed", ...ELITE_FEATURES, "Current plan"],
  buttonDisabled: true,
};

const PLAN_SHAPES = [
  ["an Essentials plan", { stripeSubscriptionId: null }, [ESSENTIALS_CURRENT_CARD, ELITE_UPGRADE_CARD], []],
  ["an Essentials plan read without a subscription field", {}, [ESSENTIALS_CURRENT_CARD, ELITE_UPGRADE_CARD], []],
  [
    "an Essentials plan while checkout is off",
    { checkoutEnabled: false },
    [ESSENTIALS_CURRENT_CARD, ELITE_UPGRADE_UNAVAILABLE_CARD],
    [],
  ],
  [
    "an Essentials plan without an Elite price",
    { elitePriceCents: null },
    [ESSENTIALS_CURRENT_CARD, ELITE_PRICE_UNAVAILABLE_CARD],
    [],
  ],
  [
    "a paid Elite plan",
    { plan: "elite", priceCents: 4300, stripeSubscriptionId: "sub_paid" },
    [ESSENTIALS_SWITCH_CARD, ELITE_CURRENT_CARD],
    [],
  ],
  [
    "an Elite plan read without a subscription field",
    { plan: "elite", priceCents: 4300 },
    [ESSENTIALS_SWITCH_CARD, ELITE_CURRENT_CARD],
    [],
  ],
  [
    "a paid Elite plan with a scheduled downgrade",
    { plan: "elite", priceCents: 4300, effectiveUntil: SCHEDULED_END, stripeSubscriptionId: "sub_paid" },
    [ESSENTIALS_SCHEDULED_CARD, ELITE_REACTIVATE_CARD],
    [SCHEDULED_END_LINE],
  ],
  [
    "an Elite plan with a scheduled downgrade read without a subscription field",
    { plan: "elite", priceCents: 4300, effectiveUntil: SCHEDULED_END },
    [ESSENTIALS_SCHEDULED_CARD, ELITE_REACTIVATE_CARD],
    [SCHEDULED_END_LINE],
  ],
  [
    "an Elite plan without a subscription",
    { plan: "elite", priceCents: 0, stripeSubscriptionId: null },
    [ESSENTIALS_SWITCH_CARD, ELITE_WITHOUT_SUBSCRIPTION_CARD],
    [],
  ],
  [
    "an Elite plan without a subscription that has an end date",
    { plan: "elite", priceCents: 0, effectiveUntil: SCHEDULED_END, stripeSubscriptionId: null },
    [ESSENTIALS_SCHEDULED_CARD, ELITE_WITHOUT_SUBSCRIPTION_CARD],
    [SCHEDULED_END_LINE],
  ],
];

const SELF_SELECT_OFF_FIELDS = [
  ["without eliteSelfSelectAvailable", {}],
  ["with eliteSelfSelectAvailable false", { eliteSelfSelectAvailable: false }],
  ["with eliteSelfSelectAvailable null", { eliteSelfSelectAvailable: null }],
  ["with eliteSelfSelectAvailable as the text true", { eliteSelfSelectAvailable: "true" }],
  ["with eliteSelfSelectAvailable 1", { eliteSelfSelectAvailable: 1 }],
];

const PLAN_SHAPES_WITHOUT_SELF_SELECT = SELF_SELECT_OFF_FIELDS.flatMap(([fieldLabel, field]) =>
  PLAN_SHAPES.map(([label, overrides, cards, endLines]) => [
    `${label} ${fieldLabel}`,
    { ...overrides, ...field },
    cards,
    endLines,
  ])
);

const CHECKOUT_URL = "https://checkout.stripe.com/cs_test";
const selfSelectPlan = (overrides = {}) =>
  essentialsPlan({ eliteSelfSelectAvailable: true, stripeSubscriptionId: null, ...overrides });
const selfSelectedElitePlan = (overrides = {}) => selfSelectPlan({ plan: "elite", priceCents: 0, ...overrides });
const ELITE_SELF_SELECT_CARD = {
  texts: ["Elite", "No payment needed", ...ELITE_FEATURES, "Upgrade to Elite"],
  buttonDisabled: false,
};

const renderedCards = () =>
  screen.getAllByRole("article").map((card) => ({
    texts: within(card).getAllByText(/./).map((element) => element.textContent),
    buttonDisabled: within(card).getByRole("button").disabled,
  }));

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

  test("disables new Elite checkout when the backend release gate is off", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({ checkoutEnabled: false }));

    render(<DirectBookingWebsitePlanSection />);

    const upgradeButton = await screen.findByRole("button", { name: "Upgrade to Elite" });
    expect(upgradeButton).toBeDisabled();
    fireEvent.click(upgradeButton);
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

  test("shows a follow-up notice when Elite activation is not confirmed after polling", async () => {
    jest.useFakeTimers();
    try {
      window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
      getWebsiteRatePlan.mockResolvedValue(essentialsPlan());

      render(<DirectBookingWebsitePlanSection />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(
        screen.getByText("We're confirming your Elite subscription. This can take a few moments.")
      ).toBeInTheDocument();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1500);
        });
      }

      expect(
        screen.getByText("We haven't received confirmation yet. Your payment may still be processing. Refresh this page in a moment; don't start another checkout.")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
      expect(changeWebsiteRatePlan).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  test("keeps the Checkout success marker when the plan read fails", async () => {
    window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
    getWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load plan");
    expect(window.location.search).toBe("?websiteCheckout=success");
  });

  test.each([
    [
      "the session expired",
      () => new WebsiteSessionExpiredError(),
      WEBSITE_SESSION_EXPIRED_MESSAGE,
    ],
    [
      "the login check could not reach Cognito",
      () => new WebsiteConnectionError(),
      WEBSITE_CONNECTION_FAILED_MESSAGE,
    ],
  ])("shows the login message instead of the load error when %s", async (_label, failure, message) => {
    getWebsiteRatePlan.mockRejectedValue(failure());

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("Could not load plan")).not.toBeInTheDocument();
  });

  test.each([
    [
      "Upgrade to Elite",
      "an expired session",
      essentialsPlan(),
      () => new WebsiteSessionExpiredError(),
      WEBSITE_SESSION_EXPIRED_MESSAGE,
      "Could not start checkout",
    ],
    [
      "Upgrade to Elite",
      "an unreachable login check",
      essentialsPlan(),
      () => new WebsiteConnectionError(),
      WEBSITE_CONNECTION_FAILED_MESSAGE,
      "Could not start checkout",
    ],
    [
      "Switch to Essentials",
      "an expired session",
      essentialsPlan({ plan: "elite", priceCents: 4300 }),
      () => new WebsiteSessionExpiredError(),
      WEBSITE_SESSION_EXPIRED_MESSAGE,
      "Could not change plan",
    ],
  ])("shows the login message when %s fails with %s", async (buttonName, _label, plan, failure, message, genericError) => {
    getWebsiteRatePlan.mockResolvedValue(plan);
    changeWebsiteRatePlan.mockRejectedValue(failure());

    render(<DirectBookingWebsitePlanSection />);

    fireEvent.click(await screen.findByRole("button", { name: buttonName }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText(genericError)).not.toBeInTheDocument();
  });

  test("stops confirming the checkout and shows the session expired message when the session expires", async () => {
    jest.useFakeTimers();
    try {
      window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
      getWebsiteRatePlan
        .mockResolvedValueOnce(essentialsPlan())
        .mockRejectedValue(new WebsiteSessionExpiredError());

      render(<DirectBookingWebsitePlanSection />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1500);
        });
      }

      expect(screen.getByRole("alert")).toHaveTextContent(WEBSITE_SESSION_EXPIRED_MESSAGE);
      expect(getWebsiteRatePlan).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByText("We're confirming your Elite subscription. This can take a few moments.")
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
      expect(window.location.search).toBe("?websiteCheckout=success");
    } finally {
      jest.useRealTimers();
    }
  });

  test("keeps confirming the checkout after the login check could not reach Cognito once", async () => {
    jest.useFakeTimers();
    try {
      window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
      getWebsiteRatePlan
        .mockResolvedValueOnce(essentialsPlan())
        .mockRejectedValueOnce(new WebsiteConnectionError())
        .mockResolvedValue(essentialsPlan({ plan: "elite", priceCents: 4300 }));

      render(<DirectBookingWebsitePlanSection />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1500);
        });
      }

      expect(screen.getByText("Your Elite subscription is active.")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(getWebsiteRatePlan).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test.each([
    [
      "shows the connection message",
      "the last check could not reach Cognito",
      () => Promise.reject(new WebsiteConnectionError()),
      WEBSITE_CONNECTION_FAILED_MESSAGE,
    ],
    [
      "shows no alert",
      "the last check read the plan",
      () => Promise.resolve(essentialsPlan()),
      null,
    ],
    [
      "shows no alert",
      "the last check failed on the server",
      () => Promise.reject(new Error("Request failed")),
      null,
    ],
  ])("%s next to the pending notice when the checkout stays unconfirmed and %s", async (_outcome, _label, lastCheck, alertMessage) => {
    jest.useFakeTimers();
    try {
      window.history.replaceState({}, "", "/hostdashboard/settings/rate-plans/direct-booking-website?websiteCheckout=success");
      getWebsiteRatePlan.mockResolvedValueOnce(essentialsPlan());
      for (let attempt = 0; attempt < 9; attempt += 1) {
        getWebsiteRatePlan.mockRejectedValueOnce(new WebsiteConnectionError());
      }
      getWebsiteRatePlan.mockImplementationOnce(lastCheck);

      render(<DirectBookingWebsitePlanSection />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1500);
        });
      }

      expect(getWebsiteRatePlan).toHaveBeenCalledTimes(11);
      expect(
        screen.getByText("We haven't received confirmation yet. Your payment may still be processing. Refresh this page in a moment; don't start another checkout.")
      ).toBeInTheDocument();
      if (alertMessage) {
        expect(screen.getByRole("alert")).toHaveTextContent(alertMessage);
      } else {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      }
      expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
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

  test("shows an Elite plan without a subscription that has an end date as the current plan, not as a plan to reactivate", async () => {
    const endDate = "2026-12-15T12:00:00.000Z";
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 0,
      effectiveUntil: endDate,
      stripeSubscriptionId: null,
    }));

    render(<DirectBookingWebsitePlanSection />);

    const eliteButton = await screen.findByRole("button", { name: "Current plan" });
    expect(eliteButton).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Reactivate Elite" })).not.toBeInTheDocument();
    expect(screen.getByText("No payment needed")).toBeInTheDocument();
    expect(screen.queryByText("€43.00")).not.toBeInTheDocument();
    expect(
      screen.getByText(`Elite remains active until ${new Date(endDate).toLocaleDateString("en")}.`)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scheduled" })).toBeDisabled();

    fireEvent.click(eliteButton);
    expect(changeWebsiteRatePlan).not.toHaveBeenCalled();
  });

  test("still offers to reactivate a paid Elite subscription whose downgrade is scheduled", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 4300,
      effectiveUntil: "2026-12-15T12:00:00.000Z",
      stripeSubscriptionId: "sub_paid",
    }));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByRole("button", { name: "Reactivate Elite" })).toBeEnabled();
    expect(screen.getByText("€43.00")).toBeInTheDocument();
    expect(screen.queryByText("No payment needed")).not.toBeInTheDocument();
  });

  test.each([
    ["an Essentials plan", { stripeSubscriptionId: null }, "Upgrade to Elite"],
    ["an Essentials plan read without a subscription field", {}, "Upgrade to Elite"],
    ["a paid Elite plan", { plan: "elite", priceCents: 4300, stripeSubscriptionId: "sub_paid" }, "Current plan"],
    [
      "a paid Elite plan with a scheduled downgrade",
      { plan: "elite", priceCents: 4300, effectiveUntil: "2026-12-15T12:00:00.000Z", stripeSubscriptionId: "sub_paid" },
      "Reactivate Elite",
    ],
    [
      "an Elite plan read without a subscription field",
      { plan: "elite", priceCents: 4300, effectiveUntil: "2026-12-15T12:00:00.000Z" },
      "Reactivate Elite",
    ],
  ])("shows the Elite price and no line about payment for %s", async (_label, overrides, eliteButtonName) => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan(overrides));

    render(<DirectBookingWebsitePlanSection />);

    expect(await screen.findByText("€43.00")).toBeInTheDocument();
    expect(screen.getAllByText("per month")).toHaveLength(2);
    expect(screen.getByRole("button", { name: eliteButtonName })).toBeInTheDocument();
    expect(screen.queryByText("No payment needed")).not.toBeInTheDocument();
  });

  test.each(PLAN_SHAPES_WITHOUT_SELF_SELECT)(
    "renders both cards of %s as before",
    async (_label, overrides, expectedCards, expectedEndLines) => {
      getWebsiteRatePlan.mockResolvedValue(essentialsPlan(overrides));

      render(<DirectBookingWebsitePlanSection />);

      await screen.findAllByRole("article");
      expect(renderedCards()).toEqual(expectedCards);
      expect(screen.getByText("Choose a plan")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.queryAllByText(/^Elite remains active until /).map((line) => line.textContent)).toEqual(
        expectedEndLines
      );
    }
  );

  test.each(SELF_SELECT_OFF_FIELDS)(
    "still sends an Essentials plan %s to Stripe checkout",
    async (_label, field) => {
      const checkoutUrl = "https://checkout.stripe.com/cs_test";
      const redirectToCheckout = jest.fn();
      getWebsiteRatePlan.mockResolvedValue(essentialsPlan(field));
      changeWebsiteRatePlan.mockResolvedValue({ action: "checkout_required", checkoutUrl });

      render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

      fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));

      await waitFor(() => {
        expect(redirectToCheckout).toHaveBeenCalledWith(checkoutUrl);
      });
      expect(changeWebsiteRatePlan).toHaveBeenCalledWith("elite");
    }
  );

  test("shows an Elite plan without a subscription or an end date as the current plan without a price, and offers Essentials", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 0,
      effectiveUntil: null,
      stripeSubscriptionId: null,
    }));
    changeWebsiteRatePlan.mockResolvedValue({ action: "downgraded", plan: essentialsPlan() });

    render(<DirectBookingWebsitePlanSection />);

    await screen.findAllByRole("article");
    expect(renderedCards()).toEqual([
      ESSENTIALS_SWITCH_CARD,
      ELITE_WITHOUT_SUBSCRIPTION_CARD,
    ]);
    expect(screen.queryByRole("button", { name: "Reactivate Elite" })).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^Elite remains active until /)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Switch to Essentials" }));

    expect(changeWebsiteRatePlan).toHaveBeenCalledWith("essentials");
    expect(await screen.findByText("Downgrade complete")).toBeInTheDocument();
    expect(renderedCards()).toEqual([ESSENTIALS_CURRENT_CARD, ELITE_UPGRADE_CARD]);
  });

  test("keeps an Elite plan without a subscription and shows the change error when the switch to Essentials fails", async () => {
    getWebsiteRatePlan.mockResolvedValue(essentialsPlan({
      plan: "elite",
      priceCents: 0,
      effectiveUntil: null,
      stripeSubscriptionId: null,
    }));
    changeWebsiteRatePlan.mockRejectedValue(new Error("Request failed"));

    render(<DirectBookingWebsitePlanSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Switch to Essentials" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not change plan");
    expect(renderedCards()).toEqual([
      ESSENTIALS_SWITCH_CARD,
      ELITE_WITHOUT_SUBSCRIPTION_CARD,
    ]);
  });

  describe("for a host who may choose Elite without payment", () => {
    test.each([
      ["while checkout is off and no Elite price is set", { checkoutEnabled: false, elitePriceCents: null }],
      ["while checkout is on with an Elite price", { checkoutEnabled: true, elitePriceCents: 4300 }],
    ])("offers Elite without a price and switches to it without checkout %s", async (_label, checkout) => {
      const redirectToCheckout = jest.fn();
      getWebsiteRatePlan.mockResolvedValue(selfSelectPlan(checkout));
      changeWebsiteRatePlan.mockResolvedValue({ action: "upgraded", plan: selfSelectedElitePlan(checkout) });

      render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

      await screen.findAllByRole("article");
      expect(renderedCards()).toEqual([ESSENTIALS_CURRENT_CARD, ELITE_SELF_SELECT_CARD]);
      expect(screen.getByText("Choose the plan for your website")).toBeInTheDocument();
      expect(screen.queryByText("Choose a plan")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Upgrade to Elite" }));

      expect(await screen.findByText("Your website plan is now Elite")).toBeInTheDocument();
      expect(changeWebsiteRatePlan.mock.calls).toEqual([["elite"]]);
      expect(renderedCards()).toEqual([ESSENTIALS_SWITCH_CARD, ELITE_WITHOUT_SUBSCRIPTION_CARD]);
      expect(screen.getByText("Choose the plan for your website")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(redirectToCheckout).not.toHaveBeenCalled();
    });

    test("switches back to Essentials after choosing Elite", async () => {
      getWebsiteRatePlan.mockResolvedValue(selfSelectPlan());
      changeWebsiteRatePlan
        .mockResolvedValueOnce({ action: "upgraded", plan: selfSelectedElitePlan() })
        .mockResolvedValueOnce({ action: "downgraded", plan: selfSelectPlan() });

      render(<DirectBookingWebsitePlanSection />);

      fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));
      await screen.findByText("Your website plan is now Elite");
      fireEvent.click(screen.getByRole("button", { name: "Switch to Essentials" }));

      expect(await screen.findByText("Downgrade complete")).toBeInTheDocument();
      expect(changeWebsiteRatePlan.mock.calls).toEqual([["elite"], ["essentials"]]);
      expect(renderedCards()).toEqual([ESSENTIALS_CURRENT_CARD, ELITE_SELF_SELECT_CARD]);
    });

    test("reads the plan again when the answer to choosing Elite has no plan", async () => {
      getWebsiteRatePlan.mockResolvedValueOnce(selfSelectPlan()).mockResolvedValueOnce(selfSelectedElitePlan());
      changeWebsiteRatePlan.mockResolvedValue({ action: "upgraded" });

      render(<DirectBookingWebsitePlanSection />);

      fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));

      expect(await screen.findByText("Your website plan is now Elite")).toBeInTheDocument();
      expect(getWebsiteRatePlan).toHaveBeenCalledTimes(2);
      expect(renderedCards()).toEqual([ESSENTIALS_SWITCH_CARD, ELITE_WITHOUT_SUBSCRIPTION_CARD]);
    });

    test.each([
      [
        "the change fails and the server still holds Essentials",
        () => Promise.reject(new Error("Request failed")),
        () => Promise.resolve(selfSelectPlan()),
        "Could not change plan",
        [ESSENTIALS_CURRENT_CARD, ELITE_SELF_SELECT_CARD],
      ],
      [
        "the change fails and the server holds Elite",
        () => Promise.reject(new Error("The website plan changed at the same time. Reload the page and try again.")),
        () => Promise.resolve(selfSelectedElitePlan()),
        "Could not change plan",
        [ESSENTIALS_SWITCH_CARD, ELITE_WITHOUT_SUBSCRIPTION_CARD],
      ],
      [
        "the server no longer offers Elite without payment and answers with a checkout",
        () => Promise.resolve({ action: "checkout_required", checkoutUrl: CHECKOUT_URL }),
        () => Promise.resolve(essentialsPlan({ eliteSelfSelectAvailable: false })),
        "Could not change plan",
        [ESSENTIALS_CURRENT_CARD, ELITE_UPGRADE_CARD],
      ],
      [
        "the change fails and the plan cannot be read again",
        () => Promise.reject(new Error("Request failed")),
        () => Promise.reject(new Error("Request failed")),
        "Could not change plan",
        [ESSENTIALS_CURRENT_CARD, ELITE_SELF_SELECT_CARD],
      ],
      [
        "the session expired",
        () => Promise.reject(new WebsiteSessionExpiredError()),
        () => Promise.reject(new WebsiteSessionExpiredError()),
        WEBSITE_SESSION_EXPIRED_MESSAGE,
        [ESSENTIALS_CURRENT_CARD, ELITE_SELF_SELECT_CARD],
      ],
    ])(
      "shows one message and the plan the server holds, and starts no checkout, when %s",
      async (_label, change, readAgain, alertMessage, expectedCards) => {
        const redirectToCheckout = jest.fn();
        getWebsiteRatePlan.mockResolvedValueOnce(selfSelectPlan()).mockImplementationOnce(readAgain);
        changeWebsiteRatePlan.mockImplementation(change);

        render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

        fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(alertMessage);
        expect(getWebsiteRatePlan).toHaveBeenCalledTimes(2);
        expect(renderedCards()).toEqual(expectedCards);
        expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
        expect(screen.queryByText("Your website plan is now Elite")).not.toBeInTheDocument();
        expect(redirectToCheckout).not.toHaveBeenCalled();
      }
    );
  });
});
