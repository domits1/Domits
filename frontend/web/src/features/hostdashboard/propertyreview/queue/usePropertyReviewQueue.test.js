import { act, renderHook, waitFor } from "@testing-library/react";
import { PropertyReviewApiError, REVIEW_API_ERROR_CODE, fetchReviewQueue } from "../services/propertyReviewApi";
import usePropertyReviewQueue from "./usePropertyReviewQueue";

jest.mock("../services/propertyReviewApi", () => ({
  ...jest.requireActual("../services/propertyReviewApi"),
  fetchReviewQueue: jest.fn(),
}));

const card = (id) => ({ property: { id, title: `Title ${id}` } });
const page = (ids, nextCursor = null) => ({ properties: ids.map(card), nextCursor });
const failure = () => new PropertyReviewApiError(500, REVIEW_API_ERROR_CODE.SERVER, "boom");
const idsOf = (result) => result.current.items.map((item) => item.property.id);

describe("usePropertyReviewQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads the first page without a cursor", async () => {
    fetchReviewQueue.mockResolvedValue(page(["a", "b"], "c1"));

    const { result } = renderHook(() => usePropertyReviewQueue());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(idsOf(result)).toEqual(["a", "b"]);
    expect(result.current.nextCursor).toBe("c1");
    expect(fetchReviewQueue).toHaveBeenCalledWith(expect.objectContaining({ cursor: undefined }));
  });

  test("loadMore sends the next cursor and appends the new cards", async () => {
    fetchReviewQueue.mockResolvedValueOnce(page(["a"], "c1")).mockResolvedValueOnce(page(["b"], null));
    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchReviewQueue).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "c1" }));
    expect(idsOf(result)).toEqual(["a", "b"]);
    expect(result.current.nextCursor).toBeNull();
  });

  test("drops cards that are already shown and keeps the original order", async () => {
    fetchReviewQueue.mockResolvedValueOnce(page(["a", "b"], "c1")).mockResolvedValueOnce(page(["b", "c", "c"]));
    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(idsOf(result)).toEqual(["a", "b", "c"]);
  });

  test("ignores cards without a property id", async () => {
    fetchReviewQueue.mockResolvedValue({ properties: [card("a"), { property: {} }, {}], nextCursor: null });

    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(idsOf(result)).toEqual(["a"]);
  });

  test("sets the error when the first load fails and retry loads again", async () => {
    const error = failure();
    fetchReviewQueue.mockRejectedValueOnce(error).mockResolvedValueOnce(page(["a"]));
    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(idsOf(result)).toEqual(["a"]);
    expect(fetchReviewQueue).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: undefined }));
  });

  test("a failed load more keeps the shown cards and retrying uses the same cursor", async () => {
    const error = failure();
    fetchReviewQueue
      .mockResolvedValueOnce(page(["a"], "c1"))
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(page(["b"]));
    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.loadMoreError).toBe(error);
    expect(result.current.error).toBeNull();
    expect(idsOf(result)).toEqual(["a"]);
    expect(result.current.nextCursor).toBe("c1");

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchReviewQueue).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "c1" }));
    expect(result.current.loadMoreError).toBeNull();
    expect(idsOf(result)).toEqual(["a", "b"]);
  });

  test("ignores a second load more while one is in flight", async () => {
    fetchReviewQueue.mockResolvedValueOnce(page(["a"], "c1")).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => usePropertyReviewQueue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });

    expect(fetchReviewQueue).toHaveBeenCalledTimes(2);
  });

  test("aborts the in-flight request on unmount without reporting an error", async () => {
    let signal;
    fetchReviewQueue.mockImplementation((args) => {
      signal = args.signal;
      return new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
      );
    });
    const { result, unmount } = renderHook(() => usePropertyReviewQueue());

    unmount();

    expect(signal.aborted).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
