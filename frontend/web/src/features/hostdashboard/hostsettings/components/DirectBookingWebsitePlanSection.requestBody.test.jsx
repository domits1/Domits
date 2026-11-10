import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DirectBookingWebsitePlanSection from "./DirectBookingWebsitePlanSection";
import { fetchWithWebsiteSession } from "../../website/services/websiteSession";

jest.mock("../../website/services/websiteSession", () => ({
  ...jest.requireActual("../../website/services/websiteSession"),
  fetchWithWebsiteSession: jest.fn(),
}));

jest.mock("../hooks/useSettingsTrans", () => ({
  __esModule: true,
  default: () => ({
    language: "en",
    t: { websitePlan: jest.requireActual("../../../../content/en.json").settings.ratePlans.websitePlan },
  }),
}));

const CHECKOUT_URL = "https://checkout.stripe.com/cs_test";

const plan = (overrides = {}) => ({
  plan: "essentials",
  priceCents: 0,
  elitePriceCents: 4300,
  checkoutEnabled: true,
  currency: "EUR",
  status: "ACTIVE",
  effectiveUntil: null,
  stripeSubscriptionId: null,
  ...overrides,
});
const paidElitePlan = (overrides = {}) => plan({ plan: "elite", priceCents: 4300, stripeSubscriptionId: "sub_paid", ...overrides });

const answer = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

const serve = ({ reads, changes }) => {
  fetchWithWebsiteSession.mockImplementation((_url, init) =>
    Promise.resolve((init.method === "PATCH" ? changes : reads).shift())
  );
};

const patchBodies = () =>
  fetchWithWebsiteSession.mock.calls.filter(([, init]) => init.method === "PATCH").map(([, init]) => init.body);

const SELF_SELECT_OFF_FIELDS = [
  ["without eliteSelfSelectAvailable", {}],
  ["with eliteSelfSelectAvailable false", { eliteSelfSelectAvailable: false }],
  ["with eliteSelfSelectAvailable null", { eliteSelfSelectAvailable: null }],
  ["with eliteSelfSelectAvailable as the text true", { eliteSelfSelectAvailable: "true" }],
  ["with eliteSelfSelectAvailable 1", { eliteSelfSelectAvailable: 1 }],
];

describe("DirectBookingWebsitePlanSection request bodies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  test.each(SELF_SELECT_OFF_FIELDS)(
    "sends only the plan when an Essentials plan %s upgrades through checkout",
    async (_label, field) => {
      const redirectToCheckout = jest.fn();
      serve({
        reads: [answer(200, plan(field))],
        changes: [answer(200, { action: "checkout_required", checkoutUrl: CHECKOUT_URL })],
      });

      render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

      fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));

      await waitFor(() => {
        expect(redirectToCheckout).toHaveBeenCalledWith(CHECKOUT_URL);
      });
      expect(patchBodies()).toEqual(['{"plan":"elite"}']);
    }
  );

  test.each(SELF_SELECT_OFF_FIELDS)(
    "sends only the plan when a paid Elite plan %s switches to Essentials",
    async (_label, field) => {
      serve({
        reads: [answer(200, paidElitePlan(field))],
        changes: [
          answer(200, {
            action: "downgrade_scheduled",
            plan: paidElitePlan({ ...field, effectiveUntil: "2026-12-15T12:00:00.000Z" }),
          }),
        ],
      });

      render(<DirectBookingWebsitePlanSection />);

      fireEvent.click(await screen.findByRole("button", { name: "Switch to Essentials" }));

      expect(
        await screen.findByText("Your switch to Essentials is scheduled for the end of the current billing period.")
      ).toBeInTheDocument();
      expect(patchBodies()).toEqual(['{"plan":"essentials"}']);
    }
  );
});
