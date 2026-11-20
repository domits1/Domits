/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AutomationsContent } from "./AutomationsPage";
import { useAuth } from "../hooks/useAuth";
import { fetchAccommodationsByOwnerId } from "../../../../services/fetchAccommodationByOwnerIdService";
import {
  activateAutomation,
  createAutomation,
  listAutomationDeliveries,
  listAutomations,
  pauseAutomation,
  previewAutomation,
  updateAutomation,
} from "../services/automationService";

jest.mock("../hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../services/fetchAccommodationByOwnerIdService", () => ({
  fetchAccommodationsByOwnerId: jest.fn(),
}));
jest.mock("../services/automationService", () => ({
  activateAutomation: jest.fn(),
  createAutomation: jest.fn(),
  listAutomationDeliveries: jest.fn(),
  listAutomations: jest.fn(),
  pauseAutomation: jest.fn(),
  previewAutomation: jest.fn(),
  updateAutomation: jest.fn(),
}));

const automation = {
  id: "automation-1",
  name: "Paid booking welcome",
  propertyId: "property-1",
  triggerType: "BOOKING_PAID",
  offsetAmount: 2,
  offsetUnit: "HOURS",
  template: "Hi {{guestName}} at {{propertyName}}",
  channel: "DOMITS_DIRECT",
  status: "DRAFT",
  createdAt: 1,
  updatedAt: 1,
};

describe("host automated messages v1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ userId: "host-1", accessToken: "access-token-1" });
    fetchAccommodationsByOwnerId.mockResolvedValue([{ id: "property-1", title: "Canal Loft" }]);
    listAutomations.mockResolvedValue([automation]);
    listAutomationDeliveries.mockResolvedValue([
      {
        id: "delivery-1",
        automationId: "automation-1",
        bookingId: "booking-1",
        scheduledFor: Date.UTC(2026, 5, 20),
        status: "FAILED",
        failureReason: "Domits Direct delivery failed.",
        sentAt: null,
      },
    ]);
    createAutomation.mockImplementation(async (_token, payload) => ({ ...automation, ...payload, id: "automation-2" }));
    updateAutomation.mockImplementation(async (_token, id, payload) => ({ ...automation, ...payload, id }));
    activateAutomation.mockResolvedValue({ ...automation, status: "ACTIVE" });
    pauseAutomation.mockResolvedValue({ ...automation, status: "PAUSED" });
    previewAutomation.mockResolvedValue({
      renderedContent: "Hi Taylor at Canal Loft",
      missingVariables: [],
    });
  });

  test("shows the host automation list, fixed trigger/channel, and delivery status", async () => {
    render(<AutomationsContent />);
    expect(await screen.findByText("Paid booking welcome")).toBeInTheDocument();
    await screen.findByRole("option", { name: "Canal Loft" });
    fireEvent.click(screen.getByText("Paid booking welcome"));

    expect(screen.getByLabelText("Trigger")).toHaveValue("BOOKING_PAID");
    expect(screen.getByLabelText("Channel")).toHaveValue("DOMITS_DIRECT");
    expect(await screen.findByText("FAILED")).toBeInTheDocument();
    expect(await screen.findByText("Domits Direct delivery failed.")).toBeInTheDocument();
    expect(screen.queryByText(/Email|SMS|WhatsApp|OTA/i)).not.toBeInTheDocument();
  });

  test("normalizes null automation and property responses to empty states", async () => {
    listAutomations.mockResolvedValueOnce(null);
    fetchAccommodationsByOwnerId.mockResolvedValueOnce(null);

    render(<AutomationsContent />);

    expect(await screen.findByText("No automations yet.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All owned properties" })).toBeInTheDocument();
  });

  test("shows loading while the automation request is pending", async () => {
    listAutomations.mockReturnValueOnce(new Promise(() => {}));

    render(<AutomationsContent />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await screen.findByRole("option", { name: "Canal Loft" });
  });

  test("shows empty states for empty arrays", async () => {
    listAutomations.mockResolvedValueOnce([]);
    fetchAccommodationsByOwnerId.mockResolvedValueOnce([]);

    render(<AutomationsContent />);

    expect(await screen.findByText("No automations yet.")).toBeInTheDocument();
  });

  test("shows API errors without replacing them with an empty-state failure", async () => {
    listAutomations.mockRejectedValueOnce(new Error("Automation API unavailable."));

    render(<AutomationsContent />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Automation API unavailable.");
  });

  test("creates and edits an automation with one offset", async () => {
    render(<AutomationsContent />);
    await screen.findByText("Paid booking welcome");
    await screen.findByRole("option", { name: "Canal Loft" });

    fireEvent.click(screen.getByText("New automation"));
    fireEvent.change(screen.getByLabelText("Automation name"), { target: { value: "New welcome" } });
    fireEvent.change(screen.getByLabelText("Offset amount"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Offset unit"), { target: { value: "DAYS" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(createAutomation).toHaveBeenCalled());
    expect(createAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New welcome", offsetAmount: 1, offsetUnit: "DAYS", channel: "DOMITS_DIRECT" })
    );

    fireEvent.change(screen.getByLabelText("Automation name"), { target: { value: "Edited welcome" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(updateAutomation).toHaveBeenCalledWith(
      "automation-2",
      expect.objectContaining({ name: "Edited welcome" })
    ));
  });

  test("activates and pauses an automation", async () => {
    render(<AutomationsContent />);
    fireEvent.click(await screen.findByText("Paid booking welcome"));
    await screen.findByRole("option", { name: "Canal Loft" });
    fireEvent.click(screen.getByText("Activate"));
    await waitFor(() => expect(activateAutomation).toHaveBeenCalledWith("automation-1"));

    fireEvent.click(await screen.findByText("Pause"));
    await waitFor(() => expect(pauseAutomation).toHaveBeenCalledWith("automation-1"));
  });

  describe("variable buttons", () => {
    const EXPECTED = [
      ["guestName", "Guest's name"],
      ["propertyName", "Name of the property"],
      ["checkInDate", "Arrival date"],
      ["checkOutDate", "Departure date"],
      ["checkInTime", "Earliest check-in time"],
      ["checkOutTime", "Latest check-out time"],
      ["propertyAddress", "Street, number and postal code"],
      ["propertyCity", "City of the property"],
      ["numberOfGuests", "Number of guests on the booking"],
    ];

    const renderEditor = async () => {
      render(<AutomationsContent />);
      await screen.findByText("Paid booking welcome");
      await screen.findByRole("option", { name: "Canal Loft" });
      return within(screen.getByLabelText("Supported variables"));
    };

    test("offers every supported variable, the new ones after the four existing ones", async () => {
      const variables = await renderEditor();

      expect(variables.getAllByRole("button").map((button) => button.textContent)).toEqual(
        EXPECTED.map(([name]) => `{{${name}}}`)
      );
    });

    test.each(EXPECTED)("explains {{%s}} with a short tooltip", async (name, label) => {
      const variables = await renderEditor();

      expect(variables.getByRole("button", { name: `{{${name}}}` })).toHaveAttribute("title", label);
    });

    test.each(EXPECTED.slice(4))("adds {{%s}} to the end of the template when clicked", async (name) => {
      const variables = await renderEditor();
      fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "Welcome. " } });

      fireEvent.click(variables.getByRole("button", { name: `{{${name}}}` }));

      expect(screen.getByLabelText("Message template")).toHaveValue(`Welcome. {{${name}}}`);
    });

    test("sends a template with a new variable to the backend preview", async () => {
      const variables = await renderEditor();
      fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "Check-in from " } });
      fireEvent.click(variables.getByRole("button", { name: "{{checkInTime}}" }));

      fireEvent.click(screen.getByText("Render preview"));

      await waitFor(() =>
        expect(previewAutomation).toHaveBeenCalledWith(
          expect.objectContaining({ template: "Check-in from {{checkInTime}}" }),
          null
        )
      );
    });
  });

  test("uses the backend renderer for preview and reports invalid variables", async () => {
    render(<AutomationsContent />);
    await screen.findByText("Paid booking welcome");
    await screen.findByRole("option", { name: "Canal Loft" });
    fireEvent.click(screen.getByText("Render preview"));
    expect(await screen.findByText("Hi Taylor at Canal Loft")).toBeInTheDocument();
    expect(previewAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ template: expect.stringContaining("guestName") }),
      null
    );

    const error = new Error("Template contains unsupported variables.");
    error.details = { unknownVariables: ["paymentLink"] };
    previewAutomation.mockRejectedValueOnce(error);
    fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "Pay at {{paymentLink}}" } });
    fireEvent.click(screen.getByText("Render preview"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported variables: paymentLink");
  });
});
