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

  test("shows the host automation list, the stored schedule, the fixed channel, and delivery status", async () => {
    render(<AutomationsContent />);
    expect(await screen.findByText("Paid booking welcome")).toBeInTheDocument();
    await screen.findByRole("option", { name: "Canal Loft" });
    fireEvent.click(screen.getByText("Paid booking welcome"));

    expect(screen.getByLabelText("When to send")).toHaveValue("BOOKING_PAID");
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

  describe("when to send", () => {
    const openEditor = async () => {
      render(<AutomationsContent />);
      await screen.findByText("Paid booking welcome");
      await screen.findByRole("option", { name: "Canal Loft" });
    };

    const choose = (option) => fireEvent.change(screen.getByLabelText("When to send"), { target: { value: option } });

    beforeEach(() => {
      createAutomation.mockImplementation(async (payload) => ({ ...automation, ...payload, id: "automation-2" }));
      updateAutomation.mockImplementation(async (id, payload) => ({ ...automation, ...payload, id }));
    });

    test("offers the six options", async () => {
      await openEditor();

      expect(within(screen.getByLabelText("When to send")).getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Booking paid",
        "Before check-in",
        "On check-in day",
        "After check-in",
        "Before check-out",
        "After check-out",
      ]);
    });

    test("loads an automation saved before the new fields as booking paid and saves it as booking paid", async () => {
      await openEditor();
      fireEvent.click(screen.getByText("Paid booking welcome"));

      expect(screen.getByLabelText("When to send")).toHaveValue("BOOKING_PAID");
      expect(screen.getByLabelText("Time of day")).toBeDisabled();
      expect(screen.queryByText("Applies to bookings paid after you activate it")).not.toBeInTheDocument();
      expect(screen.getByTestId("schedule-sentence")).toHaveTextContent("2 hours after the booking is paid");

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() =>
        expect(updateAutomation).toHaveBeenCalledWith(
          "automation-1",
          expect.objectContaining({
            triggerType: "BOOKING_PAID",
            offsetDirection: null,
            offsetAmount: 2,
            offsetUnit: "HOURS",
            sendTime: null,
          })
        )
      );
    });

    test("describes a check-in rule in one sentence, with the note, and saves it", async () => {
      await openEditor();
      fireEvent.click(screen.getByText("New automation"));
      fireEvent.change(screen.getByLabelText("Automation name"), { target: { value: "Pre-arrival" } });
      choose("BEFORE_CHECK_IN");
      fireEvent.change(screen.getByLabelText("Offset amount"), { target: { value: "3" } });
      fireEvent.change(screen.getByLabelText("Offset unit"), { target: { value: "DAYS" } });
      fireEvent.change(screen.getByLabelText("Time of day"), { target: { value: "10:00" } });

      expect(screen.getByTestId("schedule-sentence")).toHaveTextContent("3 days before check-in, at 10:00 (Amsterdam time)");
      expect(screen.getByText("Applies to bookings paid after you activate it")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() =>
        expect(createAutomation).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerType: "CHECK_IN",
            offsetDirection: "BEFORE",
            offsetAmount: 3,
            offsetUnit: "DAYS",
            sendTime: "10:00",
          })
        )
      );
    });

    test("on the check-in day the amount is fixed at zero", async () => {
      await openEditor();
      fireEvent.click(screen.getByText("New automation"));
      fireEvent.change(screen.getByLabelText("Offset amount"), { target: { value: "4" } });

      choose("ON_CHECK_IN");

      expect(screen.getByLabelText("Offset amount")).toBeDisabled();
      expect(screen.getByLabelText("Offset amount")).toHaveValue(0);
      expect(screen.getByTestId("schedule-sentence")).toHaveTextContent(
        "On the day of check-in, at the property's check-in time (Amsterdam time)"
      );
    });

    test("a time of day is unavailable with hours and is not sent", async () => {
      await openEditor();
      fireEvent.click(screen.getByText("New automation"));
      choose("AFTER_CHECK_OUT");
      fireEvent.change(screen.getByLabelText("Offset amount"), { target: { value: "2" } });
      fireEvent.change(screen.getByLabelText("Offset unit"), { target: { value: "DAYS" } });
      fireEvent.change(screen.getByLabelText("Time of day"), { target: { value: "09:00" } });
      fireEvent.change(screen.getByLabelText("Offset unit"), { target: { value: "HOURS" } });

      expect(screen.getByLabelText("Time of day")).toBeDisabled();
      expect(screen.getByText("A time of day works with days, or on the day of check-in or check-out.")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Save"));
      await waitFor(() => expect(createAutomation).toHaveBeenCalledWith(expect.objectContaining({ sendTime: null })));
    });

    test("loads a stored check-out rule into the picker and its fields", async () => {
      listAutomations.mockResolvedValueOnce([
        {
          ...automation,
          id: "automation-3",
          name: "Thanks",
          triggerType: "CHECK_OUT",
          offsetDirection: "AFTER",
          offsetAmount: 1,
          offsetUnit: "DAYS",
          sendTime: "09:00",
        },
      ]);
      render(<AutomationsContent />);
      fireEvent.click(await screen.findByText("Thanks"));

      expect(screen.getByLabelText("When to send")).toHaveValue("AFTER_CHECK_OUT");
      expect(screen.getByLabelText("Offset amount")).toHaveValue(1);
      expect(screen.getByLabelText("Offset unit")).toHaveValue("DAYS");
      expect(screen.getByLabelText("Time of day")).toHaveValue("09:00");
    });

    test("choosing After check-in after the check-in day starts at one so the rule stays after check-in", async () => {
      await openEditor();
      fireEvent.click(screen.getByText("New automation"));
      choose("ON_CHECK_IN");

      choose("AFTER_CHECK_IN");

      expect(screen.getByLabelText("Offset amount")).toHaveValue(1);
    });
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
      ["guestName", "Guest name", "Guest's name", "Insert guest name"],
      ["propertyName", "Property name", "Name of the property", "Insert property name"],
      ["checkInDate", "Check-in date", "Arrival date", "Insert check-in date"],
      ["checkOutDate", "Check-out date", "Departure date", "Insert check-out date"],
      ["checkInTime", "Check-in time", "Earliest check-in time", "Insert check-in time"],
      ["checkOutTime", "Check-out time", "Latest check-out time", "Insert check-out time"],
      ["propertyAddress", "Address", "Street, number and postal code", "Insert address"],
      ["propertyCity", "City", "City of the property", "Insert city"],
      ["numberOfGuests", "Number of guests", "Number of guests on the booking", "Insert number of guests"],
    ];

    const renderEditor = async () => {
      render(<AutomationsContent />);
      await screen.findByText("Paid booking welcome");
      await screen.findByRole("option", { name: "Canal Loft" });
      return within(screen.getByLabelText("Supported variables"));
    };

    test("offers every supported variable as a readable label, in the same order", async () => {
      const variables = await renderEditor();

      expect(variables.getAllByRole("button").map((button) => button.textContent)).toEqual(
        EXPECTED.map(([, shortLabel]) => shortLabel)
      );
    });

    test("shows no raw tag on a chip", async () => {
      const variables = await renderEditor();

      variables.getAllByRole("button").forEach((button) => expect(button.textContent).not.toContain("{{"));
    });

    test.each(EXPECTED)("explains {{%s}} in the tooltip with the description and the tag", async (name, shortLabel, description) => {
      const variables = await renderEditor();

      expect(variables.getByRole("button", { name: `Insert ${shortLabel.toLowerCase()}` })).toHaveAttribute(
        "title",
        `${description} · {{${name}}}`
      );
    });

    test.each(EXPECTED)("gives the {{%s}} chip a screen reader label", async (_name, _short, _description, ariaLabel) => {
      const variables = await renderEditor();

      expect(variables.getByRole("button", { name: ariaLabel })).toHaveAttribute("aria-label", ariaLabel);
    });

    test.each(EXPECTED.slice(4))("adds {{%s}} to the end of the template when the message box was not focused", async (name, _short, _description, ariaLabel) => {
      const variables = await renderEditor();
      fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "Welcome. " } });

      fireEvent.click(variables.getByRole("button", { name: ariaLabel }));

      expect(screen.getByLabelText("Message template")).toHaveValue(`Welcome. {{${name}}}`);
    });

    test("inserts the variable at the cursor and keeps the cursor after it", async () => {
      const variables = await renderEditor();
      const template = screen.getByLabelText("Message template");
      fireEvent.change(template, { target: { value: "Hi , welcome." } });
      template.focus();
      template.setSelectionRange(3, 3);

      fireEvent.click(variables.getByRole("button", { name: "Insert guest name" }));

      expect(template).toHaveValue("Hi {{guestName}}, welcome.");
      expect(template).toHaveFocus();
      expect(template.selectionStart).toBe(16);
      expect(template.selectionEnd).toBe(16);
    });

    test("replaces the selected text with the variable", async () => {
      const variables = await renderEditor();
      const template = screen.getByLabelText("Message template");
      fireEvent.change(template, { target: { value: "Stay at NAME tonight." } });
      template.focus();
      template.setSelectionRange(8, 12);

      fireEvent.click(variables.getByRole("button", { name: "Insert property name" }));

      expect(template).toHaveValue("Stay at {{propertyName}} tonight.");
    });

    test("appends again after switching to another automation", async () => {
      const variables = await renderEditor();
      const template = screen.getByLabelText("Message template");
      template.focus();
      template.setSelectionRange(0, 0);

      fireEvent.click(screen.getByText("Paid booking welcome"));
      template.setSelectionRange(0, 0);
      fireEvent.click(variables.getByRole("button", { name: "Insert city" }));

      expect(template).toHaveValue("Hi {{guestName}} at {{propertyName}}{{propertyCity}}");
    });

    test("sends a template with a new variable to the backend preview", async () => {
      const variables = await renderEditor();
      fireEvent.change(screen.getByLabelText("Message template"), { target: { value: "Check-in from " } });
      fireEvent.click(variables.getByRole("button", { name: "Insert check-in time" }));

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
