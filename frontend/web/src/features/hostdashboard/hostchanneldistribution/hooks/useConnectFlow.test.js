import { act, renderHook } from "@testing-library/react";
import { CONNECT_ERROR_MESSAGE, CONNECT_STEP, useConnectFlow } from "./useConnectFlow";
import { createConnectSession, enableDistribution } from "../services/hostDistributionApi";
import { ENABLE_ERROR_MESSAGE, TIMEZONE_REQUIRED_MESSAGE } from "../utils/enableErrors";

jest.mock("../services/hostDistributionApi");

const PLATFORM = { otaCode: "Vrbo", name: "Vrbo" };
const URL_OK = "https://staging.channex.io/mock-connect?token=mock";

const listing = (overrides = {}) => ({
  propertyId: "p1",
  distribution: { status: "READY" },
  timezone: { required: false, options: [] },
  ...overrides,
});
const READY_LISTING = listing();
const NOT_ENABLED_LISTING = listing({ distribution: { status: "NOT_ENABLED" } });
const TIMEZONE_LISTING = listing({
  distribution: { status: "NOT_ENABLED" },
  timezone: { required: true, options: ["Asia/Jakarta", "Asia/Makassar"] },
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const requestError = (status, errorCode) => Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

const setup = () => {
  const refresh = jest.fn();
  const applyListing = jest.fn();
  const hook = renderHook(() => useConnectFlow({ refresh, applyListing }));
  return { ...hook, refresh, applyListing };
};

const startFlow = (hook, flowListing = READY_LISTING) =>
  act(() => hook.result.current.start({ platform: PLATFORM, listing: flowListing }));

// Walks to the iframe step and returns the hook.
const openIframe = async () => {
  const hook = setup();
  createConnectSession.mockResolvedValue({ url: URL_OK });
  startFlow(hook);
  await act(async () => hook.result.current.continueFromChecklist());
  return hook;
};

describe("useConnectFlow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("starts idle and not active", () => {
    const { result } = setup();

    expect(result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(result.current.isActive).toBe(false);
  });

  test("start opens the checklist first, without any request", () => {
    const hook = setup();

    startFlow(hook, NOT_ENABLED_LISTING);

    expect(hook.result.current.step).toBe(CONNECT_STEP.CHECKLIST);
    expect(hook.result.current.platform).toBe(PLATFORM);
    expect(hook.result.current.isActive).toBe(true);
    expect(enableDistribution).not.toHaveBeenCalled();
    expect(createConnectSession).not.toHaveBeenCalled();
  });

  test("cancelling the checklist returns to idle without a request or a refresh", () => {
    const hook = setup();
    startFlow(hook, NOT_ENABLED_LISTING);

    act(() => hook.result.current.cancel());

    expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(enableDistribution).not.toHaveBeenCalled();
    expect(createConnectSession).not.toHaveBeenCalled();
    expect(hook.refresh).not.toHaveBeenCalled();
  });

  describe("a listing that is already READY", () => {
    test("goes from the checklist straight to the session with the listing id only, and never enables", async () => {
      const pending = deferred();
      createConnectSession.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);

      act(() => {
        hook.result.current.continueFromChecklist();
      });

      expect(hook.result.current.step).toBe(CONNECT_STEP.CONNECTING);
      expect(createConnectSession).toHaveBeenCalledTimes(1);
      expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p1" });

      await act(async () => pending.resolve({ url: URL_OK }));

      expect(hook.result.current.step).toBe(CONNECT_STEP.IFRAME);
      expect(hook.result.current.url).toBe(URL_OK);
      expect(enableDistribution).not.toHaveBeenCalled();
      expect(hook.applyListing).not.toHaveBeenCalled();
    });

    test("a second Continue while connecting does not ask for another session", async () => {
      createConnectSession.mockReturnValue(deferred().promise);
      const hook = setup();
      startFlow(hook);

      act(() => {
        hook.result.current.continueFromChecklist();
        hook.result.current.continueFromChecklist();
      });

      expect(createConnectSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("a listing that is not turned on and needs no timezone", () => {
    test("enables with the listing id only, applies the answer, then opens the session", async () => {
      const enabled = listing({ title: "Enabled" });
      enableDistribution.mockResolvedValue({ listing: enabled });
      createConnectSession.mockResolvedValue({ url: URL_OK });
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1" });
      expect(hook.applyListing).toHaveBeenCalledWith("p1", enabled);
      expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p1" });
      expect(hook.result.current.step).toBe(CONNECT_STEP.IFRAME);
    });

    test("shows the enabling step while the request is pending, and ignores a second Continue", async () => {
      const pending = deferred();
      enableDistribution.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      act(() => {
        hook.result.current.continueFromChecklist();
        hook.result.current.continueFromChecklist();
      });

      expect(hook.result.current.step).toBe(CONNECT_STEP.ENABLING);
      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(createConnectSession).not.toHaveBeenCalled();
    });

    test("stops at Setting up when the answer is not READY: applies it, opens no session", async () => {
      const provisioning = listing({ distribution: { status: "PROVISIONING" } });
      enableDistribution.mockResolvedValue({ listing: provisioning });
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.applyListing).toHaveBeenCalledWith("p1", provisioning);
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe("");
    });

    test("an answer without a listing is an error: nothing is applied, no session, no refresh", async () => {
      enableDistribution.mockResolvedValue({});
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("an answer that arrives after unmount applies nothing and opens no session", async () => {
      const pending = deferred();
      enableDistribution.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      act(() => {
        hook.result.current.continueFromChecklist();
      });

      hook.unmount();
      await act(async () => pending.resolve({ listing: READY_LISTING }));

      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(createConnectSession).not.toHaveBeenCalled();
    });
  });

  describe("a listing that needs a timezone", () => {
    test("asks for the timezone after the checklist, without enabling yet", async () => {
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.step).toBe(CONNECT_STEP.TIMEZONE);
      expect(hook.result.current.listing.timezone.options).toEqual(["Asia/Jakarta", "Asia/Makassar"]);
      expect(enableDistribution).not.toHaveBeenCalled();
    });

    test("enables with the picked zone, then opens the session", async () => {
      enableDistribution.mockResolvedValue({ listing: READY_LISTING });
      createConnectSession.mockResolvedValue({ url: URL_OK });
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());

      await act(async () => hook.result.current.continueFromTimezone("Asia/Makassar"));

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1", timezone: "Asia/Makassar" });
      expect(hook.result.current.step).toBe(CONNECT_STEP.IFRAME);
    });

    test("a second Continue on the timezone step sends one request", async () => {
      enableDistribution.mockReturnValue(deferred().promise);
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());

      act(() => {
        hook.result.current.continueFromTimezone("Asia/Jakarta");
        hook.result.current.continueFromTimezone("Asia/Jakarta");
      });

      expect(enableDistribution).toHaveBeenCalledTimes(1);
    });

    test("cancelling the timezone step returns to idle with no request and no refresh", async () => {
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());

      act(() => hook.result.current.cancel());

      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(enableDistribution).not.toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
    });

    test("a required timezone with no options is an error, not a modal that can never continue", async () => {
      const hook = setup();
      startFlow(hook, listing({ distribution: { status: "NOT_ENABLED" }, timezone: { required: true, options: [] } }));

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
      expect(enableDistribution).not.toHaveBeenCalled();
    });

    test("continueFromTimezone does nothing outside the timezone step", async () => {
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);

      await act(async () => hook.result.current.continueFromTimezone("Asia/Jakarta"));

      expect(enableDistribution).not.toHaveBeenCalled();
    });
  });

  describe("when enabling fails", () => {
    test.each([
      ["a 409 already in progress", requestError(409, "PROVISIONING_IN_PROGRESS"), ""],
      ["a 422 listing not ready", requestError(422, "LISTING_NOT_READY"), ""],
      ["a 400 timezone required", requestError(400, "TIMEZONE_REQUIRED"), TIMEZONE_REQUIRED_MESSAGE],
      ["a 500 setup failure", requestError(500, "PROVISIONING_FAILED"), ENABLE_ERROR_MESSAGE],
    ])("%s reads the listing again once, shows its message, and opens no session", async (_name, error, message) => {
      enableDistribution.mockRejectedValue(error);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.refresh).toHaveBeenCalledTimes(1);
      expect(hook.refresh).toHaveBeenCalledWith("p1");
      expect(hook.result.current.errorMessage).toBe(message);
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test("a network error alerts and leaves the listing alone, with no refresh", async () => {
      enableDistribution.mockRejectedValue(new Error("Failed to fetch"));
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("clearError clears the message on request", async () => {
      enableDistribution.mockRejectedValue(new Error("Failed to fetch"));
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);

      act(() => hook.result.current.clearError());

      expect(hook.result.current.errorMessage).toBe("");
    });

    test("starting again clears the earlier message", async () => {
      enableDistribution.mockRejectedValue(new Error("Failed to fetch"));
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);

      startFlow(hook, NOT_ENABLED_LISTING);

      expect(hook.result.current.errorMessage).toBe("");
    });
  });

  describe("the connect session", () => {
    test("a session failure returns to idle with a message and never reaches the iframe", async () => {
      createConnectSession.mockRejectedValue(new Error("boom"));
      const hook = setup();
      startFlow(hook);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.url).toBeNull();
      expect(hook.result.current.errorMessage).toBe(CONNECT_ERROR_MESSAGE);
      expect(console.error).toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
    });

    test("an answer that arrives after unmount changes nothing and does not throw", async () => {
      const pending = deferred();
      createConnectSession.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);
      act(() => {
        hook.result.current.continueFromChecklist();
      });

      hook.unmount();
      await act(async () => pending.resolve({ url: URL_OK }));

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  test("closing the iframe returns to idle and refreshes the listing exactly once", async () => {
    const { result, refresh } = await openIframe();
    expect(result.current.step).toBe(CONNECT_STEP.IFRAME);

    act(() => {
      result.current.closeIframe();
      result.current.closeIframe();
    });

    expect(result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("p1");
  });

  describe("retry of a setup that failed halfway", () => {
    const FAILED_LISTING = listing({ distribution: { status: "PROVISIONING_FAILED" } });

    test("enables again with no checklist, applies the answer, and opens no session", async () => {
      enableDistribution.mockResolvedValue({ listing: READY_LISTING });
      const hook = setup();

      await act(async () => hook.result.current.retry({ listing: FAILED_LISTING }));

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1" });
      expect(hook.applyListing).toHaveBeenCalledWith("p1", READY_LISTING);
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe("");
    });

    test("is busy while the request runs, and a second retry sends nothing more", async () => {
      enableDistribution.mockReturnValue(deferred().promise);
      const hook = setup();

      act(() => {
        hook.result.current.retry({ listing: FAILED_LISTING });
        hook.result.current.retry({ listing: FAILED_LISTING });
      });

      expect(hook.result.current.step).toBe(CONNECT_STEP.ENABLING);
      expect(hook.result.current.isActive).toBe(true);
      expect(enableDistribution).toHaveBeenCalledTimes(1);
    });

    test("asks for the timezone first where the listing requires one, then enables with the zone", async () => {
      enableDistribution.mockResolvedValue({ listing: READY_LISTING });
      const hook = setup();
      const needsZone = listing({
        distribution: { status: "PROVISIONING_FAILED" },
        timezone: { required: true, options: ["Asia/Jakarta"] },
      });

      await act(async () => hook.result.current.retry({ listing: needsZone }));

      expect(hook.result.current.step).toBe(CONNECT_STEP.TIMEZONE);
      expect(enableDistribution).not.toHaveBeenCalled();

      await act(async () => hook.result.current.continueFromTimezone("Asia/Jakarta"));

      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1", timezone: "Asia/Jakarta" });
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("a failure reads the listing again like any enable failure", async () => {
      enableDistribution.mockRejectedValue(requestError(500, "PROVISIONING_FAILED"));
      const hook = setup();

      await act(async () => hook.result.current.retry({ listing: FAILED_LISTING }));

      expect(hook.refresh).toHaveBeenCalledWith("p1");
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
    });

    test("is ignored while a flow is open", () => {
      const hook = setup();
      startFlow(hook);

      act(() => {
        hook.result.current.retry({ listing: FAILED_LISTING });
      });

      expect(hook.result.current.step).toBe(CONNECT_STEP.CHECKLIST);
      expect(enableDistribution).not.toHaveBeenCalled();
    });
  });

  test("start is ignored while a flow is open", () => {
    const hook = setup();
    startFlow(hook);

    act(() =>
      hook.result.current.start({
        platform: { otaCode: "Airbnb", name: "Airbnb" },
        listing: listing({ propertyId: "p2" }),
      })
    );

    expect(hook.result.current.platform).toBe(PLATFORM);
    expect(hook.result.current.listing.propertyId).toBe("p1");
  });
});
