const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");

// Channex list endpoints answer 10 records unless asked for more,
// and 100 is the most per page. Look-before-create (design note D2) reads these lists to find an
// object an earlier attempt already made; a list cut off at page one makes it create a duplicate.
const LISTS = [
  {
    method: "listProperties",
    call: (c, options) => c.listProperties(CREDENTIALS, options),
    rows: "properties",
    id: "externalPropertyId",
  },
  {
    method: "listRoomTypes",
    call: (c, options) => c.listRoomTypes(CREDENTIALS, "property-1", options),
    rows: "roomTypes",
    id: "externalRoomTypeId",
  },
  {
    method: "listRatePlans",
    call: (c, options) => c.listRatePlans(CREDENTIALS, "room-type-1", options),
    rows: "ratePlans",
    id: "externalRatePlanId",
  },
];

// A fetch that never answers until its signal aborts, like a Channex that hangs.
const hangUntilAborted = (_url, { signal } = {}) =>
  new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted"))));

const rowsWithIds = (from, count) =>
  Array.from({ length: count }, (_value, index) => ({ id: `row-${from + index}`, attributes: { title: "Title" } }));

const pageOf = (url) => Number(new URL(String(url)).searchParams.get("pagination[page]"));

// Answers each page from a list of pages; a page number past the list is an empty page.
const serve = (pages, total) => {
  global.fetch.mockImplementation(async (url) =>
    jsonResponse(200, { data: pages[pageOf(url) - 1] ?? [], meta: { total, limit: 100, page: pageOf(url) } })
  );
};

describe.each(LISTS)("ChannexProviderClient.$method pagination", ({ call, rows, id }) => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("asks for 100 records per page, starting at page 1", async () => {
    serve([rowsWithIds(1, 3)], 3);

    await call(client);

    const parsed = new URL(String(global.fetch.mock.calls[0][0]));
    expect(parsed.searchParams.get("pagination[limit]")).toBe("100");
    expect(parsed.searchParams.get("pagination[page]")).toBe("1");
  });

  test("reads every page until it has meta.total records, so a record past the first page is found", async () => {
    serve([rowsWithIds(1, 100), rowsWithIds(101, 1)], 101);

    const result = await call(client);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result[rows]).toHaveLength(101);
    expect(result[rows][100][id]).toBe("row-101");
  });

  test("without meta.total it stops at the first page that is not full", async () => {
    global.fetch.mockImplementation(async (url) =>
      jsonResponse(200, { data: pageOf(url) === 1 ? rowsWithIds(1, 100) : rowsWithIds(101, 4) })
    );

    const result = await call(client);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result[rows]).toHaveLength(104);
  });

  // A partial list would look like "not there yet" and make look-before-create create a duplicate.
  test("a later page that fails makes the whole list fail instead of returning part of it", async () => {
    global.fetch.mockImplementation(async (url) =>
      pageOf(url) === 1 ? jsonResponse(200, { data: rowsWithIds(1, 100), meta: { total: 150 } }) : jsonResponse(500, {})
    );

    const result = await call(client);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result[rows]).toEqual([]);
  });

  // A meta.total that never stops growing must not keep a Lambda paging until its timeout.
  test("stops after a fixed number of pages and fails rather than paging forever", async () => {
    global.fetch.mockImplementation(async () => jsonResponse(200, { data: rowsWithIds(1, 100), meta: { total: 1e9 } }));

    const result = await call(client);

    expect(result.success).toBe(false);
    expect(result.errorCode).toMatch(/TOO_MANY_PAGES$/);
    expect(global.fetch.mock.calls.length).toBeLessThanOrEqual(20);
  });
});

// A turn-on runs three lists and three creates inside API Gateway's 29 s, so a list that hangs must end
// as "try again" instead of holding the host's request until the gateway cuts it off with a 504.
describe.each(LISTS)("ChannexProviderClient.$method timeout", ({ call, rows }) => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("a page that hangs ends the list as a timeout", async () => {
    global.fetch.mockImplementation(hangUntilAborted);

    const result = await call(client, { requestTimeoutMs: 5 });

    expect(result).toMatchObject({ success: false, errorCode: "CHANNEX_LIST_TIMEOUT", [rows]: [] });
  });

  // One deadline for the whole list, so twenty slow pages cannot add up past the gateway's limit.
  test("the deadline covers all pages together, not each page on its own", async () => {
    global.fetch.mockImplementation((url, init) =>
      pageOf(url) === 1
        ? Promise.resolve(jsonResponse(200, { data: rowsWithIds(1, 100), meta: { total: 200 } }))
        : hangUntilAborted(url, init)
    );

    const result = await call(client, { requestTimeoutMs: 5 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ success: false, errorCode: "CHANNEX_LIST_TIMEOUT" });
  });

  test("without an explicit timeout the request still carries a deadline", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

    await call(client);

    expect(global.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
