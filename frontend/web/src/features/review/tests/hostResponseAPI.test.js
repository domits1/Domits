import { saveHostResponse, API_REVIEW_BASE } from "../services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "token" }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test("publishes only response text to the authenticated response endpoint", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"response":{"message":"Thanks"}}' });
  expect(await saveHostResponse("r1", "Thanks")).toEqual({ message: "Thanks" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r1/response/publish`, {
    method: "POST", headers: { Authorization: "token", "Content-Type": "application/json" }, body: '{"message":"Thanks"}',
  });
});
