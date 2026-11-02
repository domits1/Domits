import { fireEvent, render, screen } from "@testing-library/react";
import InvoicesSection from "./InvoicesSection";
import { getInvoices } from "../services/invoiceService";

jest.mock("../services/invoiceService", () => ({
  getInvoices: jest.fn(),
}));

jest.mock("../../../../components/loaders/PulseBarsLoader", () => () => null);

jest.mock("./HostInvoice", () => ({
  __esModule: true,
  default: () => null,
  formatMoney: () => "€10.00",
}));

jest.mock("../mocks/hostInvoiceFixtures", () => ({
  HOST_INVOICE_FIXTURE_ENABLED: false,
  HOST_INVOICE_FIXTURES: [],
}));

describe("InvoicesSection invoice states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a neutral empty state when no invoices are returned", async () => {
    getInvoices.mockResolvedValue([]);

    render(<InvoicesSection />);

    expect(await screen.findByRole("status")).toHaveTextContent("No invoices yet");
    expect(screen.getByText("Your invoices will appear here once they're available.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows a red error state when invoices fail to load", async () => {
    getInvoices.mockRejectedValue(new Error("Request failed"));

    render(<InvoicesSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your invoices");
    expect(screen.getByText("We couldn't retrieve your invoices right now. Please try again later.")).toBeInTheDocument();
    expect(document.querySelector(".invoices-state--error")).toBeInTheDocument();
  });

  test("shows a filtered empty state when no invoices match the selected filter", async () => {
    getInvoices.mockResolvedValue([{ id: "invoice-1", status: "draft" }]);

    render(<InvoicesSection />);
    await screen.findByText("Invoice");

    fireEvent.click(screen.getByRole("button", { name: "Paid" }));

    expect(screen.getByRole("status")).toHaveTextContent("No invoices found");
    expect(screen.getByText("No invoices match the selected filter.")).toBeInTheDocument();
  });
});
