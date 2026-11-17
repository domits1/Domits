import { updatePropertyLifecycleStatus } from "./hostPropertyApi";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

const textResponse = (rawBody, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  text: async () => rawBody,
  json: async () => JSON.parse(rawBody),
});

describe("updatePropertyLifecycleStatus", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("returns the status reported by the API instead of the requested one", async () => {
    global.fetch.mockResolvedValue(textResponse(JSON.stringify({ status: "PENDING_REVIEW" })));

    await expect(updatePropertyLifecycleStatus({ propertyId: "p1", status: "active" })).resolves.toEqual({
      status: "PENDING_REVIEW",
    });
  });

  it("sends the uppercased requested status in the PATCH body", async () => {
    global.fetch.mockResolvedValue(textResponse(JSON.stringify({ status: "ACTIVE" })));

    await updatePropertyLifecycleStatus({ propertyId: "p1", status: "active" });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ propertyId: "p1", property: "p1", status: "ACTIVE" });
  });

  it.each([
    ["an empty 204 body", ""],
    ["invalid JSON", "<html>not json</html>"],
    ["a body without a status", JSON.stringify({ ok: true })],
  ])("falls back to the requested status on %s", async (_label, rawBody) => {
    global.fetch.mockResolvedValue(textResponse(rawBody, { status: 204 }));

    await expect(updatePropertyLifecycleStatus({ propertyId: "p1", status: "ACTIVE" })).resolves.toEqual({
      status: "ACTIVE",
    });
  });

  it("throws when the API rejects the update", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Not allowed" }),
      text: async () => JSON.stringify({ message: "Not allowed" }),
    });

    await expect(updatePropertyLifecycleStatus({ propertyId: "p1", status: "ACTIVE" })).rejects.toThrow();
  });
});
