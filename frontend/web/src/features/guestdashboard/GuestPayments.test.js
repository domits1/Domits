import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Auth } from "aws-amplify";
import PaymentsGuestDashboard, {
  buildPaymentsCsv,
  downloadPayments,
  formatAmount,
  getInvoiceUrl,
  getPaymentStatus,
} from "./GuestPayments";
import { getAccessToken } from "../../services/getAccessToken";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentUserInfo: jest.fn(),
  },
}));

jest.mock("../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

describe("GuestPayments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "guest-1" } });
    getAccessToken.mockReturnValue("access-token");
  });

  test("formats payment amounts using cents", () => {
    expect(formatAmount(12500)).toBe("€125.00");
  });

  test("uses only the API invoiceUrl field", () => {
    expect(getInvoiceUrl({ invoiceUrl: "https://example.com/invoice" })).toBe(
      "https://example.com/invoice",
    );
    expect(getInvoiceUrl({ receiptUrl: "https://example.com/receipt" })).toBeNull();
  });

  test("does not report an unknown payment status as paid", () => {
    expect(getPaymentStatus({})).toBe("Status unavailable");
    expect(getPaymentStatus({ status: "failed" })).toBe("failed");
  });

  test("builds CSV rows and escapes quotes", () => {
    const csv = buildPaymentsCsv([
      {
        description: 'Guest "special" payment',
        createdAt: "2026-09-01T12:00:00.000Z",
        amount: 12500,
        currency: "EUR",
        status: "Paid",
      },
    ]);

    expect(csv).toContain('"Guest ""special"" payment"');
    expect(csv).toContain('"125","EUR","Paid"');
  });

  test("downloads the generated CSV", () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = jest.fn().mockReturnValue("blob:payments");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    downloadPayments([]);

    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:payments");

    click.mockRestore();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
    } else {
      delete URL.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
    } else {
      delete URL.revokeObjectURL;
    }
  });

  test("sends the access token when loading payments", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ payments: [] }),
    });

    render(<PaymentsGuestDashboard />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("FetchGuestPayments"),
      expect.objectContaining({
        headers: {
          Authorization: "access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "guest-1" }),
      }),
    );
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
  });

  test("shows an error when loading payments fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

    render(<PaymentsGuestDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Payments unavailable");
  });

  test("shows an unavailable status for a payment without status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        payments: [{ paymentId: "payment-1", amount: 12500 }],
      }),
    });

    render(<PaymentsGuestDashboard />);

    expect(await screen.findByText("Status unavailable")).toBeInTheDocument();
  });
});
