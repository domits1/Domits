import { API_REVIEW_BASE, approveReview, publishApprovedReview, getPendingApprovalReviews,
  getAdminReviews, hasReviewApprovalAccess, clearReviewApprovalAccessCache, submitReviewForApproval } from "../services/reviewAPI";
import { getIdToken } from "../../../services/getAccessToken";

jest.mock("../../../services/getAccessToken", () => ({ getIdToken: jest.fn() }));

beforeEach(() => {
  clearReviewApprovalAccessCache();
  getIdToken.mockReset().mockResolvedValue("token");
});

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

const respond = (status, body) => ({ ok: status < 400, status, text: async () => body });

test("shares and caches confirmed approval access", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, "[]"));
  const answers = await Promise.all([hasReviewApprovalAccess(), hasReviewApprovalAccess()]);
  expect(answers).toEqual([true, true]);
  await hasReviewApprovalAccess();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test.each([401, 403])("does not cache a denied answer for HTTP %s", async (status) => {
  global.fetch = jest.fn().mockResolvedValueOnce(respond(status, "")).mockResolvedValueOnce(respond(200, "[]"));
  expect(await hasReviewApprovalAccess()).toBe(false);
  expect(await hasReviewApprovalAccess()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("retries an aborted shared request within the later caller's deadline", async () => {
  jest.useFakeTimers();
  let started;
  const requestStarted = new Promise((resolve) => { started = resolve; });
  global.fetch = jest.fn().mockImplementationOnce(() => { started(); return new Promise(() => {}); })
    .mockResolvedValue(respond(200, "[]"));
  const first = hasReviewApprovalAccess();
  await requestStarted;
  jest.advanceTimersByTime(4000);
  const second = hasReviewApprovalAccess();
  await Promise.resolve();
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1000);
  expect(await first).toBeNull();
  expect(await second).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(fetch.mock.calls[1][1].signal.aborted).toBe(false);
});

test("does not reuse access across authentication tokens", async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(respond(200, "[]")).mockResolvedValueOnce(respond(403, ""));
  expect(await hasReviewApprovalAccess()).toBe(true);
  getIdToken.mockResolvedValue("other-account-token");
  expect(await hasReviewApprovalAccess()).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("expires cached access and clears it on authentication changes", async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue(respond(200, "[]"));
  await hasReviewApprovalAccess();
  jest.advanceTimersByTime(5 * 60 * 1000);
  await hasReviewApprovalAccess();
  globalThis.dispatchEvent(new Event("authChanged"));
  await hasReviewApprovalAccess();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("does not cache a service outage", async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(respond(503, "")).mockResolvedValueOnce(respond(200, "[]"));
  expect(await hasReviewApprovalAccess()).toBeNull();
  expect(await hasReviewApprovalAccess()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("times out and aborts a stalled request, allowing a fresh retry", async () => {
  jest.useFakeTimers();
  let started;
  const requestStarted = new Promise((resolve) => { started = resolve; });
  global.fetch = jest.fn().mockImplementationOnce(() => { started(); return new Promise(() => {}); }).mockResolvedValue(respond(200, "[]"));
  const answer = hasReviewApprovalAccess();
  await requestStarted;
  jest.advanceTimersByTime(5000);
  expect(await answer).toBeNull();
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(await hasReviewApprovalAccess()).toBe(true);
});

test("bounds loading even when token acquisition stalls", async () => {
  jest.useFakeTimers();
  getIdToken.mockReturnValue(new Promise(() => {}));
  const answer = hasReviewApprovalAccess();
  jest.advanceTimersByTime(5000);
  expect(await answer).toBeNull();
});

test.each(["", "null", "{}", '{"reviews":[]}', "invalid JSON"])(
  "rejects an unexpected successful queue response: %s", async (body) => {
    global.fetch = jest.fn().mockResolvedValue(respond(200, body));
    await expect(getPendingApprovalReviews()).rejects.toThrow("The server returned an unexpected response.");
  },
);

test("distinguishes an empty queue from an unreadable response", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, "[]"));
  expect(await getPendingApprovalReviews()).toEqual([]);
  global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => { throw new Error("Read failed"); } });
  await expect(getPendingApprovalReviews()).rejects.toThrow("The server returned an unexpected response.");
});

test("loads the requested admin scope", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, "[]"));
  expect(await getAdminReviews("approved")).toEqual([]);
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews?scope=approved`, {
    method: "GET", headers: { Authorization: "token" },
  });
});

test("confirms approval access even when the valid queue is empty", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, "[]"));
  expect(await hasReviewApprovalAccess()).toBe(true);
});

test.each([401, 403])("denies approval access for HTTP %s", async (status) => {
  global.fetch = jest.fn().mockResolvedValue(respond(status, ""));
  expect(await hasReviewApprovalAccess()).toBe(false);
});

test.each([500, 503])("keeps approval access unknown for HTTP %s", async (status) => {
  global.fetch = jest.fn().mockResolvedValue(respond(status, ""));
  expect(await hasReviewApprovalAccess()).toBeNull();
});

test("keeps approval access unknown during a network failure", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("Network unavailable"));
  expect(await hasReviewApprovalAccess()).toBeNull();
});

test("does not confirm approval access from a malformed queue response", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, "{}"));
  expect(await hasReviewApprovalAccess()).toBeNull();
});

test("submits an encoded review ID for approval with authentication", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, '{"id":"r/1","status":"PENDING_APPROVAL"}'));
  expect(await submitReviewForApproval("r/1")).toEqual({ id: "r/1", status: "PENDING_APPROVAL" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r%2F1/publish`, {
    method: "POST", headers: { Authorization: "token" },
  });
});

test.each([
  [401, "", "Please log in again before leaving a review."],
  [403, "", "You can only review your own completed reservations."],
  [409, "", "This reservation already has a review."],
  [400, '{"message":"Review is incomplete."}', "Review is incomplete."],
  [400, "", "Please check your review and try again."],
  [500, "", "Could not submit your review. Please try again."],
])("reports submission failure for HTTP %s", async (status, body, message) => {
  global.fetch = jest.fn().mockResolvedValue(respond(status, body));
  await expect(submitReviewForApproval("r1")).rejects.toThrow(message);
});

test("propagates submission network failures", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("Network unavailable"));
  await expect(submitReviewForApproval("r1")).rejects.toThrow("Network unavailable");
});

test("publishes an approved review with the ID token", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, '{"id":"r/1","status":"PUBLISHED"}'));
  expect(await publishApprovedReview("r/1")).toEqual({ id: "r/1", status: "PUBLISHED" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r%2F1/publish`, {
    method: "POST", headers: { Authorization: "token" },
  });
});

test("surfaces the backend reason when publication is refused", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(403, '{"message":"An active review approver role is required."}'));
  await expect(publishApprovedReview("r1")).rejects.toMatchObject({
    status: 403, message: "An active review approver role is required.",
  });
});

test("loads the pending-approval scope with the ID token", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, '[{"id":"r1"}]'));

  expect(await getPendingApprovalReviews()).toEqual([{ id: "r1" }]);
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews?scope=pending-approval`, {
    method: "GET",
    headers: { Authorization: "token" },
  });
});

test("keeps the status on a refused queue load so the page can tell a missing role from an outage", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(403, '{"message":"Administrator access is required."}'));

  await expect(getPendingApprovalReviews()).rejects.toMatchObject({
    message: "Administrator access is required.",
    status: 403,
  });
});

test("approves with only the version the admin saw", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(200, '{"id":"r/1","status":"APPROVED"}'));

  expect(await approveReview("r/1", 1790000000000)).toEqual({ id: "r/1", status: "APPROVED" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r%2F1/approve`, {
    method: "POST",
    headers: { Authorization: "token", "Content-Type": "application/json" },
    body: '{"updated_at":1790000000000}',
  });
});

test("surfaces the backend reason, or a fallback, when approval fails", async () => {
  global.fetch = jest.fn().mockResolvedValue(respond(409, '{"message":"Review changed. Reload before continuing."}'));
  await expect(approveReview("r1", 1)).rejects.toMatchObject({
    message: "Review changed. Reload before continuing.",
    status: 409,
  });

  global.fetch = jest.fn().mockResolvedValue(respond(500, ""));
  await expect(approveReview("r1", 1)).rejects.toThrow("Could not approve this review. Please try again.");
});
