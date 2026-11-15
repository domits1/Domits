import { API_REVIEW_BASE, approveReview, publishApprovedReview, getPendingApprovalReviews,
  getAdminReviews, hasReviewApprovalAccess, submitReviewForApproval } from "../services/reviewAPI";

jest.mock("../../../services/getAccessToken", () => ({ getIdToken: async () => "token" }));

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const respond = (status, body) => ({ ok: status < 400, status, text: async () => body });

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
