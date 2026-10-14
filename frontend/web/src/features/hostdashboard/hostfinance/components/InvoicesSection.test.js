import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InvoicesSection from "./InvoicesSection";
import { getInvoices } from "../services/invoiceService";

jest.mock("../services/invoiceService", () => ({
  getInvoices: jest.fn(),
}));

const invoice = {
  id: "invoice-1",
  invoice_number: "INV-2026-000123",
  property_name: "Canal House",
  guest_name: "Guest One",
  booking_id: "booking-1",
  arrival_date: Date.UTC(2026, 7, 1),
  departure_date: Date.UTC(2026, 7, 3),
  gross_amount: 200,
  commission_amount: 20,
  net_amount: 180,
  status: "finalized",
  created_at: Date.UTC(2026, 8, 1),
};

describe("InvoicesSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getInvoices.mockResolvedValue([invoice]);
    window.print = jest.fn();
  });

  test("opens the invoice preview from View invoice", async () => {
    render(<InvoicesSection />);

    await screen.findByText("INV-2026-000123");
    fireEvent.click(screen.getByRole("button", { name: "View invoice" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "INVOICE" })).toBeInTheDocument();
  });

  test("closes the invoice preview and returns to the list", async () => {
    render(<InvoicesSection />);

    await screen.findByText("INV-2026-000123");
    fireEvent.click(screen.getByRole("button", { name: "View invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("INV-2026-000123")).toBeInTheDocument();
  });

  test("prints the rendered invoice for PDF saving", async () => {
    render(<InvoicesSection />);

    await screen.findByText("INV-2026-000123");
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(window.print).toHaveBeenCalled());
  });
});
