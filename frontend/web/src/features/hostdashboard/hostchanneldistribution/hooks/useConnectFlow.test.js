import { act, renderHook } from "@testing-library/react";
import { CONNECT_STEP, useConnectFlow } from "./useConnectFlow";
import { CONNECT_ERROR_MESSAGE } from "../utils/connectErrors";
import { createConnectSession, enableDistribution } from "../services/hostDistributionApi";
import { ENABLE_ERROR_MESSAGE, TIMEZONE_REQUIRED_MESSAGE } from "../utils/enableErrors";

jest.mock("../services/hostDistributionApi");

const PLATFORM = { otaCode: "Vrbo", name: "Vrbo" };
const URL_OK = "https://staging.channex.io/mock-connect?token=mock";

const NO_TIMEZONE = { required: false, options: [] };
const distribution = (status, timezone = NO_TIMEZONE) => ({ status, missing: [], timezone });
const listing = (overrides = {}) => ({ propertyId: "p1", distribution: distribution("READY"), ...overrides });
const READY_LISTING = listing();
const NOT_ENABLED_LISTING = listing({ distribution: distribution("NOT_ENABLED") });
const PROVISIONING_LISTING = listing({ distribution: distribution("PROVISIONING") });
const TIMEZONE_LISTING = listing({
  distribution: distribution("NOT_ENABLED", { required: true, options: ["Asia/Jakarta", "Asia/Makassar"] }),
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
  const rereadListings = jest.fn();
  const hook = renderHook(() => useConnectFlow({ refresh, rereadListings }));
  return { ...hook, refresh, rereadListings };
};

const startFlow = (hook, flowListing = READY_LISTING) =>
  act(() => hook.result.current.start({ platform: PLATFORM, listing: flowListing }));

// Walks to the iframe step and returns the hook.
const openIframe = async () => {
  const hook = setup();
  createConnectSession.mockResolvedValue({ iframeUrl: URL_OK });
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

      await act(async () => pending.resolve({ iframeUrl: URL_OK }));

      expect(hook.result.current.step).toBe(CONNECT_STEP.IFRAME);
      expect(hook.result.current.url).toBe(URL_OK);
      expect(enableDistribution).not.toHaveBeenCalled();
      expect(hook.rereadListings).not.toHaveBeenCalled();
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
    test("enables with the listing id only, reads the listings again, then opens the session", async () => {
      enableDistribution.mockResolvedValue({});
      createConnectSession.mockResolvedValue({ iframeUrl: URL_OK });
      const hook = setup();
      hook.rereadListings.mockResolvedValue([READY_LISTING]);
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1" });
      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
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

    test("stops at Setting up when the fresh listing is not READY: opens no session", async () => {
      enableDistribution.mockResolvedValue({});
      const hook = setup();
      hook.rereadListings.mockResolvedValue([PROVISIONING_LISTING]);
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe("");
    });

    test.each([
      ["a read that failed", null],
      ["a read without the listing", [listing({ propertyId: "p2" })]],
    ])("%s is an error: no session, no refresh", async (_name, fresh) => {
      enableDistribution.mockResolvedValue({});
      const hook = setup();
      hook.rereadListings.mockResolvedValue(fresh);
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("an answer that arrives after unmount reads nothing and opens no session", async () => {
      const pending = deferred();
      enableDistribution.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      act(() => {
        hook.result.current.continueFromChecklist();
      });

      hook.unmount();
      await act(async () => pending.resolve({}));

      expect(hook.rereadListings).not.toHaveBeenCalled();
      expect(createConnectSession).not.toHaveBeenCalled();
    });
  });

  describe("a listing that needs a timezone", () => {
    test("asks for the timezone after the checklist, without enabling yet", async () => {
      const hook = setup();
      startFlow(hook, TIMEZONE_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.step).toBe(CONNECT_STEP.TIMEZONE);
      expect(hook.result.current.listing.distribution.timezone.options).toEqual(["Asia/Jakarta", "Asia/Makassar"]);
      expect(enableDistribution).not.toHaveBeenCalled();
    });

    test("enables with the picked zone, then opens the session", async () => {
      enableDistribution.mockResolvedValue({});
      createConnectSession.mockResolvedValue({ iframeUrl: URL_OK });
      const hook = setup();
      hook.rereadListings.mockResolvedValue([READY_LISTING]);
      startFlow(hook, TIMEZONE_LISTING);
      await act(async () => hook.result.current.continueFromChecklist());

      await act(async () => hook.result.current.continueFromTimezone("Asia/Makassar"));

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1", chosenTimezone: "Asia/Makassar" });
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
      startFlow(hook, listing({ distribution: distribution("NOT_ENABLED", { required: true, options: [] }) }));

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
      ["a 409 already in progress", requestError(409, "DISTRIBUTION_ALREADY_IN_PROGRESS"), ""],
      ["a 422 listing not ready", requestError(422, "DISTRIBUTION_LISTING_NOT_READY"), ""],
      ["a 422 timezone needed", requestError(422, "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED"), TIMEZONE_REQUIRED_MESSAGE],
      ["a 503 try again", requestError(503, "DISTRIBUTION_TRY_AGAIN"), "Setting up didn't finish. Try again."],
      ["a 500 with no code", requestError(500, undefined), ENABLE_ERROR_MESSAGE],
    ])("%s reads the listing again once, shows its message, and opens no session", async (_name, error, message) => {
      enableDistribution.mockRejectedValue(error);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.errorMessage).toBe(message);
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test("a network error alerts and leaves the listing alone, with no refresh", async () => {
      enableDistribution.mockRejectedValue(new Error("Failed to fetch"));
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.errorMessage).toBe(ENABLE_ERROR_MESSAGE);
      expect(hook.rereadListings).not.toHaveBeenCalled();
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
      expect(hook.rereadListings).not.toHaveBeenCalled();
    });

    test("a listing that is not turned on says so and reads the listings again once", async () => {
      createConnectSession.mockRejectedValue(requestError(409, "DISTRIBUTION_NOT_TURNED_ON"));
      const hook = setup();
      startFlow(hook);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe("This listing isn't turned on yet.");
      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
    });

    test("a listing that is not the host's says so and does not read the listings again", async () => {
      createConnectSession.mockRejectedValue(requestError(403, "DISTRIBUTION_LISTING_NOT_OWNED"));
      const hook = setup();
      startFlow(hook);

      await act(async () => hook.result.current.continueFromChecklist());

      expect(hook.result.current.errorMessage).toBe("You don't have access to this listing.");
      expect(hook.rereadListings).not.toHaveBeenCalled();
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
      await act(async () => pending.resolve({ iframeUrl: URL_OK }));

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

  describe("retry of a setup that did not finish", () => {
    const FAILED_LISTING = PROVISIONING_LISTING;

    test("enables again with no checklist, reads the listings again, and opens no session", async () => {
      enableDistribution.mockResolvedValue({});
      const hook = setup();
      hook.rereadListings.mockResolvedValue([READY_LISTING]);

      await act(async () => hook.result.current.retry({ listing: FAILED_LISTING }));

      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1" });
      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
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
      enableDistribution.mockResolvedValue({});
      const hook = setup();
      hook.rereadListings.mockResolvedValue([READY_LISTING]);
      const needsZone = listing({
        distribution: distribution("PROVISIONING", { required: true, options: ["Asia/Jakarta"] }),
      });

      await act(async () => hook.result.current.retry({ listing: needsZone }));

      expect(hook.result.current.step).toBe(CONNECT_STEP.TIMEZONE);
      expect(enableDistribution).not.toHaveBeenCalled();

      await act(async () => hook.result.current.continueFromTimezone("Asia/Jakarta"));

      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p1", chosenTimezone: "Asia/Jakarta" });
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("a failure reads the listing again like any enable failure", async () => {
      enableDistribution.mockRejectedValue(requestError(500, undefined));
      const hook = setup();

      await act(async () => hook.result.current.retry({ listing: FAILED_LISTING }));

      expect(hook.rereadListings).toHaveBeenCalledTimes(1);
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

  describe("reset", () => {
    test("returns an open flow to idle, so it no longer counts as active", () => {
      const { result } = setup();
      act(() => result.current.start({ platform: PLATFORM, listing: READY_LISTING }));
      expect(result.current.isActive).toBe(true);

      act(() => result.current.reset());

      expect(result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(result.current.isActive).toBe(false);
    });

    test("drops a session answer that arrives afterwards, so no Channex screen opens", async () => {
      const pending = deferred();
      createConnectSession.mockReturnValue(pending.promise);
      const { result } = setup();
      act(() => result.current.start({ platform: PLATFORM, listing: READY_LISTING }));
      act(() => {
        result.current.continueFromChecklist();
      });
      expect(result.current.step).toBe(CONNECT_STEP.CONNECTING);

      act(() => result.current.reset());
      await act(async () => pending.resolve({ iframeUrl: URL_OK }));

      expect(result.current.step).toBe(CONNECT_STEP.IDLE);
      expect(result.current.url).toBeNull();
    });

    test("drops a session failure that arrives afterwards, so no message appears", async () => {
      const pending = deferred();
      createConnectSession.mockReturnValue(pending.promise);
      const { result, rereadListings } = setup();
      act(() => result.current.start({ platform: PLATFORM, listing: READY_LISTING }));
      act(() => {
        result.current.continueFromChecklist();
      });

      act(() => result.current.reset());
      await act(async () => pending.reject(new Error("boom")));

      expect(result.current.errorMessage).toBe("");
      expect(rereadListings).not.toHaveBeenCalled();
    });

    test("exposes the flow's listing id from the checklist step on, where only the listing is held", () => {
      const hook = setup();

      startFlow(hook, NOT_ENABLED_LISTING);

      expect(hook.result.current.propertyId).toBe("p1");
    });

    test("drops an enable answer that arrives afterwards: no re-read, no session", async () => {
      const pending = deferred();
      enableDistribution.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      act(() => {
        hook.result.current.continueFromChecklist();
      });
      expect(hook.result.current.step).toBe(CONNECT_STEP.ENABLING);

      act(() => hook.result.current.reset());
      await act(async () => pending.resolve({ status: "PROVISIONED" }));

      expect(hook.rereadListings).not.toHaveBeenCalled();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(CONNECT_STEP.IDLE);
    });

    test("drops an enable failure that arrives afterwards: no message, no re-read", async () => {
      const pending = deferred();
      enableDistribution.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook, NOT_ENABLED_LISTING);
      act(() => {
        hook.result.current.continueFromChecklist();
      });

      act(() => hook.result.current.reset());
      await act(async () => pending.reject(requestError(503, "DISTRIBUTION_TRY_AGAIN")));

      expect(hook.result.current.errorMessage).toBe("");
      expect(hook.rereadListings).not.toHaveBeenCalled();
    });

    test("does nothing while idle", () => {
      const { result } = setup();

      act(() => result.current.reset());

      expect(result.current.step).toBe(CONNECT_STEP.IDLE);
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
