// test/Alessio-Revenue/handler.test.js
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

const mockGetHostKpi = jest.fn();

jest.mock("../../functions/Alessio-Revenue/controller/controller.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getHostKpi: mockGetHostKpi,
  })),
}));

describe("Alessio-Revenue handler (event listener)", () => {
  let handler;

  beforeAll(async () => {
    // import pas hier, zodat jest.mock eerst toegepast is
    const mod = await import("../../functions/Alessio-Revenue/index.js");
    handler = mod.handler;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET calls controller.getHostKpi and returns its response", async () => {
    const event = { httpMethod: "GET" };

    const fakeResponse = {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };

    mockGetHostKpi.mockResolvedValue(fakeResponse);

    const res = await handler(event);

    expect(mockGetHostKpi).toHaveBeenCalledTimes(1);
    expect(mockGetHostKpi).toHaveBeenCalledWith(event);
    expect(res).toEqual(fakeResponse);
  });

  test("Non-GET returns 400", async () => {
    const res = await handler({ httpMethod: "POST" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("Unsupported HTTP method");
  });
});