import React from "react";
import { render, screen, within } from "@testing-library/react";
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
    recentFailures: [],
  },
  bookings: { lastRevisionAt: LAST_REVISION_AT, lastPollAt: LAST_POLL_AT, lastPollStatus: "SUCCESS" },
  alarms: { available: true, items: [] },
  accounts: [],
};

const cardNamed = (name) => screen.getByRole("group", { name });
const timeIn = (name) => cardNamed(name).querySelector("time")?.getAttribute("dateTime");

describe("ChannexHealthSection", () => {
  beforeEach(() => {
    getChannexHealth.mockReset();
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
});
