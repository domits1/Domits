import { describe, expect, it, jest } from "@jest/globals";
import StripeAccountController from "../../functions/general-crud-payment-handler/controller/stripeAccountController.js";

const ERROR_CASES = [
  {
    name: "public Stripe account not found",
    code: "STRIPE_ACCOUNT_NOT_FOUND",
    expectedCode: "STRIPE_ACCOUNT_NOT_FOUND",
    statusCode: 409,
    message: "Stripe account not found.",
  },
  {
    name: "public Stripe lookup failure",
    code: "STRIPE_ACCOUNT_LOOKUP_FAILED",
    expectedCode: "STRIPE_ACCOUNT_LOOKUP_FAILED",
    statusCode: 503,
    message: "Stripe account lookup failed.",
  },
  {
    name: "public Stripe onboarding link failure",
    code: "STRIPE_ONBOARDING_LINK_FAILED",
    expectedCode: "STRIPE_ONBOARDING_LINK_FAILED",
    statusCode: 502,
    message: "Stripe onboarding link failed.",
  },
  {
    name: "database error",
    code: "23505",
    expectedCode: null,
    statusCode: 500,
    message: "Database request failed.",
  },
  {
    name: "internal error",
    code: "INTERNAL_ERROR",
    expectedCode: null,
    statusCode: 500,
    message: "Internal request failed.",
  },
];

const CONTROLLER_METHODS = [
  ["create", "createStripeAccount"],
  ["read", "getStatusOfStripeAccount"],
];

const TEST_CASES = CONTROLLER_METHODS.flatMap(([controllerMethod, serviceMethod]) =>
  ERROR_CASES.map((errorCase) => [controllerMethod, serviceMethod, errorCase])
);

const buildController = (serviceMethod, error) => {
  const controller = Object.create(StripeAccountController.prototype);
  controller.stripeAccountService = {
    [serviceMethod]: jest.fn().mockRejectedValue(error),
  };
  return controller;
};

describe("StripeAccountController error responses", () => {
  it.each(TEST_CASES)("%s handles %s", async (controllerMethod, serviceMethod, errorCase) => {
    const error = Object.assign(new Error(errorCase.message), {
      code: errorCase.code,
      statusCode: errorCase.statusCode,
    });
    const controller = buildController(serviceMethod, error);

    const result = await controller[controllerMethod]({});

    const expectedResponse = { message: error.message };
    if (errorCase.expectedCode) {
      expectedResponse.code = errorCase.expectedCode;
    }
    expect(result).toMatchObject({
      statusCode: errorCase.statusCode,
      response: expectedResponse,
    });
    expect(result.response).toEqual(expectedResponse);
  });
});
