const ChannexProviderClient = require("../.shared/channelManagement/providers/channex/providerClient.js").default;

const originalFetch = global.fetch;
const CREDENTIALS = { apiKey: "test-api-key" };

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const availabilityGroup = (overrides = {}) => ({
  externalPropertyId: "ext-property-1",
  externalRoomTypeId: "ext-room-1",
  values: [{ date: "2026-06-01", availability: 1 }],
  ...overrides,
});

const restrictionGroup = (overrides = {}) => ({
  externalPropertyId: "ext-property-1",
  externalRoomTypeId: "ext-room-1",
  externalRatePlanId: "ext-rate-1",
  values: [{ date: "2026-06-01", rate: "123.00" }],
  ...overrides,
});

const PUSH_METHODS = [
  {
    method: "pushAvailability",
    call: (client, groups, options) => client.pushAvailability(CREDENTIALS, groups, options),
    callWithoutKey: (client, groups) => client.pushAvailability({}, groups),
    group: availabilityGroup,
    endpoint: "/api/v1/availability",
    url: "https://staging.channex.io/api/v1/availability",
    fallbackStatus: "AVAILABILITY_PUSH_FAILED",
    errorCodePrefix: "CHANNEX_AVAILABILITY_PUSH",
    missingValuesCode: "CHANNEX_AVAILABILITY_VALUES_MISSING",
  },
  {
    method: "pushRestrictions",
    call: (client, groups, options) => client.pushRestrictions(CREDENTIALS, groups, options),
    callWithoutKey: (client, groups) => client.pushRestrictions({}, groups),
    group: restrictionGroup,
    endpoint: "/api/v1/restrictions",
    url: "https://staging.channex.io/api/v1/restrictions",
    fallbackStatus: "RESTRICTIONS_PUSH_FAILED",
    errorCodePrefix: "CHANNEX_RESTRICTIONS_PUSH",
    missingValuesCode: "CHANNEX_RESTRICTIONS_VALUES_MISSING",
  },
];

describe("ChannexProviderClient ARI push", () => {
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("missing apiKey short-circuits before any request", () => {
    it.each(PUSH_METHODS)(
      "$method returns one INVALID_CREDENTIALS result per group without calling fetch",
      async ({ callWithoutKey, group, endpoint }) => {
        const groups = [group(), group({ externalRoomTypeId: "ext-room-2" })];

        const result = await callWithoutKey(client, groups);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.results).toHaveLength(2);
        result.results.forEach((entry) => {
          expect(entry).toMatchObject({
            success: false,
            providerStatus: "INVALID_CREDENTIALS",
            errorCode: "MISSING_API_KEY",
            httpStatus: null,
            endpoint,
            method: "POST",
          });
        });
      }
    );
  });

  describe("groups with no values never reach the provider", () => {
    it.each(PUSH_METHODS)(
      "$method reports INVALID_REQUEST for an empty values array",
      async ({ call, group, missingValuesCode }) => {
        const result = await call(client, [group({ values: [] })]);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.results[0]).toMatchObject({
          success: false,
          providerStatus: "INVALID_REQUEST",
          errorCode: missingValuesCode,
          httpStatus: null,
        });
      }
    );

    test("an empty group does not stop the remaining groups in the same batch", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }] }));

      const result = await client.pushAvailability(CREDENTIALS, [
        availabilityGroup({ values: [] }),
        availabilityGroup({ externalRoomTypeId: "ext-room-2" }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].providerStatus).toBe("INVALID_REQUEST");
      expect(result.results[1].providerStatus).toBe("SYNCED");
    });
  });

  describe("successful pushes", () => {
    it.each(PUSH_METHODS)(
      "$method posts each group to $endpoint with the api key header",
      async ({ call, group, url }) => {
        global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }] }));
        const pushed = group();

        await call(client, [pushed]);

        const [requestUrl, init] = global.fetch.mock.calls[0];
        expect(requestUrl.toString()).toBe(url);
        expect(init.method).toBe("POST");
        expect(init.headers).toMatchObject({
          "user-api-key": "test-api-key",
          "Content-Type": "application/json",
        });
        expect(JSON.parse(init.body)).toEqual({ values: pushed.values });
      }
    );

    it.each(PUSH_METHODS)("$method reports SYNCED with the first returned task id", async ({ call, group }) => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }, { id: "task-2" }] }));

      const result = await call(client, [group()]);

      expect(result.success).toBe(true);
      expect(result.results[0]).toMatchObject({
        success: true,
        providerStatus: "SYNCED",
        taskId: "task-1",
        httpStatus: 200,
        warnings: [],
        errorCode: null,
      });
    });

    // A 2xx response carrying meta.warnings is still reported as success:false, because
    // buildProviderPushSuccessResult derives success from warnings.length === 0 rather than
    // from the HTTP status. Pinning it so the behaviour is not mistaken for a bug later.
    it.each(PUSH_METHODS)(
      "$method reports ACCEPTED_WITH_WARNINGS and success false when Channex returns warnings",
      async ({ call, group }) => {
        global.fetch.mockResolvedValue(
          jsonResponse(200, { data: [{ id: "task-1" }], meta: { warnings: ["rate plan is closed"] } })
        );

        const result = await call(client, [group()]);

        expect(result.success).toBe(false);
        expect(result.results[0]).toMatchObject({
          success: false,
          providerStatus: "ACCEPTED_WITH_WARNINGS",
          warnings: ["rate plan is closed"],
          errorMessage: "Channex accepted the request with warnings.",
        });
      }
    );
  });

  describe("non-2xx responses map to push-specific provider statuses", () => {
    it.each(
      PUSH_METHODS.flatMap(({ method, call, group, fallbackStatus, errorCodePrefix }) => [
        { method, call, group, status: 500, expectedStatus: fallbackStatus, errorCodePrefix },
        { method, call, group, status: 401, expectedStatus: "UNAUTHORIZED", errorCodePrefix },
        { method, call, group, status: 429, expectedStatus: "RATE_LIMITED", errorCodePrefix },
      ])
    )(
      "$method with status $status reports $expectedStatus",
      async ({ call, group, status, expectedStatus, errorCodePrefix }) => {
        global.fetch.mockResolvedValue(jsonResponse(status, {}));

        const result = await call(client, [group()]);

        expect(result.success).toBe(false);
        expect(result.results[0]).toMatchObject({
          success: false,
          providerStatus: expectedStatus,
          httpStatus: status,
          errorCode: `${errorCodePrefix}_${status}`,
        });
      }
    );

    test("a Channex-provided error code takes priority over the fallback template", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(422, { errors: { code: "RATE_PLAN_CLOSED", title: "Rate plan is closed." } })
      );

      const result = await client.pushRestrictions(CREDENTIALS, [restrictionGroup()]);

      expect(result.results[0]).toMatchObject({
        errorCode: "RATE_PLAN_CLOSED",
        errorMessage: "Rate plan is closed.",
      });
    });
  });

  describe("stopOnFailure controls how much of the batch is attempted", () => {
    const threeGroups = () => [
      availabilityGroup({ externalRoomTypeId: "ext-room-1" }),
      availabilityGroup({ externalRoomTypeId: "ext-room-2" }),
      availabilityGroup({ externalRoomTypeId: "ext-room-3" }),
    ];

    test("stops after the first failed group when enabled", async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-1" }] }))
        .mockResolvedValueOnce(jsonResponse(500, {}))
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-3" }] }));

      const result = await client.pushAvailability(CREDENTIALS, threeGroups(), { stopOnFailure: true });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].providerStatus).toBe("AVAILABILITY_PUSH_FAILED");
    });

    test("attempts every group when disabled", async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-1" }] }))
        .mockResolvedValueOnce(jsonResponse(500, {}))
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-3" }] }));

      const result = await client.pushAvailability(CREDENTIALS, threeGroups());

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(3);
      expect(result.success).toBe(false);
    });

    // The failed-response and thrown-request paths each carry their own stopOnFailure break,
    // so a thrown request has to be exercised separately from the non-2xx case above.
    test("stops after the first thrown request when enabled", async () => {
      global.fetch
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-1" }] }))
        .mockRejectedValueOnce(new Error("socket hang up"))
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "task-3" }] }));

      const result = await client.pushAvailability(CREDENTIALS, threeGroups(), { stopOnFailure: true });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[1]).toMatchObject({
        success: false,
        providerStatus: "AVAILABILITY_PUSH_FAILED",
        httpStatus: null,
        errorMessage: "socket hang up",
      });
    });

    // stopOnFailure is only checked after a request actually fails or throws; the empty-values
    // branch continues unconditionally, so an unusable group never halts the batch.
    test("an empty group does not halt the batch even when stopOnFailure is enabled", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-2" }] }));

      const result = await client.pushAvailability(
        CREDENTIALS,
        [availabilityGroup({ values: [] }), availabilityGroup({ externalRoomTypeId: "ext-room-2" })],
        { stopOnFailure: true }
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[1].providerStatus).toBe("SYNCED");
    });
  });

  describe("request failures and timeouts", () => {
    it.each(PUSH_METHODS)(
      "$method reports $fallbackStatus when the request throws",
      async ({ call, group, fallbackStatus }) => {
        global.fetch.mockRejectedValue(new Error("socket hang up"));

        const result = await call(client, [group()]);

        expect(result.results[0]).toMatchObject({
          success: false,
          providerStatus: fallbackStatus,
          httpStatus: null,
          errorMessage: "socket hang up",
        });
      }
    );

    test("a 401 thrown as an exception does not get the UNAUTHORIZED mapping", async () => {
      global.fetch.mockRejectedValue(new Error("unauthorized"));

      const result = await client.pushAvailability(CREDENTIALS, [availabilityGroup()]);

      expect(result.results[0].providerStatus).toBe("AVAILABILITY_PUSH_FAILED");
    });

    test("does not attach an abort signal when no timeout is configured", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }] }));

      await client.pushAvailability(CREDENTIALS, [availabilityGroup()]);

      expect(global.fetch.mock.calls[0][1].signal).toBeUndefined();
    });

    // A real 1 ms timer is used rather than fake timers: the abort has to propagate through the
    // fetch rejection and back into the catch that inspects controller.signal.aborted.
    test("maps an aborted request to the push timeout code", async () => {
      global.fetch.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("The operation was aborted")));
          })
      );

      const result = await client.pushAvailability(CREDENTIALS, [availabilityGroup()], { requestTimeoutMs: 1 });

      expect(global.fetch.mock.calls[0][1].signal).toBeDefined();
      expect(result.results[0]).toMatchObject({
        success: false,
        providerStatus: "AVAILABILITY_PUSH_FAILED",
        errorCode: "CHANNEX_PUSH_REQUEST_TIMEOUT",
        errorMessage: "Channex push request timed out after 1 ms.",
      });
    });
  });

  // results.every(...) is vacuously true on an empty results array, so a batch that pushed
  // nothing still reports overall success. Pinned because a caller reading only `success`
  // cannot tell "everything synced" apart from "there was nothing to sync".
  describe("an empty batch reports success without pushing anything", () => {
    it.each([
      { description: "an empty array", groups: [] },
      { description: "undefined", groups: undefined },
      { description: "a non-array value", groups: "not-a-batch" },
    ])("$description yields success true with no results", async ({ groups }) => {
      const result = await client.pushAvailability(CREDENTIALS, groups);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, results: [] });
    });
  });

  describe("group identity differs between the two push endpoints", () => {
    test("pushRestrictions carries the rate plan identity", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }] }));

      const result = await client.pushRestrictions(CREDENTIALS, [restrictionGroup()]);

      expect(result.results[0]).toMatchObject({
        externalPropertyId: "ext-property-1",
        externalRoomTypeId: "ext-room-1",
        externalRatePlanId: "ext-rate-1",
      });
    });

    test("pushAvailability omits the rate plan identity", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: "task-1" }] }));

      const result = await client.pushAvailability(CREDENTIALS, [
        availabilityGroup({ externalRatePlanId: "ext-rate-1" }),
      ]);

      expect(result.results[0]).not.toHaveProperty("externalRatePlanId");
    });
  });
});
