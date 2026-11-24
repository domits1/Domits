import { act, renderHook } from "@testing-library/react";
import { CONNECT_STEP, useConnectFlow } from "./useConnectFlow";
import { CONNECT_ERROR_MESSAGE } from "../utils/connectErrors";
import { createConnectSession } from "../services/hostDistributionApi";

jest.mock("../services/hostDistributionApi");

const PLATFORM = { otaCode: "Vrbo", name: "Vrbo" };
const URL_OK = "https://staging.channex.io/mock-connect?token=mock";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const setup = () => {
  const refresh = jest.fn();
  const rereadListings = jest.fn();
  const hook = renderHook(() => useConnectFlow({ refresh, rereadListings }));
  return { ...hook, refresh, rereadListings };
};

// Walks to the iframe step and returns the hook.
const openIframe = async () => {
  const hook = setup();
  createConnectSession.mockResolvedValue({ iframeUrl: URL_OK });
  act(() => hook.result.current.start({ platform: PLATFORM, propertyId: "p1" }));
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
    const { result } = setup();

    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    expect(result.current.step).toBe(CONNECT_STEP.CHECKLIST);
    expect(result.current.platform).toBe(PLATFORM);
    expect(result.current.isActive).toBe(true);
    expect(createConnectSession).not.toHaveBeenCalled();
  });

  test("cancelling the checklist returns to idle without a request or a refresh", () => {
    const { result, refresh } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    act(() => result.current.cancel());

    expect(result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(createConnectSession).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("continue moves to connecting and asks for a session with the listing id only", async () => {
    const pending = deferred();
    createConnectSession.mockReturnValue(pending.promise);
    const { result } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    act(() => {
      result.current.continueFromChecklist();
    });

    expect(result.current.step).toBe(CONNECT_STEP.CONNECTING);
    expect(createConnectSession).toHaveBeenCalledTimes(1);
    expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p1" });

    await act(async () => pending.resolve({ iframeUrl: URL_OK }));

    expect(result.current.step).toBe(CONNECT_STEP.IFRAME);
    expect(result.current.url).toBe(URL_OK);
  });

  test("a session failure returns to idle with a message and never reaches the iframe", async () => {
    createConnectSession.mockRejectedValue(new Error("boom"));
    const { result, refresh, rereadListings } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    await act(async () => result.current.continueFromChecklist());

    expect(result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(result.current.url).toBeNull();
    expect(result.current.errorMessage).toBe(CONNECT_ERROR_MESSAGE);
    expect(console.error).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(rereadListings).not.toHaveBeenCalled();
  });

  test("a listing that is not turned on says so and reads the listings again once", async () => {
    const notTurnedOn = Object.assign(new Error("conflict"), {
      status: 409,
      responseBody: { errorCode: "DISTRIBUTION_NOT_TURNED_ON" },
    });
    createConnectSession.mockRejectedValue(notTurnedOn);
    const { result, rereadListings } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    await act(async () => result.current.continueFromChecklist());

    expect(result.current.step).toBe(CONNECT_STEP.IDLE);
    expect(result.current.errorMessage).toBe("This listing isn't turned on yet.");
    expect(rereadListings).toHaveBeenCalledTimes(1);
  });

  test("a listing that is not the host's says so and does not read the listings again", async () => {
    const notOwned = Object.assign(new Error("forbidden"), {
      status: 403,
      responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_OWNED" },
    });
    createConnectSession.mockRejectedValue(notOwned);
    const { result, rereadListings } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    await act(async () => result.current.continueFromChecklist());

    expect(result.current.errorMessage).toBe("You don't have access to this listing.");
    expect(rereadListings).not.toHaveBeenCalled();
  });

  test("starting again clears the earlier failure message", async () => {
    createConnectSession.mockRejectedValueOnce(new Error("boom"));
    const { result } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));
    await act(async () => result.current.continueFromChecklist());
    expect(result.current.errorMessage).toBe(CONNECT_ERROR_MESSAGE);

    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    expect(result.current.errorMessage).toBe("");
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

  test("a second Continue while connecting does not ask for another session", async () => {
    createConnectSession.mockReturnValue(deferred().promise);
    const { result } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    act(() => {
      result.current.continueFromChecklist();
      result.current.continueFromChecklist();
    });

    expect(createConnectSession).toHaveBeenCalledTimes(1);
  });

  test("start is ignored while a flow is open", () => {
    const { result } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));

    act(() => result.current.start({ platform: { otaCode: "Airbnb", name: "Airbnb" }, propertyId: "p2" }));

    expect(result.current.platform).toBe(PLATFORM);
  });

  test("an answer that arrives after unmount changes nothing and does not throw", async () => {
    const pending = deferred();
    createConnectSession.mockReturnValue(pending.promise);
    const { result, unmount } = setup();
    act(() => result.current.start({ platform: PLATFORM, propertyId: "p1" }));
    act(() => {
      result.current.continueFromChecklist();
    });

    unmount();
    await act(async () => pending.resolve({ iframeUrl: URL_OK }));

    expect(console.error).not.toHaveBeenCalled();
  });
});
