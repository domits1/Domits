import { saveHostResponse, deleteHostResponse, API_REVIEW_BASE } from "../services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: async () => "token" }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test("publishes only response text to the authenticated response endpoint", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"response":{"message":"Thanks"}}' });
  expect(await saveHostResponse("r1", "Thanks")).toEqual({ message: "Thanks" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r1/response/publish`, {
    method: "POST", headers: { Authorization: "token", "Content-Type": "application/json" }, body: '{"message":"Thanks"}',
  });
});

test("deletes the selected response with the authenticated ID token", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
  await deleteHostResponse("review/id");
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/review%2Fid/response`, {
    method: "DELETE", headers: { Authorization: "token" },
  });
});
test("surfaces deletion errors", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '{"message":"Access denied"}' });
  await expect(deleteHostResponse("r1")).rejects.toThrow("Access denied");
});
