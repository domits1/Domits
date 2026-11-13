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

  describe("for a host who may choose Elite without payment", () => {
    const selfSelectPlan = (overrides = {}) => plan({ eliteSelfSelectAvailable: true, ...overrides });
    const CHANGE_ERROR = "We couldn't update your website plan. Please try again.";
    const PRICE_SUBTITLE = "Choose the plan for your booking website. The Elite price is shown below.";
    const NEUTRAL_SUBTITLE = "Choose the plan for your booking website.";

    test("sends withoutPayment true with both plans when the host chooses Elite and switches back", async () => {
      const redirectToCheckout = jest.fn();
      serve({
        reads: [answer(200, selfSelectPlan())],
        changes: [
          answer(200, { action: "upgraded", plan: selfSelectPlan({ plan: "elite" }) }),
          answer(200, { action: "downgraded", plan: selfSelectPlan() }),
        ],
      });

      render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

      fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));
      await screen.findByText("Your website plan is now Elite.");
      fireEvent.click(screen.getByRole("button", { name: "Switch to Essentials" }));

      expect(await screen.findByText("Your website plan is now Essentials.")).toBeInTheDocument();
      expect(patchBodies()).toEqual([
        '{"plan":"elite","withoutPayment":true}',
        '{"plan":"essentials","withoutPayment":true}',
      ]);
      expect(redirectToCheckout).not.toHaveBeenCalled();
    });

    test.each([
      [
        "a 409 because the option was turned off",
        409,
        plan({ eliteSelfSelectAvailable: false }),
        PRICE_SUBTITLE,
        "Upgrade to Elite",
      ],
      [
        "a 409 because a paid subscription started",
        409,
        paidElitePlan({ eliteSelfSelectAvailable: false }),
        PRICE_SUBTITLE,
        "Switch to Essentials",
      ],
      ["a 400", 400, selfSelectPlan(), NEUTRAL_SUBTITLE, "Upgrade to Elite"],
    ])(
      "reads the plan again and shows what the server holds after %s, without a redirect",
      async (_label, status, serverPlan, subtitle, enabledButton) => {
        const redirectToCheckout = jest.fn();
        serve({
          reads: [answer(200, selfSelectPlan()), answer(200, serverPlan)],
          changes: [answer(status, { message: "The website plan could not be changed." })],
        });

        render(<DirectBookingWebsitePlanSection redirectToCheckout={redirectToCheckout} />);

        fireEvent.click(await screen.findByRole("button", { name: "Upgrade to Elite" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(CHANGE_ERROR);
        expect(patchBodies()).toEqual(['{"plan":"elite","withoutPayment":true}']);
        expect(fetchWithWebsiteSession).toHaveBeenCalledTimes(3);
        expect(screen.getByText(subtitle)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: enabledButton })).toBeEnabled();
        expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
        expect(redirectToCheckout).not.toHaveBeenCalled();
      }
    );
  });
});
