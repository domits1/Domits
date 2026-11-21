import { act, renderHook, waitFor } from "@testing-library/react";
import useReviewApprovalQueue, { QUEUE_STATE } from "../hooks/useReviewApprovalQueue";
import { getAdminReviews, approveReview, publishApprovedReview } from "../services/reviewAPI";

jest.mock("../services/reviewAPI", () => ({
  getAdminReviews: jest.fn(), approveReview: jest.fn(), publishApprovedReview: jest.fn(),
}));

const review = { id: "r1", title: "Great stay", updated_at: 123 };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => {
  jest.resetAllMocks();
  getAdminReviews.mockResolvedValue([review]);
});

test("loads the requested scope and ignores an obsolete response", async () => {
  const old = deferred();
  getAdminReviews.mockReturnValueOnce(old.promise);
  const { result, rerender } = renderHook(({ scope }) => useReviewApprovalQueue(scope), {
    initialProps: { scope: "pending-approval" },
  });
  expect(result.current.queueState).toBe(QUEUE_STATE.LOADING);
  rerender({ scope: "approved" });
  await waitFor(() => expect(result.current.queueState).toBe(QUEUE_STATE.READY));
  await act(async () => old.resolve([{ id: "obsolete" }]));
  expect(result.current.reviews).toEqual([review]);
  expect(getAdminReviews.mock.calls).toEqual([["pending-approval"], ["approved"]]);
});

test.each([401, 403, 500, undefined])("classifies load failure %p and supports retry", async (status) => {
  getAdminReviews.mockRejectedValueOnce({ status, message: "Load failed" });
  const { result } = renderHook(() => useReviewApprovalQueue("approved"));
  await waitFor(() => expect(result.current.queueState).toBe(
    status === 401 || status === 403 ? QUEUE_STATE.DENIED : QUEUE_STATE.FAILED,
  ));
  expect(result.current.loadError).toBe("Load failed");
  expect(result.current.reviews).toEqual([]);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.queueState).toBe(QUEUE_STATE.READY));
  expect(result.current.reviews).toEqual([review]);
});

test.each([
  ["approve", "pending-approval", approveReview],
  ["publish", "approved", publishApprovedReview],
])("%s blocks duplicate actions and removes a successful review", async (action, scope, api) => {
  const response = deferred();
  api.mockReturnValue(response.promise);
  const { result } = renderHook(() => useReviewApprovalQueue(scope));
  await waitFor(() => expect(result.current.queueState).toBe(QUEUE_STATE.READY));
  let request;
  act(() => {
    request = result.current[action](review);
    result.current[action](review);
  });
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0]).toEqual(action === "approve" ? ["r1", 123] : ["r1"]);
  expect(result.current.approvingIds.has("r1")).toBe(true);
  await act(async () => { response.resolve({ id: "r1" }); await request; });
  expect(result.current.reviews).toEqual([]);
  expect(result.current.approvingIds.size).toBe(0);
  expect(result.current.notice.type).toBe("success");
});

test.each([
  ["approve", "pending-approval", approveReview],
  ["publish", "approved", publishApprovedReview],
])("%s retains failed reviews and releases the guard for retry", async (action, scope, api) => {
  api.mockRejectedValueOnce(new Error("Conflict")).mockResolvedValue({ status: "UPDATED" });
  const { result } = renderHook(() => useReviewApprovalQueue(scope));
  await waitFor(() => expect(result.current.queueState).toBe(QUEUE_STATE.READY));
  await act(async () => result.current[action](review));
  expect(result.current.reviews).toEqual([review]);
  expect(result.current.notice).toEqual({ type: "error", message: "Conflict" });
  expect(result.current.approvingIds.size).toBe(0);
  await act(async () => result.current[action](review));
  expect(api).toHaveBeenCalledTimes(2);
  expect(result.current.reviews).toEqual([]);
  expect(result.current.approvingIds.size).toBe(0);
  expect(result.current.notice.type).toBe("success");
});
