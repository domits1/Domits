import { act, renderHook } from "@testing-library/react";
import { DISCONNECT_STEP, useDisconnectFlow } from "./useDisconnectFlow";
import { disconnectChannel } from "../services/hostDistributionApi";
import { DISCONNECT_ERROR_MESSAGE } from "../utils/disconnectErrors";

jest.mock("../services/hostDistributionApi");

const PLATFORM = { otaCode: "Airbnb", name: "Airbnb" };
const CHANNEL = { channelId: "c-1", otaCode: "Airbnb", upcomingBookingCount: 2 };
const ANSWER_LISTING = { propertyId: "p1", title: "Answered" };

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
  const hook = renderHook(() => useDisconnectFlow({ refresh, applyListing }));
  return { ...hook, refresh, applyListing };
};

const startFlow = (hook, channel = CHANNEL) =>
  act(() => hook.result.current.start({ platform: PLATFORM, propertyId: "p1", channel }));

const confirmFlow = (hook) => act(async () => hook.result.current.confirm());

describe("useDisconnectFlow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("starts idle and not active", () => {
    const { result } = setup();

    expect(result.current.step).toBe(DISCONNECT_STEP.IDLE);
    expect(result.current.isActive).toBe(false);
  });

  test("start opens the confirm step with the channel, without any request", () => {
    const hook = setup();

    startFlow(hook);

    expect(hook.result.current.step).toBe(DISCONNECT_STEP.CONFIRM);
    expect(hook.result.current.platform).toBe(PLATFORM);
    expect(hook.result.current.channel).toBe(CHANNEL);
    expect(hook.result.current.isActive).toBe(true);
    expect(disconnectChannel).not.toHaveBeenCalled();
  });

  test("start is ignored while a flow is open", () => {
    const hook = setup();
    startFlow(hook);

    startFlow(hook, { channelId: "c-2", otaCode: "Vrbo" });

    expect(hook.result.current.channel).toBe(CHANNEL);
  });

  test("cancelling returns to idle without a request, an apply or a refresh", () => {
    const hook = setup();
    startFlow(hook);

    act(() => hook.result.current.cancel());

    expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
    expect(disconnectChannel).not.toHaveBeenCalled();
    expect(hook.applyListing).not.toHaveBeenCalled();
    expect(hook.refresh).not.toHaveBeenCalled();
  });

  test("cancel is ignored once the request is running", () => {
    disconnectChannel.mockReturnValue(deferred().promise);
    const hook = setup();
    startFlow(hook);
    act(() => {
      hook.result.current.confirm();
    });

    act(() => hook.result.current.cancel());

    expect(hook.result.current.step).toBe(DISCONNECT_STEP.DISCONNECTING);
  });

  describe("confirming", () => {
    test("asks to disconnect the channel by its id only, and shows the disconnecting step while it runs", async () => {
      disconnectChannel.mockReturnValue(deferred().promise);
      const hook = setup();
      startFlow(hook);

      act(() => {
        hook.result.current.confirm();
      });

      expect(hook.result.current.step).toBe(DISCONNECT_STEP.DISCONNECTING);
      expect(disconnectChannel).toHaveBeenCalledTimes(1);
      expect(disconnectChannel).toHaveBeenCalledWith({ channelId: "c-1" });
    });

    test("applies the answered listing once, with no refresh, and returns to idle", async () => {
      disconnectChannel.mockResolvedValue({ listing: ANSWER_LISTING });
      const hook = setup();
      startFlow(hook);

      await confirmFlow(hook);

      expect(hook.applyListing).toHaveBeenCalledTimes(1);
      expect(hook.applyListing).toHaveBeenCalledWith("p1", ANSWER_LISTING);
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
      expect(hook.result.current.errorMessage).toBe("");
    });

    test.each([
      ["no listing", {}],
      ["no answer at all", undefined],
      ["a listing without an id", { listing: { title: "x" } }],
      ["another listing", { listing: { propertyId: "p2" } }],
    ])("an answer with %s reads the listing again once instead of applying it", async (_name, answer) => {
      disconnectChannel.mockResolvedValue(answer);
      const hook = setup();
      startFlow(hook);

      await confirmFlow(hook);

      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(hook.refresh).toHaveBeenCalledTimes(1);
      expect(hook.refresh).toHaveBeenCalledWith("p1");
      expect(hook.result.current.errorMessage).toBe("");
    });

    test("a double click sends one request", async () => {
      disconnectChannel.mockReturnValue(deferred().promise);
      const hook = setup();
      startFlow(hook);

      act(() => {
        hook.result.current.confirm();
        hook.result.current.confirm();
      });

      expect(disconnectChannel).toHaveBeenCalledTimes(1);
    });

    test("confirm does nothing when there is nothing to confirm", async () => {
      const hook = setup();

      await confirmFlow(hook);

      expect(disconnectChannel).not.toHaveBeenCalled();
    });

    test("confirm after the answer arrived does nothing more", async () => {
      disconnectChannel.mockResolvedValue({ listing: ANSWER_LISTING });
      const hook = setup();
      startFlow(hook);
      await confirmFlow(hook);

      await confirmFlow(hook);

      expect(disconnectChannel).toHaveBeenCalledTimes(1);
      expect(hook.applyListing).toHaveBeenCalledTimes(1);
    });
  });

  describe("when it fails", () => {
    test.each([
      ["a 404", requestError(404, "CHANNEL_NOT_FOUND"), ""],
      ["a 409", requestError(409, "DISCONNECT_IN_PROGRESS"), ""],
      ["a 500", requestError(500, "DISCONNECT_FAILED"), DISCONNECT_ERROR_MESSAGE],
    ])("%s reads the listing again once and shows its message", async (_name, error, message) => {
      disconnectChannel.mockRejectedValue(error);
      const hook = setup();
      startFlow(hook);

      await confirmFlow(hook);

      expect(hook.refresh).toHaveBeenCalledTimes(1);
      expect(hook.refresh).toHaveBeenCalledWith("p1");
      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(hook.result.current.errorMessage).toBe(message);
      expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
      expect(console.error).toHaveBeenCalled();
    });

    test.each([
      ["a 403", requestError(403, undefined)],
      ["a network error", new Error("Failed to fetch")],
    ])("%s alerts and leaves the listing alone, with no refresh", async (_name, error) => {
      disconnectChannel.mockRejectedValue(error);
      const hook = setup();
      startFlow(hook);

      await confirmFlow(hook);

      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(hook.result.current.errorMessage).toBe(DISCONNECT_ERROR_MESSAGE);
      expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
    });

    test("starting again clears the earlier message, and clearError clears it on request", async () => {
      disconnectChannel.mockRejectedValue(new Error("Failed to fetch"));
      const hook = setup();
      startFlow(hook);
      await confirmFlow(hook);
      expect(hook.result.current.errorMessage).toBe(DISCONNECT_ERROR_MESSAGE);

      startFlow(hook);
      expect(hook.result.current.errorMessage).toBe("");

      act(() => hook.result.current.cancel());
      await confirmFlow(hook);
      startFlow(hook);
      await confirmFlow(hook);
      expect(hook.result.current.errorMessage).toBe(DISCONNECT_ERROR_MESSAGE);

      act(() => hook.result.current.clearError());
      expect(hook.result.current.errorMessage).toBe("");
    });
  });

  describe("reset", () => {
    test("returns an open confirm to idle, so it no longer counts as active", () => {
      const hook = setup();
      startFlow(hook);

      act(() => hook.result.current.reset());

      expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
      expect(hook.result.current.isActive).toBe(false);
    });

    test("exposes the flow's listing id while it is open", () => {
      const hook = setup();

      startFlow(hook);

      expect(hook.result.current.propertyId).toBe("p1");
    });

    test("drops an answer that arrives afterwards: nothing is applied or refreshed", async () => {
      const pending = deferred();
      disconnectChannel.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);
      act(() => {
        hook.result.current.confirm();
      });
      expect(hook.result.current.step).toBe(DISCONNECT_STEP.DISCONNECTING);

      act(() => hook.result.current.reset());
      await act(async () => pending.resolve({ listing: ANSWER_LISTING }));

      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
      expect(hook.result.current.step).toBe(DISCONNECT_STEP.IDLE);
    });

    test("drops a failure that arrives afterwards: no message, no refresh", async () => {
      const pending = deferred();
      disconnectChannel.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);
      act(() => {
        hook.result.current.confirm();
      });

      act(() => hook.result.current.reset());
      await act(async () => pending.reject(requestError(500, "DISCONNECT_FAILED")));

      expect(hook.result.current.errorMessage).toBe("");
      expect(hook.refresh).not.toHaveBeenCalled();
    });

    test("does nothing while idle", () => {
      const { result } = setup();

      act(() => result.current.reset());

      expect(result.current.step).toBe(DISCONNECT_STEP.IDLE);
    });
  });

  describe("unmounting while the request runs", () => {
    test("a success afterwards applies nothing and refreshes nothing", async () => {
      const pending = deferred();
      disconnectChannel.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);
      act(() => {
        hook.result.current.confirm();
      });

      hook.unmount();
      await act(async () => pending.resolve({ listing: ANSWER_LISTING }));

      expect(hook.applyListing).not.toHaveBeenCalled();
      expect(hook.refresh).not.toHaveBeenCalled();
    });

    test("a failure afterwards refreshes nothing", async () => {
      const pending = deferred();
      disconnectChannel.mockReturnValue(pending.promise);
      const hook = setup();
      startFlow(hook);
      act(() => {
        hook.result.current.confirm();
      });

      hook.unmount();
      await act(async () => pending.reject(requestError(500, "DISCONNECT_FAILED")));

      expect(hook.refresh).not.toHaveBeenCalled();
    });
  });
});
