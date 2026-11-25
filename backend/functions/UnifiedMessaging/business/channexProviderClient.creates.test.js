const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");

// Design note D2 (#506): Domits creates a listing's property, room type and rate plan in Channex.
// A create that times out or gets a 5xx may still have happened in Channex, so the result says whether
// the outcome is known; the provisioning service must not blindly create a second one (step 3d).
const CREATES = [
  { method: "createProperty", endpoint: "/api/v1/properties", body: { property: { title: "Villa" } } },
  { method: "createRoomType", endpoint: "/api/v1/room_types", body: { room_type: { title: "Villa" } } },
  { method: "createRatePlan", endpoint: "/api/v1/rate_plans", body: { rate_plan: { title: "Standard Rate" } } },
];

// A fetch that never answers until the request is aborted, like a Channex call that hangs.
const hangingFetch = () =>
  jest.fn(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
  );

describe.each(CREATES)("ChannexProviderClient.$method", ({ method, endpoint, body }) => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("posts the body with the API key and returns the new Channex id", async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { data: { id: "new-id", type: "x", attributes: {} } }));

    const result = await client[method](CREDENTIALS, body);

    const [url, request] = global.fetch.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`${endpoint}$`));
    expect(request).toMatchObject({ method: "POST", headers: { "user-api-key": "test-api-key" } });
    expect(JSON.parse(request.body)).toEqual(body);
    expect(result).toEqual({ success: true, externalId: "new-id", outcomeUnknown: false });
  });

  test("refuses without an API key and calls nothing", async () => {
    const result = await client[method]({}, body);

    expect(result).toMatchObject({ success: false, errorCode: "MISSING_API_KEY", outcomeUnknown: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // A 4xx means Channex refused it: nothing was created, so trying again after a fix is safe.
  test("a validation error is a known failure with Channex's field messages", async () => {
    const details = { title: ["can't be blank"] };
    global.fetch.mockResolvedValue(
      jsonResponse(422, { errors: { code: "validation_error", title: "Validation Error", details } })
    );

    const result = await client[method](CREDENTIALS, body);

    expect(result).toMatchObject({
      success: false,
      outcomeUnknown: false,
      errorCode: "validation_error",
      validationDetails: details,
    });
  });

  // 429 means Channex was too busy; nothing was created or refused, so it can be retried.
  test("a 429 is a known, retryable failure", async () => {
    global.fetch.mockResolvedValue(jsonResponse(429, {}));

    expect(await client[method](CREDENTIALS, body)).toMatchObject({
      success: false,
      outcomeUnknown: false,
      retryable: true,
    });
  });

  test("a 5xx leaves the outcome unknown", async () => {
    global.fetch.mockResolvedValue(jsonResponse(502, {}));

    expect(await client[method](CREDENTIALS, body)).toMatchObject({ success: false, outcomeUnknown: true });
  });

  test("a timeout leaves the outcome unknown", async () => {
    global.fetch = hangingFetch();

    const result = await client[method](CREDENTIALS, body, { requestTimeoutMs: 5 });

    expect(result).toMatchObject({ success: false, outcomeUnknown: true, errorCode: "CHANNEX_CREATE_TIMEOUT" });
  });

  test("a success without an id leaves the outcome unknown", async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { data: {} }));

    expect(await client[method](CREDENTIALS, body)).toMatchObject({ success: false, outcomeUnknown: true });
  });
});
