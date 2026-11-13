import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { HostPropertyRejectionBanner } from "./HostPropertyShell";
import { extractFetchedPropertyData } from "../utils/hostPropertyUtils";

const REJECTED_AT = Date.UTC(2026, 10, 9, 12, 0, 0);
const TITLE = "Your listing was not approved";
const FALLBACK_REASON = "No reason was given.";
const HINT = "Update your listing, then choose Submit for review in the status menu to send it again.";

const renderBanner = (status, latestRejection) =>
  render(<HostPropertyRejectionBanner status={status} latestRejection={latestRejection} />);

const renderFromApi = (latestRejection) => {
  const { latestRejection: normalized } = extractFetchedPropertyData(
    { property: { status: "REJECTED" }, latestRejection },
    []
  );
  return renderBanner("REJECTED", normalized);
};

describe("HostPropertyRejectionBanner", () => {
  it("explains a rejection with the reason, the date and how to resubmit", () => {
    renderBanner("REJECTED", { reason: "Photos are too dark.", rejectedAt: REJECTED_AT });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText("Photos are too dark.")).toBeInTheDocument();
    expect(screen.getByText("Rejected on 9 November 2026")).toBeInTheDocument();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it("renders an HTML-looking reason as literal text", () => {
    const reason = '<img src=x onerror="alert(1)"> <b>bold</b>';
    renderBanner("REJECTED", { reason, rejectedAt: REJECTED_AT });

    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps the line breaks of the reason", () => {
    renderBanner("REJECTED", { reason: "First line\nSecond line", rejectedAt: REJECTED_AT });

    const reasonElement = screen.getByText(/First line/);
    expect(reasonElement.textContent).toBe("First line\nSecond line");
    expect(reasonElement.className).toMatch(/rejectionBannerReason/);
  });

  it.each([
    ["a null reason", { reason: null, rejectedAt: REJECTED_AT }],
    ["a missing reason", { rejectedAt: REJECTED_AT }],
    ["a missing field", undefined],
    ["a null field", null],
  ])("shows the fallback for %s", (_label, latestRejection) => {
    renderBanner("REJECTED", latestRejection);

    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(FALLBACK_REASON)).toBeInTheDocument();
  });

  it("omits the date line when there is no rejection date", () => {
    renderBanner("REJECTED", { reason: "Too dark.", rejectedAt: null });

    expect(screen.queryByText(/Rejected on/)).not.toBeInTheDocument();
  });

  it.each([
    ["a blank reason", { reason: "  \n ", rejectedAt: REJECTED_AT }],
    ["a non-string reason", { reason: 42, rejectedAt: REJECTED_AT }],
  ])("falls back for %s coming from the API", (_label, latestRejection) => {
    renderFromApi(latestRejection);

    expect(screen.getByText(FALLBACK_REASON)).toBeInTheDocument();
  });

  it.each([
    ["a seconds-sized timestamp", Math.floor(REJECTED_AT / 1000)],
    ["an invalid number", Number.NaN],
    ["a numeric string", String(REJECTED_AT)],
    ["a timestamp beyond the Date range", 1e20],
  ])("shows no date line for %s from the API", (_label, rejectedAt) => {
    renderFromApi({ reason: "Too dark.", rejectedAt });

    expect(screen.getByText("Too dark.")).toBeInTheDocument();
    expect(screen.queryByText(/Rejected on/)).not.toBeInTheDocument();
  });

  it.each(["ACTIVE", "INACTIVE", "PENDING_REVIEW", "ARCHIVED", "SOMETHING_ELSE"])(
    "is not shown for status %s even when a rejection is present",
    (status) => {
      renderBanner(status, { reason: "Too dark.", rejectedAt: REJECTED_AT });

      expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }
  );

  it("disappears once the listing is resubmitted", () => {
    const latestRejection = { reason: "Too dark.", rejectedAt: REJECTED_AT };
    const { rerender } = renderBanner("REJECTED", latestRejection);
    expect(screen.getByText(TITLE)).toBeInTheDocument();

    rerender(<HostPropertyRejectionBanner status="PENDING_REVIEW" latestRejection={latestRejection} />);

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });
});

describe("extractFetchedPropertyData latestRejection", () => {
  const extract = (data) => extractFetchedPropertyData({ property: { status: "REJECTED" }, ...data }, []);

  it("keeps a well-formed rejection", () => {
    expect(extract({ latestRejection: { reason: "Too dark.", rejectedAt: REJECTED_AT } }).latestRejection).toEqual({
      reason: "Too dark.",
      rejectedAt: REJECTED_AT,
    });
  });

  it("is null while the backend does not return the field", () => {
    expect(extract({}).latestRejection).toBeNull();
  });

  it.each([null, "rejected", 7, []])("is null for a malformed value %p", (latestRejection) => {
    expect(extract({ latestRejection }).latestRejection).toBeNull();
  });

  it("nulls out a blank reason and an unusable date independently", () => {
    expect(extract({ latestRejection: { reason: "   ", rejectedAt: 1700000000 } }).latestRejection).toEqual({
      reason: null,
      rejectedAt: null,
    });
  });
});
