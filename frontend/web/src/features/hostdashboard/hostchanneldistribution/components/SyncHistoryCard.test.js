import React from "react";
import { render, screen, within } from "@testing-library/react";
import SyncHistoryCard from "./SyncHistoryCard";
import { SYNC_HISTORY_STATE } from "../hooks/useSyncHistory";

const STARTED_AT = 1758700000000;

// Same formatting as the card, so the expectation does not depend on the machine's time zone.
const formatted = (ms) => new Date(ms).toLocaleString("nl-NL");

const row = (overrides = {}) => ({
  id: "evidence-1",
  startedAt: STARTED_AT,
  kind: "Availability",
  tone: "success",
  outcomeLabel: "Synced",
  warningCount: 0,
  errorCount: 0,
  ...overrides,
});

const renderCard = ({ rows = [], loadState = SYNC_HISTORY_STATE.LOADED } = {}) =>
  render(<SyncHistoryCard propertyName="Canal house" loadState={loadState} rows={rows} />);

describe("SyncHistoryCard", () => {
  test("names the card and the property it is about", () => {
    renderCard();

    expect(screen.getByText("Sync history")).toBeInTheDocument();
    expect(screen.getByText("Property: Canal house")).toBeInTheDocument();
  });

  test("shows a loading sentence while the history loads", () => {
    renderCard({ loadState: SYNC_HISTORY_STATE.LOADING });

    expect(screen.getByRole("status")).toHaveTextContent("Loading the sync history…");
  });

  test("shows one error sentence on the card when the history could not be loaded", () => {
    renderCard({ loadState: SYNC_HISTORY_STATE.ERROR });

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the sync history.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  test.each([SYNC_HISTORY_STATE.IDLE, SYNC_HISTORY_STATE.UNAVAILABLE])("renders nothing when the state is %s", (loadState) => {
    const { container } = renderCard({ loadState });

    expect(container).toBeEmptyDOMElement();
  });

  test("says there are no syncs yet when the property has none", () => {
    renderCard({ rows: [] });

    expect(screen.getByText("No syncs yet for this property.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  test("shows each sync with its date, its kind and its outcome badge, in the order given", () => {
    renderCard({
      rows: [
        row({ id: "a", kind: "Full sync", outcomeLabel: "Failed", tone: "error", startedAt: STARTED_AT + 2000 }),
        row({ id: "b", kind: "Availability", outcomeLabel: "Synced", tone: "success", startedAt: STARTED_AT }),
      ],
    });

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Full sync")).toBeInTheDocument();
    expect(within(items[0]).getByText(formatted(STARTED_AT + 2000))).toBeInTheDocument();
    expect(within(items[0]).getByText("Failed")).toHaveClass("chdist-badge--error");
    expect(within(items[1]).getByText("Availability")).toBeInTheDocument();
    expect(within(items[1]).getByText("Synced")).toHaveClass("chdist-badge--success");
  });

  test("shows no counts when there are no errors and no warnings", () => {
    renderCard({ rows: [row()] });

    expect(screen.queryByText(/error|warning/i)).not.toBeInTheDocument();
  });

  test.each([
    [{ errorCount: 1 }, "1 error"],
    [{ errorCount: 3 }, "3 errors"],
    [{ warningCount: 1 }, "1 warning"],
    [{ warningCount: 2 }, "2 warnings"],
    [{ errorCount: 2, warningCount: 1 }, "2 errors, 1 warning"],
  ])("shows the counts above zero only (%j)", (counts, text) => {
    renderCard({ rows: [row(counts)] });

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  test("shows a dash for a sync without a start time", () => {
    renderCard({ rows: [row({ startedAt: undefined })] });

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
