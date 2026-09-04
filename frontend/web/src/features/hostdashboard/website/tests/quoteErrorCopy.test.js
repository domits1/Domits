import { QUOTE_ERROR_SCOPES, resolveQuoteErrorPresentation } from "../rendering/booking/quoteErrorCopy";

const buildError = (code, overrides = {}) => ({
  code,
  message: "Server says so.",
  status: 400,
  requestId: "req-1",
  ...overrides,
});

describe("resolveQuoteErrorPresentation", () => {
  it.each([
    ["invalid_date_range", QUOTE_ERROR_SCOPES.DATES],
    ["stay_restriction_violation", QUOTE_ERROR_SCOPES.DATES],
    ["invalid_guest_count", QUOTE_ERROR_SCOPES.GUESTS],
  ])("uses the server message inline for %s", (code, expectedScope) => {
    const presentation = resolveQuoteErrorPresentation(buildError(code));
    expect(presentation.scope).toBe(expectedScope);
    expect(presentation.message).toBe("Server says so.");
    expect(presentation.canRetry).toBe(false);
  });

  it("replaces the unavailable_dates message and asks for a new selection", () => {
    const presentation = resolveQuoteErrorPresentation(buildError("unavailable_dates", { status: 409 }));
    expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.DATES);
    expect(presentation.message).toMatch(/no longer available/i);
    expect(presentation.clearSelection).toBe(true);
  });

  it.each(["site_not_found", "site_not_published", "site_suspended"])(
    "hides the action for a site lifecycle problem (%s)",
    (code) => {
      const presentation = resolveQuoteErrorPresentation(buildError(code));
      expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.PANEL);
      expect(presentation.hideAction).toBe(true);
      expect(presentation.message).toMatch(/isn't available/i);
    }
  );

  it("offers the host contact for quote_unavailable", () => {
    const presentation = resolveQuoteErrorPresentation(buildError("quote_unavailable", { status: 422 }));
    expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.PANEL);
    expect(presentation.showContact).toBe(true);
    expect(presentation.canRetry).toBe(false);
  });

  it.each(["pricing_service_unavailable", "network_error", "rate_limited"])(
    "offers a retry for a transient failure (%s)",
    (code) => {
      const presentation = resolveQuoteErrorPresentation(buildError(code));
      expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.PANEL);
      expect(presentation.canRetry).toBe(true);
      expect(presentation.showReference).toBe(false);
    }
  );

  it("shows the request reference for unexpected failures", () => {
    for (const code of ["internal_error", "unexpected_response", "something_new"]) {
      const presentation = resolveQuoteErrorPresentation(buildError(code));
      expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.PANEL);
      expect(presentation.canRetry).toBe(true);
      expect(presentation.showReference).toBe(true);
      expect(presentation.message).not.toBe("Server says so.");
    }
  });

  it("does not show a reference when the error carries none", () => {
    const presentation = resolveQuoteErrorPresentation(buildError("internal_error", { requestId: "" }));
    expect(presentation.showReference).toBe(false);
  });

  it("survives a missing error object", () => {
    const presentation = resolveQuoteErrorPresentation(null);
    expect(presentation.scope).toBe(QUOTE_ERROR_SCOPES.PANEL);
    expect(presentation.canRetry).toBe(true);
  });
});
