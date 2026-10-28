import { saveHostResponse, deleteHostResponse, API_REVIEW_BASE } from "../services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getIdToken: () => "token" }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test("publishes only response text to the authenticated response endpoint", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"response":{"message":"Thanks"}}' });
  expect(await saveHostResponse("r1", "Thanks")).toEqual({ message: "Thanks" });
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/r1/response/publish`, {
    method: "POST", headers: { Authorization: "token", "Content-Type": "application/json" }, body: '{"message":"Thanks"}',
  });
});

test.each([
  ["draft", "POST", ""], ["edit", "PATCH", ""], ["publish", "POST", "/publish"],
])("sends authenticated %s requests", async (action, method, suffix) => {
  const originalFetch = global.fetch;
  const response = { id: "d1", message: "Thanks", status: action === "publish" ? "published" : "draft" };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ response }) });
  try {
    await expect(saveHostResponse("review & one", "Thanks", action)).resolves.toEqual(response);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`/reviews/review%20%26%20one/response${suffix}`), {
      method, headers: { Authorization: "token", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Thanks" }),
    });
  } finally { global.fetch = originalFetch; }
});

test("deletes through the authenticated endpoint and accepts empty 204", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
  await expect(deleteHostResponse("review & one")).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews/review%20%26%20one/response`, {
    method: "DELETE", headers: { Authorization: "token" },
  });
});
test("surfaces deletion errors", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '{"message":"Access denied"}' });
  await expect(deleteHostResponse("r1")).rejects.toThrow("Access denied");
});
