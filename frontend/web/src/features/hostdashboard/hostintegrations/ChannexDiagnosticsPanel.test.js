import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChannexDiagnosticsPanel from "./ChannexDiagnosticsPanel";
import {
  cancelBooking,
  getChannexAriPreview,
  getLatestChannexSyncEvidence,
  getChannexStatus,
  listChannexProperties,
  listChannexRatePlans,
  listChannexRoomTypes,
  listChannexBookingRevisions,
  modifyBookingDates,
  pullLatestChannexBookings,
  saveChannexSetupMapping,
  syncChannexCertificationTestCase,
  syncChannexFull,
  syncChannexRestrictions,
} from "./channexApi";

jest.mock("./channexApi", () => ({
  cancelBooking: jest.fn(),
  getChannexAriPayloadPreview: jest.fn(),
  getChannexAriPreview: jest.fn(),
  getChannexAriTargets: jest.fn(),
  getChannexStatus: jest.fn(),
  getLatestChannexSyncEvidence: jest.fn(),
  listChannexProperties: jest.fn(),
  listChannexRatePlans: jest.fn(),
  listChannexRoomTypes: jest.fn(),
  listChannexBookingRevisions: jest.fn(),
  modifyBookingDates: jest.fn(),
  pullLatestChannexBookings: jest.fn(),
  saveChannexSetupMapping: jest.fn(),
  ackChannexBookingRevisions: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  syncChannexAri: jest.fn(),
  syncChannexAvailability: jest.fn(),
  syncChannexCertificationTestCase: jest.fn(),
  syncChannexFull: jest.fn(),
  syncChannexRestrictions: jest.fn(),
}));

const fillRequiredInputs = ({ dateTo = "2027-10-05", openActions = true } = {}) => {
  fireEvent.change(screen.getByLabelText("Domits property ID"), {
    target: { value: "domits-property-1" },
  });
  fireEvent.change(screen.getByLabelText("Date from"), {
    target: { value: "2026-05-24" },
  });
  fireEvent.change(screen.getByLabelText("Date to"), {
    target: { value: dateTo },
  });
  if (openActions) {
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  }
};

const renderDiagnosticsPanel = async () => {
  render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
  await waitFor(() => expect(getChannexStatus).toHaveBeenCalledTimes(1));
};

describe("ChannexDiagnosticsPanel certification actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(globalThis, "confirm").mockReturnValue(true);
    getChannexStatus.mockResolvedValue({ status: "CONNECTED" });
    getLatestChannexSyncEvidence.mockResolvedValue({ item: null });
    listChannexBookingRevisions.mockResolvedValue({ revisions: [], count: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("runs restrictions/rates sync as one selected-range backend action", async () => {
    syncChannexRestrictions.mockResolvedValue({
      restrictionsSyncMode: "single-request-v1",
      requestCount: 1,
      taskIds: ["task-restrictions-1"],
      results: [{ taskId: "task-restrictions-1" }],
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(1));
    expect(syncChannexRestrictions.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        domitsPropertyId: "domits-property-1",
        dateFrom: "2026-05-24",
        dateTo: "2027-10-05",
      })
    );
    expect(await screen.findByText("Sync restrictions/rates completed.")).toBeTruthy();
    expect(screen.getAllByText(/task-restrictions-1/).length).toBeGreaterThan(0);
  });

  test("shows backend error details for failed restrictions sync", async () => {
    const error = new Error("POST /integrations/channex/sync/restrictions failed with status 500: provider timeout");
    error.status = 500;
    error.endpoint = "/integrations/channex/sync/restrictions";
    error.method = "POST";
    error.responseBody = {
      error: "Failed to sync Channex restrictions.",
    };
    syncChannexRestrictions.mockRejectedValueOnce(error);

    await renderDiagnosticsPanel();
    fillRequiredInputs({ dateTo: "2026-07-23" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/POST \/integrations\/channex\/sync\/restrictions failed/)).toBeTruthy();
    expect(screen.getByText("HTTP status")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
  });

  test("blocks restrictions sync ranges over 500 days before sending", async () => {
    await renderDiagnosticsPanel();
    fillRequiredInputs({ dateTo: "2027-10-06" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    expect(syncChannexRestrictions).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The selected range is 501 days. Channex certification syncs support up to 500 inclusive days."
      )
    ).toBeTruthy();
  });

  test("hides numbered certification test cases and keeps demo actions visible", async () => {
    await renderDiagnosticsPanel();
    fillRequiredInputs();

    expect(screen.getByRole("button", { name: "Sync availability" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Full/certification sync" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Modify booking dates" })).toBeTruthy();
    expect(screen.queryByText("Change-only certification test cases")).toBeNull();
    for (const testCaseId of ["2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      expect(screen.queryByRole("button", { name: `Run #${testCaseId}` })).toBeNull();
    }
    expect(screen.queryByRole("button", { name: "Receive booking revisions" })).toBeNull();
    expect(syncChannexCertificationTestCase).not.toHaveBeenCalled();
  });

  test("saves a single-unit Channex setup mapping from the setup tab", async () => {
    listChannexProperties.mockResolvedValue({
      properties: [
        {
          externalPropertyId: "external-property-1",
          externalPropertyName: "Demo Channex property",
        },
      ],
    });
    listChannexRoomTypes.mockResolvedValue({
      roomTypes: [
        {
          externalRoomTypeId: "room-type-1",
          externalRoomTypeName: "Demo room",
        },
      ],
    });
    listChannexRatePlans.mockResolvedValue({
      ratePlans: [
        {
          externalRatePlanId: "rate-plan-1",
          externalRatePlanName: "Standard rate",
        },
      ],
    });
    saveChannexSetupMapping.mockResolvedValue({
      action: "setup-mapping",
      scope: "SINGLE_UNIT",
      integrationAccountId: "integration-account-1",
      ready: true,
      readinessStatusCode: 200,
      savedMappings: {
        property: { externalPropertyId: "external-property-1" },
        roomType: { externalRoomTypeId: "room-type-1" },
        ratePlan: { externalRatePlanId: "rate-plan-1" },
      },
      readiness: {
        ready: true,
        domitsPropertyId: "domits-property-1",
        integrationAccountId: "integration-account-1",
        missingMappings: [],
      },
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs({ openActions: false });
    fireEvent.click(screen.getByRole("button", { name: "Setup & Connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Load Channex resources" }));

    await waitFor(() => expect(listChannexProperties).toHaveBeenCalledTimes(1));
    expect(listChannexProperties).toHaveBeenCalledWith({ userId: "user-1" });

    fireEvent.change(await screen.findByLabelText("Channex property"), {
      target: { value: "external-property-1" },
    });
    await waitFor(() => expect(listChannexRoomTypes).toHaveBeenCalledTimes(1));
    expect(listChannexRoomTypes).toHaveBeenCalledWith({
      userId: "user-1",
      externalPropertyId: "external-property-1",
    });

    fireEvent.change(await screen.findByLabelText("Channex room type"), {
      target: { value: "room-type-1" },
    });
    await waitFor(() => expect(listChannexRatePlans).toHaveBeenCalledTimes(1));
    expect(listChannexRatePlans).toHaveBeenCalledWith({
      userId: "user-1",
      externalRoomTypeId: "room-type-1",
    });

    fireEvent.change(await screen.findByLabelText("Channex rate plan"), {
      target: { value: "rate-plan-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save mapping" }));

    await waitFor(() => expect(saveChannexSetupMapping).toHaveBeenCalledTimes(1));
    expect(saveChannexSetupMapping).toHaveBeenCalledWith({
      userId: "user-1",
      mapping: {
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalPropertyName: "Demo Channex property",
        externalRoomTypeId: "room-type-1",
        externalRoomTypeName: "Demo room",
        externalRatePlanId: "rate-plan-1",
        externalRatePlanName: "Standard rate",
        status: "ACTIVE",
        scope: "SINGLE_UNIT",
      },
    });
    expect(await screen.findByText("Single-unit Channex mapping saved.")).toBeTruthy();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Readiness response")).toBeTruthy();
  });

  test("shows setup resource load errors", async () => {
    listChannexProperties.mockRejectedValueOnce(new Error("Channex property list failed"));

    await renderDiagnosticsPanel();
    fillRequiredInputs({ openActions: false });
    fireEvent.click(screen.getByRole("button", { name: "Setup & Connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Load Channex resources" }));

    await waitFor(() => expect(listChannexProperties).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Channex property list failed")).toBeTruthy();
  });

  test("runs full/certification sync from the admin actions UI", async () => {
    syncChannexFull.mockResolvedValue({
      requestCount: 2,
      calledProvider: true,
      overallSuccess: true,
      taskIds: ["task-availability-full", "task-restrictions-full"],
      warnings: [],
      errors: [],
      steps: {
        availability: {
          calledProvider: true,
          requestCount: 1,
          success: true,
          taskIds: ["task-availability-full"],
        },
        restrictions: {
          calledProvider: true,
          requestCount: 1,
          success: true,
          taskIds: ["task-restrictions-full"],
        },
      },
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Full/certification sync" }));

    await waitFor(() => expect(syncChannexFull).toHaveBeenCalledTimes(1));
    expect(syncChannexFull).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
      dateFrom: "2026-05-24",
      dateTo: "2027-10-05",
    });
    expect(await screen.findByText("Full/certification sync completed.")).toBeTruthy();
    expect(screen.getByText("Full/certification sync summary")).toBeTruthy();
    expect(screen.getByText("Full Sync provider calls: 1 availability, 1 restrictions/rates.")).toBeTruthy();
    expect(screen.getByText("Availability call")).toBeTruthy();
    expect(screen.getByText("Restrictions/rates call")).toBeTruthy();
    expect(screen.getByText("Warnings")).toBeTruthy();
    expect(screen.getByText("Errors")).toBeTruthy();
    expect(screen.getAllByText(/task-availability-full/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/task-restrictions-full/).length).toBeGreaterThan(0);
  });

  test("shows booking-aware ARI preview availability as blocked by an active booking", async () => {
    getChannexAriPreview.mockResolvedValue({
      sourceSummary: {
        bookingAwareAvailability: true,
        activeBookingNightCount: 1,
        sellableUnitCount: 1,
      },
      availabilityPreview: [
        {
          externalRoomTypeId: "room-type-1",
          date: "2026-06-01",
          availability: false,
          baseAvailability: true,
          activeBookingCount: 1,
          sellableUnitCount: 1,
          availableUnitCount: 0,
        },
      ],
      rateRestrictionPreview: [],
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs({ dateTo: "2026-06-01", openActions: false });
    fireEvent.click(screen.getByRole("button", { name: "ARI Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Load ARI preview" }));

    await waitFor(() => expect(getChannexAriPreview).toHaveBeenCalledTimes(1));
    const blockedCell = await screen.findByText("Blocked by booking");
    const row = blockedCell.closest("tr");
    expect(within(row).getByText("2026-06-01")).toBeTruthy();
    expect(within(row).getByText("room-type-1")).toBeTruthy();
    expect(within(row).getByText("Yes")).toBeTruthy();
    expect(within(row).getByText("No")).toBeTruthy();
    expect(within(row).getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(within(row).getByText("0")).toBeTruthy();
  });

  test("renders older ARI preview responses without booking-aware fields", async () => {
    getChannexAriPreview.mockResolvedValue({
      sourceSummary: {},
      availabilityPreview: [
        {
          externalRoomTypeId: "room-type-legacy",
          date: "2026-06-02",
          availability: true,
        },
      ],
      rateRestrictionPreview: [],
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs({ dateTo: "2026-06-02", openActions: false });
    fireEvent.click(screen.getByRole("button", { name: "ARI Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Load ARI preview" }));

    await waitFor(() => expect(getChannexAriPreview).toHaveBeenCalledTimes(1));
    const availableCell = await screen.findByText("Available");
    const row = availableCell.closest("tr");
    expect(within(row).getByText("2026-06-02")).toBeTruthy();
    expect(within(row).getByText("room-type-legacy")).toBeTruthy();
    expect(within(row).getByText("Yes")).toBeTruthy();
  });

  test("modifies booking dates from the admin actions UI", async () => {
    modifyBookingDates.mockResolvedValue({
      booking: {
        id: "7434e9b5-a4d1-4aab-9f8a-27a5a42299b0",
        arrivaldate: 1780531200000,
        departuredate: 1780704000000,
      },
      channexAvailabilitySync: {
        syncType: "booking-availability",
        taskIds: ["task-booking-availability"],
        overallSuccess: true,
      },
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Modify booking dates" }));

    await waitFor(() => expect(modifyBookingDates).toHaveBeenCalledTimes(1));
    expect(modifyBookingDates).toHaveBeenCalledWith({
      bookingId: "7434e9b5-a4d1-4aab-9f8a-27a5a42299b0",
      arrivalDate: "2026-06-04",
      departureDate: "2026-06-06",
    });
    expect(getLatestChannexSyncEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        domitsPropertyId: "domits-property-1",
      })
    );
    expect(await screen.findByText("Booking dates modified.")).toBeTruthy();
    expect(screen.getAllByText(/task-booking-availability/).length).toBeGreaterThan(0);
  });

  test("requires booking modify fields before sending", async () => {
    await renderDiagnosticsPanel();
    fillRequiredInputs();

    fireEvent.change(screen.getByLabelText("Booking ID"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modify booking dates" }));

    expect(modifyBookingDates).not.toHaveBeenCalled();
    expect(await screen.findByText("Enter booking ID, new arrival date, and new departure date.")).toBeTruthy();
  });

  test("cancels a booking from the admin actions UI and shows change-only sync evidence", async () => {
    cancelBooking.mockResolvedValue({
      booking: {
        id: "7434e9b5-a4d1-4aab-9f8a-27a5a42299b0",
        status: "Cancelled",
      },
      channexAvailabilitySync: {
        syncType: "booking-availability",
        trigger: "BOOKING_CANCELLED",
        requestCount: 1,
        taskIds: ["task-cancel-availability"],
        affectedDates: ["2026-06-01", "2026-06-02"],
        warnings: [{ code: "DEMO_WARNING", message: "Visible cancel warning" }],
        errors: [],
        overallSuccess: true,
      },
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledTimes(1));
    expect(cancelBooking).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
      bookingId: "7434e9b5-a4d1-4aab-9f8a-27a5a42299b0",
      reason: "Channex certification demo cancellation",
    });
    expect(getLatestChannexSyncEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        domitsPropertyId: "domits-property-1",
      })
    );
    expect(await screen.findByText("Booking cancelled.")).toBeTruthy();
    expect(screen.getByText("Cancellation availability sync summary")).toBeTruthy();
    expect(screen.getByText("booking-availability")).toBeTruthy();
    expect(screen.getByText("BOOKING_CANCELLED")).toBeTruthy();
    expect(screen.getByText("Change-only availability sync. Full Sync and restrictions/rates were not called.")).toBeTruthy();
    expect(screen.getAllByText(/task-cancel-availability/).length).toBeGreaterThan(0);
    expect(screen.getByText(/DEMO_WARNING: Visible cancel warning/)).toBeTruthy();
  });

  test("pulls latest Channex bookings from the booking revisions tab and refreshes the log", async () => {
    pullLatestChannexBookings.mockResolvedValue({
      fetchedCount: 1,
      rawPersistedCount: 1,
      createdBookingCount: 1,
      updatedBookingCount: 0,
      cancelledBookingCount: 0,
      skippedCount: 0,
      ackedCount: 1,
      unackedCount: 0,
      warnings: [{ code: "DEMO_WARNING", message: "Visible pull warning" }],
      errors: [{ code: "DEMO_ERROR", message: "Visible pull error" }],
      items: [
        {
          revisionId: "revision-new-1",
          bookingId: "booking-ota-1",
          status: "new",
          domitsBookingId: "domits-booking-1",
          result: "created-and-acked",
        },
      ],
    });

    await renderDiagnosticsPanel();
    fillRequiredInputs({ openActions: false });
    fireEvent.click(screen.getByRole("button", { name: "Booking Revisions" }));
    fireEvent.click(screen.getByRole("button", { name: "Pull latest Channex bookings" }));

    await waitFor(() => expect(pullLatestChannexBookings).toHaveBeenCalledTimes(1));
    expect(pullLatestChannexBookings).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
    });
    expect(await screen.findByText("Pull latest Channex bookings summary")).toBeTruthy();
    expect(screen.getByText("Fetched")).toBeTruthy();
    expect(screen.getByText("Raw persisted")).toBeTruthy();
    expect(screen.getByText("Created bookings")).toBeTruthy();
    expect(screen.getByText("Updated bookings")).toBeTruthy();
    expect(screen.getByText("Cancelled bookings")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
    expect(screen.getByText("Acked")).toBeTruthy();
    expect(screen.getByText("Unacked")).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/DEMO_WARNING: Visible pull warning/)).toBeTruthy();
    expect(screen.getByText(/DEMO_ERROR: Visible pull error/)).toBeTruthy();
    await waitFor(() => expect(listChannexBookingRevisions).toHaveBeenCalledTimes(1));
    expect(listChannexBookingRevisions).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
      includeRawPayload: false,
      limit: "50",
    });
  });
});
