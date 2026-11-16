import React from "react";
import { render, screen } from "@testing-library/react";
import LastSyncCard from "./LastSyncCard";
import { LATEST_SYNC_STATE } from "../hooks/useLatestSyncEvidence";

const STARTED_AT = 1758700000000;
const FINISHED_AT = 1758700005000;

// Same formatting as the card, so the expectation does not depend on the machine's time zone.
const formatted = (ms) => new Date(ms).toLocaleString("nl-NL");

const renderCard = ({ item = null, loadState = LATEST_SYNC_STATE.LOADED } = {}) =>
  render(<LastSyncCard propertyName="Canal house" loadState={loadState} item={item} />);

const finishedItem = (overrides) => ({
  status: "SUCCESS",
  overallSuccess: true,
  startedAt: STARTED_AT,
  finishedAt: FINISHED_AT,
  warningCount: 0,
  errorCount: 0,
  ...overrides,
});

describe("LastSyncCard", () => {
  test("always names the property it is about", () => {
    renderCard();

    expect(screen.getByText("Property: Canal house")).toBeInTheDocument();
  });

  test("shows a loading sentence while the last sync loads", () => {
    renderCard({ loadState: LATEST_SYNC_STATE.LOADING });

    expect(screen.getByRole("status")).toHaveTextContent("Loading the last sync…");
  });

  test("shows an error sentence when the last sync could not be loaded", () => {
    renderCard({ loadState: LATEST_SYNC_STATE.ERROR });

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the last sync.");
  });

  test.each([LATEST_SYNC_STATE.IDLE, LATEST_SYNC_STATE.UNAVAILABLE])("renders nothing when the state is %s", (loadState) => {
    const { container } = renderCard({ loadState });

    expect(container).toBeEmptyDOMElement();
  });

  test("says no sync has run when there is no evidence", () => {
    renderCard({ item: null });

    expect(screen.getByText("No sync yet")).toBeInTheDocument();
    expect(screen.getByText("No sync has run for this property yet.")).toBeInTheDocument();
  });

  describe("outcome rules, in order", () => {
    test("1. a sync without a finish time has not finished, and shows when it started", () => {
      renderCard({ item: finishedItem({ finishedAt: null, overallSuccess: false, status: "RUNNING" }) });

      expect(screen.getByText(`Last sync started on ${formatted(STARTED_AT)} and has not finished.`)).toBeInTheDocument();
      expect(screen.getByText("Not finished")).toHaveClass("chdist-badge--pending");
    });

    test("1. without a start time either, it only says it has not finished", () => {
      renderCard({ item: finishedItem({ finishedAt: null, startedAt: null }) });

      expect(screen.getByText("Last sync has not finished.")).toBeInTheDocument();
    });

    test("1. not finished wins over a success flag", () => {
      renderCard({ item: finishedItem({ finishedAt: null, overallSuccess: true }) });

      expect(screen.queryByText(/succeeded/)).not.toBeInTheDocument();
      expect(screen.getByText("Not finished")).toBeInTheDocument();
    });

    test("2. overallSuccess true is a success, with a green badge", () => {
      renderCard({ item: finishedItem() });

      expect(screen.getByText(`Last sync succeeded on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
      expect(screen.getByText("Synced")).toHaveClass("chdist-badge--success");
    });

    test("2. a success flag wins over a FAILED status", () => {
      renderCard({ item: finishedItem({ status: "FAILED", overallSuccess: true, errorCount: 1 }) });

      expect(screen.getByText(`Last sync succeeded on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
    });

    test("3. errors mean the sync failed, with a red badge", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "PARTIAL", errorCount: 2 }) });

      expect(screen.getByText(`Last sync failed on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
      expect(screen.getByText("Failed")).toHaveClass("chdist-badge--error");
    });

    test("3. a FAILED status means the sync failed even without a counted error", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "FAILED", errorCount: 0 }) });

      expect(screen.getByText(`Last sync failed on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
    });

    test("4. a sync that only has warnings finished with warnings, with a pending-style badge", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "PARTIAL", warningCount: 2, errorCount: 0 }) });

      expect(screen.getByText(`Last sync finished with warnings on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
      expect(screen.getByText("Warnings")).toHaveClass("chdist-badge--pending");
      expect(screen.queryByText("Failed")).not.toBeInTheDocument();
    });

    test("4. an unknown status is treated like the warnings case", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "SOMETHING_NEW", errorCount: 0 }) });

      expect(screen.getByText(`Last sync finished with warnings on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
    });
  });

  describe("statuses that are neither a failure nor a success", () => {
    test("BLOCKED without errors says the sync was blocked, with a pending-style badge", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "BLOCKED" }) });

      expect(screen.getByText(`Last sync was blocked on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
      expect(screen.getByText("Blocked")).toHaveClass("chdist-badge--pending");
    });

    test("NOOP says there was nothing to send, with a pending-style badge", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "NOOP" }) });

      expect(screen.getByText(`Last sync had nothing to send on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
      expect(screen.getByText("Nothing to send")).toHaveClass("chdist-badge--pending");
    });

    test("BLOCKED with errors still counts as failed", () => {
      renderCard({ item: finishedItem({ overallSuccess: false, status: "BLOCKED", errorCount: 1 }) });

      expect(screen.getByText(`Last sync failed on ${formatted(FINISHED_AT)}.`)).toBeInTheDocument();
    });
  });
});
