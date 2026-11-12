import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { WEBSITE_ENTITLEMENTS_STATUS, useWebsiteEntitlements } from "../hooks/useWebsiteEntitlements";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES, getWebsiteEntitlements } from "../services/websitePlanService";
import { WebsiteConnectionError, WebsiteSessionExpiredError } from "../services/websiteSession";

jest.mock("../services/websitePlanService", () => ({
  ...jest.requireActual("../services/websitePlanService"),
  getWebsiteEntitlements: jest.fn(),
}));

const ESSENTIALS_ENTITLEMENTS = ["website.basic", "website.booking"];
const ELITE_ENTITLEMENTS = [...ESSENTIALS_ENTITLEMENTS, WEBSITE_ENTITLEMENT_UNLIMITED_PAGES];

const deferred = () => {
  let resolve;
  const promise = new Promise((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

describe("useWebsiteEntitlements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("grants nothing while the plan is still being read", () => {
    getWebsiteEntitlements.mockReturnValue(deferred().promise);

    const { result } = renderHook(() => useWebsiteEntitlements());

    expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.LOADING);
    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(false);
  });

  it("grants the entitlements of an Elite plan once they are read", async () => {
    getWebsiteEntitlements.mockResolvedValue(ELITE_ENTITLEMENTS);

    const { result } = renderHook(() => useWebsiteEntitlements());

    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY));
    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(true);
    expect(result.current.has("website.experiments")).toBe(false);
  });

  it("does not grant an Elite entitlement to an Essentials plan", async () => {
    getWebsiteEntitlements.mockResolvedValue(ESSENTIALS_ENTITLEMENTS);

    const { result } = renderHook(() => useWebsiteEntitlements());

    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY));
    expect(result.current.has("website.basic")).toBe(true);
    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(false);
  });

  it.each([
    ["the server answers with an error", () => new Error("Website entitlements request failed (503).")],
    ["the session expired", () => new WebsiteSessionExpiredError()],
    ["the login check could not be reached", () => new WebsiteConnectionError()],
  ])("grants nothing and reports the plan as unavailable when %s", async (_label, failure) => {
    getWebsiteEntitlements.mockRejectedValue(failure());

    const { result } = renderHook(() => useWebsiteEntitlements());

    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.UNAVAILABLE));
    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(false);
    expect(result.current.has("website.basic")).toBe(false);
  });

  it("reads the plan once per mount and keeps the same check across renders", async () => {
    getWebsiteEntitlements.mockResolvedValue(ELITE_ENTITLEMENTS);
    const { result, rerender } = renderHook(() => useWebsiteEntitlements());
    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY));
    const firstCheck = result.current.has;

    rerender();

    expect(getWebsiteEntitlements).toHaveBeenCalledTimes(1);
    expect(result.current.has).toBe(firstCheck);
  });

  it("ignores the late answer of a read whose mount was undone", async () => {
    const staleRead = deferred();
    getWebsiteEntitlements
      .mockImplementationOnce(() => staleRead.promise)
      .mockResolvedValueOnce(ESSENTIALS_ENTITLEMENTS);

    const { result } = renderHook(() => useWebsiteEntitlements(), { wrapper: React.StrictMode });
    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY));
    expect(getWebsiteEntitlements).toHaveBeenCalledTimes(2);

    await act(async () => {
      staleRead.resolve(ELITE_ENTITLEMENTS);
    });

    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(false);
  });

  it("ignores a late failure of a read whose mount was undone", async () => {
    let rejectStale;
    getWebsiteEntitlements
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectStale = reject;
          })
      )
      .mockResolvedValueOnce(ELITE_ENTITLEMENTS);

    const { result } = renderHook(() => useWebsiteEntitlements(), { wrapper: React.StrictMode });
    await waitFor(() => expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY));

    await act(async () => {
      rejectStale(new Error("Website entitlements request failed (503)."));
    });

    expect(result.current.status).toBe(WEBSITE_ENTITLEMENTS_STATUS.READY);
    expect(result.current.has(WEBSITE_ENTITLEMENT_UNLIMITED_PAGES)).toBe(true);
  });
});
