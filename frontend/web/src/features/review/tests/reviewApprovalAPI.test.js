import { API_REVIEW_BASE, approveReview, publishApprovedReview, getPendingApprovalReviews } from "../services/reviewAPI";

jest.mock("../../../services/getAccessToken", () => ({ getIdToken: async () => "token" }));

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const respond = (status, body) => ({ ok: status < 400, status, text: async () => body });

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
