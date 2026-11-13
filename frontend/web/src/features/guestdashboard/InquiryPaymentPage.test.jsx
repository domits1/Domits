import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import InquiryPaymentPage from "./InquiryPaymentPage";

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/guestdashboard/pay/booking-1" }),
  useNavigate: () => jest.fn(),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
}));

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../bookingengine/views/SetupForm", () => {
  const ReactModule = require("react");
  return {
    __esModule: true,
    default: () => ReactModule.createElement("div", { "data-testid": "setup-form" }),
  };
});

describe("InquiryPaymentPage payment setup retry", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("CognitoIdentityServiceProvider.test-user.accessToken", "test-access-token");
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = undefined;
  });

  test("lets the guest retry payment setup after the payment intent is unavailable", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: "Payment not found." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ stripeClientSecret: "secret_retry" }),
      });

    render(<InquiryPaymentPage />);

    expect(await screen.findByText(/Your booking is still awaiting payment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry payment" }));

    expect(await screen.findByTestId("setup-form")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain("/development/bookings");
    expect(global.fetch.mock.calls[1][1]).toMatchObject({
      method: "PATCH",
      headers: {
        Authorization: "test-access-token",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      action: "retry-payment-setup",
      bookingId: "booking-1",
    });
  });

  test("keeps a clear retry message when payment setup still fails", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ message: "Stripe could not prepare payment." }),
      });

    render(<InquiryPaymentPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry payment" }));

    expect(await screen.findByText("Stripe could not prepare payment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry payment" })).toBeEnabled();
  });
});
