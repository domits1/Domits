import React from "react";
import { render, screen } from "@testing-library/react";
import ReviewHistory from "./ReviewHistory";

const WHEN = new Date(2026, 9, 30, 14, 5).getTime();

const makeEvent = (overrides = {}) => ({
  id: "e1",
  action: "SUBMITTED",
  fromStatus: "INACTIVE",
  toStatus: "PENDING_REVIEW",
  reason: null,
  actorId: "host-1",
  createdAt: WHEN,
  ...overrides,
});

const renderHistory = (history, hostId = "host-1") => render(<ReviewHistory history={history} hostId={hostId} />);

const itemTexts = () => screen.getAllByRole("listitem").map((item) => item.textContent);

describe("ReviewHistory", () => {
  test("lists the events in the order the server sent them", () => {
    renderHistory([
      makeEvent({ id: "e3", actorId: "admin-3" }),
      makeEvent({ id: "e2", actorId: "admin-2" }),
      makeEvent({ id: "e1", actorId: "admin-1" }),
    ]);

    const texts = itemTexts();

    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain("admin-3");
    expect(texts[1]).toContain("admin-2");
    expect(texts[2]).toContain("admin-1");
  });

  test.each([
    ["SUBMITTED", "Submitted for review"],
    ["APPROVED", "Approved"],
    ["REJECTED", "Rejected"],
  ])("labels a %s event as %s", (action, label) => {
    renderHistory([makeEvent({ action })]);

    expect(itemTexts()[0].startsWith(label)).toBe(true);
  });

  test("shows the date and time in en-GB format", () => {
    renderHistory([makeEvent()]);

    expect(screen.getByText("30 Oct 2026, 14:05")).toBeTruthy();
  });

  test("labels the property's host as Host", () => {
    renderHistory([makeEvent({ actorId: "host-1" })], "host-1");

    expect(screen.getByText("Host")).toBeTruthy();
  });

  test("labels any other actor as Admin with the id as sent", () => {
    renderHistory([makeEvent({ actorId: "u-9" })], "host-1");

    expect(screen.getByText("Admin u-9")).toBeTruthy();
  });

  test("never matches the host when the host id is missing", () => {
    render(<ReviewHistory history={[makeEvent({ actorId: "host-1" })]} />);

    expect(screen.getByText("Admin host-1")).toBeTruthy();
  });

  test.each([[undefined], [null], [""], ["   "]])(
    "keeps an event whose actor id is %p and shows Unknown",
    (actorId) => {
      renderHistory([makeEvent({ actorId })]);

      expect(screen.getByText("Unknown")).toBeTruthy();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    }
  );

  test("shows the status labels of the transition", () => {
    renderHistory([makeEvent({ fromStatus: "INACTIVE", toStatus: "PENDING_REVIEW" })]);

    expect(screen.getByText("Drafted → Pending review")).toBeTruthy();
  });

  test.each([[undefined], [null], [""], ["BOGUS"]])("shows a dash for a status of %p", (status) => {
    renderHistory([makeEvent({ fromStatus: status, toStatus: "ACTIVE" })]);

    expect(screen.getByText("— → Live")).toBeTruthy();
  });

  test("shows the reason of a rejection", () => {
    renderHistory([makeEvent({ action: "REJECTED", reason: "Photos are blurry" })]);

    expect(screen.getByRole("blockquote").textContent).toBe("Photos are blurry");
  });

  test.each([["SUBMITTED"], ["APPROVED"]])("does not show a reason on a %s event", (action) => {
    renderHistory([makeEvent({ action, reason: "Should stay hidden" })]);

    expect(screen.queryByText("Should stay hidden")).toBeNull();
    expect(screen.queryByRole("blockquote")).toBeNull();
  });

  test.each([[null], [undefined], [""], ["  \n "], [42]])(
    "shows no reason block for a rejection reason of %p",
    (reason) => {
      renderHistory([makeEvent({ action: "REJECTED", reason })]);

      expect(screen.queryByRole("blockquote")).toBeNull();
    }
  );

  test("renders a reason that looks like HTML as plain text", () => {
    renderHistory([makeEvent({ action: "REJECTED", reason: "<b>bad</b>" })]);

    expect(screen.getByText("<b>bad</b>")).toBeTruthy();
    expect(screen.queryByText("bad", { selector: "b" })).toBeNull();
  });

  test("keeps the line breaks of a reason", () => {
    renderHistory([makeEvent({ action: "REJECTED", reason: "First line\nSecond line" })]);

    expect(screen.getByText("First line\nSecond line", { normalizer: (text) => text })).toBeTruthy();
  });

  test("shows the heading and a fallback when there is no history", () => {
    renderHistory([]);

    expect(screen.getByRole("heading", { name: "Review history" })).toBeTruthy();
    expect(screen.getByText("No review history yet.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test.each([[undefined], [null], ["history"], [{ id: "e1" }], [7]])("falls back for a history of %p", (history) => {
    renderHistory(history);

    expect(screen.getByText("No review history yet.")).toBeTruthy();
  });

  test("ignores malformed entries and keeps the valid ones around them", () => {
    renderHistory([
      null,
      7,
      "event",
      [],
      {},
      makeEvent({ id: "no-time", createdAt: undefined }),
      makeEvent({ id: "text-time", createdAt: "1700000000000" }),
      makeEvent({ id: "nan-time", createdAt: Number.NaN }),
      makeEvent({ id: "unknown", action: "ARCHIVED" }),
      makeEvent({ id: "inherited", action: "toString" }),
      makeEvent({ id: "valid", actorId: "admin-1" }),
    ]);

    const texts = itemTexts();

    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("admin-1");
  });

  test("falls back when every entry is malformed", () => {
    renderHistory([null, { action: "SUBMITTED" }]);

    expect(screen.getByText("No review history yet.")).toBeTruthy();
  });
});
