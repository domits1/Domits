import { describe, expect, it, jest } from "@jest/globals";
import StripeAccountController from "../../functions/general-crud-payment-handler/controller/stripeAccountController.js";

const PUBLIC_STRIPE_CODES = [
  "STRIPE_ACCOUNT_NOT_FOUND",
  "STRIPE_ACCOUNT_LOOKUP_FAILED",
  "STRIPE_ONBOARDING_LINK_FAILED",
];

const CONTROLLER_METHODS = [
  ["create", "createStripeAccount"],
  ["read", "getStatusOfStripeAccount"],
];

const buildController = (serviceMethod, error) => {
  const controller = Object.create(StripeAccountController.prototype);
  controller.stripeAccountService = {
    [serviceMethod]: jest.fn().mockRejectedValue(error),
  };
  return controller;
};

describe("StripeAccountController error responses", () => {
  it.each(
    CONTROLLER_METHODS.flatMap(([controllerMethod, serviceMethod]) =>
      PUBLIC_STRIPE_CODES.map((code) => [controllerMethod, serviceMethod, code])
    )
  )("%s returns the public Stripe code %s", async (controllerMethod, serviceMethod, code) => {
    const error = Object.assign(new Error("Stripe request failed."), { code, statusCode: 502 });
    const controller = buildController(serviceMethod, error);

    const result = await controller[controllerMethod]({});

    expect(result.response).toMatchObject({ message: error.message, code });
  });

  it.each(CONTROLLER_METHODS)(
    "%s does not expose a database error code",
    async (controllerMethod, serviceMethod) => {
      const error = Object.assign(new Error("Database request failed."), {
        code: "23505",
        statusCode: 500,
      });
      const controller = buildController(serviceMethod, error);

      const result = await controller[controllerMethod]({});

      expect(result.response).toEqual({ message: error.message });
      expect(result.response).not.toHaveProperty("code");
    }
  );

  it.each(CONTROLLER_METHODS)(
    "%s does not expose an internal error code",
    async (controllerMethod, serviceMethod) => {
      const error = Object.assign(new Error("Internal request failed."), {
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
      const controller = buildController(serviceMethod, error);

      const result = await controller[controllerMethod]({});

      expect(result.response).toEqual({ message: error.message });
      expect(result.response).not.toHaveProperty("code");
    }
  );
});
