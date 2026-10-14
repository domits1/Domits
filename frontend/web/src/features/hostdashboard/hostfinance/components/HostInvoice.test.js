import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import HostInvoice from "./HostInvoice";

const invoice = {
  invoice_number: "INV-2026-000123",
  created_at: Date.UTC(2026, 8, 1),
  property_name: "Canal House",
  property_id: "property-1",
  booking_id: "booking-1",
  guest_name: "Guest One",
  arrival_date: Date.UTC(2026, 7, 1),
  departure_date: Date.UTC(2026, 7, 3),
  nights: 2,
  rate_per_night: 100,
  gross_amount: 200,
  commission_amount: 20,
  net_amount: 180,
  currency: "EUR",
  status: "finalized",
};

describe("HostInvoice", () => {
  test("renders the available invoice fields and totals", () => {
    render(<HostInvoice invoice={invoice} />);

    expect(screen.getByRole("heading", { name: "INVOICE" })).toBeInTheDocument();
    expect(screen.getByText("INV-2026-000123")).toBeInTheDocument();
    expect(screen.getByText("Canal House")).toBeInTheDocument();
    expect(screen.getByText("€200.00")).toBeInTheDocument();
    expect(screen.getByText("€180.00")).toBeInTheDocument();
    expect(screen.getByText("Finalized")).toBeInTheDocument();
  });

  test("omits unavailable host and payout fields", () => {
    render(<HostInvoice invoice={invoice} />);

    expect(screen.queryByText("Payout reference")).not.toBeInTheDocument();
    expect(screen.queryByText("Billed to")).not.toBeInTheDocument();
    expect(screen.queryByText("VAT:")).not.toBeInTheDocument();
  });

  test("renders the commission as total deductions", () => {
    render(<HostInvoice invoice={invoice} />);

    expect(screen.getByText("Commission deduction")).toBeInTheDocument();
    expect(screen.getByText("Total deductions")).toBeInTheDocument();
    expect(screen.getAllByText("-€20.00")).toHaveLength(2);
  });
});
