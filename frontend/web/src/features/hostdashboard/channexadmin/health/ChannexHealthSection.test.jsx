import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ChannexHealthSection from "./ChannexHealthSection";
import { getChannexHealth } from "../../hostintegrations/channexApi";

jest.mock("../../hostintegrations/channexApi", () => ({
  getChannexHealth: jest.fn(),
}));

const GENERATED_AT = Date.parse("2026-11-11T10:00:00Z");
const LAST_REVISION_AT = Date.parse("2026-10-27T15:03:44Z");
const LAST_POLL_AT = Date.parse("2026-11-11T09:56:01Z");

const degradedHealth = {
  generatedAt: GENERATED_AT,
  status: "DEGRADED",
  reasons: [{ code: "FAILED_CHANGES", count: 2 }],
  outbox: {
    pending: 3,
    processing: 1,
    oldestPendingCreatedAt: GENERATED_AT - 60 * 1000,
    failedLast24Hours: 2,
    failedLast7Days: 2,
    processedLast7Days: 31,
    recentFailures: [
      {
        id: "outbox-1",
        domitsPropertyId: "property-1",
        dateFrom: 20261201,
        dateTo: 20261205,
        failureReason: "NOT_MAPPED",
        updatedAt: GENERATED_AT - 5 * 60 * 1000,
      },
    ],
  },
  bookings: { lastRevisionAt: LAST_REVISION_AT, lastPollAt: LAST_POLL_AT, lastPollStatus: "SUCCESS" },
  alarms: {
    available: true,
    items: [
      { name: "channex-webhook-errors", state: "OK", updatedAt: GENERATED_AT - 60 * 1000 },
      { name: "channex-webhook-rejected", state: "ALARM", updatedAt: GENERATED_AT - 2 * 60 * 1000 },
    ],
  },
  accounts: [
    { id: "account-1", displayName: "Villa host", status: "CONNECTED", lastErrorCode: null, mappedProperties: 1 },
    {
      id: "account-2",
      displayName: "Old staging",
      status: "RECONNECT_REQUIRED",
      lastErrorCode: "CHANNEX_UNAUTHORIZED",
      mappedProperties: 3,
    },
  ],
};

const cardNamed = (name) => screen.getByRole("group", { name });
const timeIn = (name) => cardNamed(name).querySelector("time")?.getAttribute("dateTime");

describe("ChannexHealthSection", () => {
  beforeEach(() => {
    getChannexHealth.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("shows a loading message until the health answer arrives", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);

    expect(screen.getByText("Loading health…")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Degraded" })).toBeTruthy();
  });

  test("shows the status and its reasons as sentences in the banner", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);

    expect(await screen.findByRole("heading", { name: "Degraded" })).toBeTruthy();
    expect(screen.getByText("2 failed changes in the last 24 hours")).toBeTruthy();
  });

  test("shows the four numbers of the health view as cards", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    expect(within(cardNamed("Waiting changes")).getByText("4")).toBeTruthy();
    expect(within(cardNamed("Failed in 7 days")).getByText("2")).toBeTruthy();
    expect(within(cardNamed("Failed in 7 days")).getByText("31 sent")).toBeTruthy();
    // dateTime holds the exact moment, so the test does not depend on the time zone it runs in.
    expect(timeIn("Last booking")).toBe("2026-10-27T15:03:44.000Z");
    expect(timeIn("Last poll")).toBe("2026-11-11T09:56:01.000Z");
    expect(within(cardNamed("Last poll")).getByText("SUCCESS")).toBeTruthy();
  });

  test("shows Never for a time that is missing, such as an account without bookings yet", async () => {
    getChannexHealth.mockResolvedValue({
      ...degradedHealth,
      bookings: { ...degradedHealth.bookings, lastRevisionAt: null },
    });

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    expect(within(cardNamed("Last booking")).getByText("Never")).toBeTruthy();
  });

  test("says the health could not be loaded and loads again on Retry", async () => {
    getChannexHealth.mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(degradedHealth);

    render(<ChannexHealthSection />);

    expect(await screen.findByText("Couldn't load health.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Degraded" })).toBeTruthy();
    expect(getChannexHealth).toHaveBeenCalledTimes(2);
  });

  test("logs the cause of a failed load, so it can be found in the browser console", async () => {
    const error = new Error("network unavailable");
    getChannexHealth.mockRejectedValue(error);

    render(<ChannexHealthSection />);
    await screen.findByText("Couldn't load health.");

    expect(console.error).toHaveBeenCalledWith("Channex health could not be loaded", error);
  });

  // Retrying cannot turn a refusal into an answer, so no Retry button is offered.
  test("says the user is not allowed when the backend answers 403, without a Retry button", async () => {
    getChannexHealth.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    render(<ChannexHealthSection />);

    expect(await screen.findByText("You are not allowed to see the Channex health.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  test("lists every alarm with its state", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    const alarms = within(screen.getByRole("region", { name: "Alarms" }));
    expect(within(alarms.getByText("channex-webhook-errors").closest("li")).getByText("OK")).toBeTruthy();
    expect(within(alarms.getByText("channex-webhook-rejected").closest("li")).getByText("ALARM")).toBeTruthy();
  });

  // D4: a CloudWatch failure must not hide the database part.
  test("says the alarms are unavailable and still shows the numbers when CloudWatch could not be read", async () => {
    getChannexHealth.mockResolvedValue({
      ...degradedHealth,
      alarms: { available: false, reason: "AccessDeniedException", items: [] },
    });

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    const alarms = within(screen.getByRole("region", { name: "Alarms" }));
    expect(alarms.getByText("Alarm states are unavailable (AccessDeniedException).")).toBeTruthy();
    expect(within(cardNamed("Waiting changes")).getByText("4")).toBeTruthy();
  });

  test("lists every account with its status, mapped properties and last error", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    const oldStaging = within(
      within(screen.getByRole("region", { name: "Accounts" })).getByText("Old staging").closest("li")
    );
    expect(oldStaging.getByText("RECONNECT_REQUIRED")).toBeTruthy();
    expect(oldStaging.getByText("3 properties")).toBeTruthy();
    expect(oldStaging.getByText("CHANNEX_UNAUTHORIZED")).toBeTruthy();
  });

  test("lists the recent failed changes with property and reason", async () => {
    getChannexHealth.mockResolvedValue(degradedHealth);

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    const failure = within(
      within(screen.getByRole("region", { name: "Recent failed changes" })).getByText("property-1").closest("li")
    );
    expect(failure.getByText("NOT_MAPPED")).toBeTruthy();
    expect(failure.getByText("1 Dec – 5 Dec")).toBeTruthy();
  });

  test("says so when a list is empty, instead of showing an empty box", async () => {
    getChannexHealth.mockResolvedValue({
      ...degradedHealth,
      outbox: { ...degradedHealth.outbox, recentFailures: [] },
      accounts: [],
    });

    render(<ChannexHealthSection />);
    await screen.findByRole("heading", { name: "Degraded" });

    expect(screen.getByText("No failed changes.")).toBeTruthy();
    expect(screen.getByText("No Channex accounts.")).toBeTruthy();
  });
});
