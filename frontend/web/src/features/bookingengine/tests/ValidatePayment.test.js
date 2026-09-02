import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import ValidatePayment from "../ValidatePayment";
import ActivateBooking from "../services/ActivateBooking";
import DeactivateBooking from "../services/DeactivateBooking";

jest.mock("@stripe/react-stripe-js", () => ({
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("../services/ActivateBooking", () => jest.fn());
jest.mock("../services/DeactivateBooking", () => jest.fn());

describe("ValidatePayment", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useElements.mockReturnValue({});
    window.history.pushState({}, "", "/validatepayment?id=booking-1&payment_intent_client_secret=secret_123");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockStripePaymentIntent = (status, id = "pi_test_123") => {
    const retrievePaymentIntent = jest.fn().mockResolvedValue({
      paymentIntent: {
        id,
        status,
      },
    });

    useStripe.mockReturnValue({
      retrievePaymentIntent,
    });

    return retrievePaymentIntent;
  };

  test("activates booking and navigates on succeeded payment intent", async () => {
    const retrievePaymentIntent = mockStripePaymentIntent("succeeded", "pi_success_123");

    render(<ValidatePayment />);

    expect(await screen.findByRole("heading", { name: "Success! Payment received." })).toBeInTheDocument();

    expect(retrievePaymentIntent).toHaveBeenCalledWith("secret_123");
    expect(ActivateBooking).toHaveBeenCalledWith("pi_success_123");
    expect(DeactivateBooking).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/bookingconfirmationoverview?&id=booking-1&paymentId=pi_success_123");
  });

  test("shows processing message and schedules retry when payment is processing", async () => {
    jest.useFakeTimers();
    const retrievePaymentIntent = mockStripePaymentIntent("processing", "pi_processing_123");

    render(<ValidatePayment />);

    expect(await screen.findByRole("heading", { name: /Payment is still processing/ })).toBeInTheDocument();

    expect(retrievePaymentIntent).toHaveBeenCalledWith("secret_123");
    expect(jest.getTimerCount()).toBe(1);
    expect(ActivateBooking).not.toHaveBeenCalled();
    expect(DeactivateBooking).not.toHaveBeenCalled();
  });

  test("deactivates booking and shows failure message when payment method is required", async () => {
    const retrievePaymentIntent = mockStripePaymentIntent("requires_payment_method", "pi_failed_123");

    render(<ValidatePayment />);

    expect(
      await screen.findByRole("heading", {
        name: "Payment failed. Please try another payment method. No charges have been made.",
      })
    ).toBeInTheDocument();

    expect(retrievePaymentIntent).toHaveBeenCalledWith("secret_123");
    expect(DeactivateBooking).toHaveBeenCalledWith("pi_failed_123");
    expect(ActivateBooking).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("shows fallback message for unknown payment status", async () => {
    const retrievePaymentIntent = mockStripePaymentIntent("unexpected_state", "pi_unknown_123");

    render(<ValidatePayment />);

    expect(
      await screen.findByRole("heading", {
        name: "Something went wrong. Please contact support with error unexpected_state.",
      })
    ).toBeInTheDocument();

    expect(retrievePaymentIntent).toHaveBeenCalledWith("secret_123");
    expect(ActivateBooking).not.toHaveBeenCalled();
    expect(DeactivateBooking).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("still attempts to retrieve payment intent when client secret is missing", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const retrievePaymentIntent = jest.fn().mockResolvedValue({ paymentIntent: null });

    useStripe.mockReturnValue({
      retrievePaymentIntent,
    });
    window.history.pushState({}, "", "/validatepayment?id=booking-1");

    render(<ValidatePayment />);

    await waitFor(() => {
      expect(retrievePaymentIntent).toHaveBeenCalledWith(null);
    });

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith("No PaymentIntent received!!");
  });

  test("keeps loading state when stripe is not ready", () => {
    useStripe.mockReturnValue(null);

    render(<ValidatePayment />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(ActivateBooking).not.toHaveBeenCalled();
    expect(DeactivateBooking).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
