const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");

// Channex list endpoints answer 10 records unless asked for more,
// and 100 is the most per page. Look-before-create (design note D2) reads these lists to find an
// object an earlier attempt already made; a list cut off at page one makes it create a duplicate.
const LISTS = [
  { method: "listProperties", call: (c) => c.listProperties(CREDENTIALS), rows: "properties", id: "externalPropertyId" },
  {
    method: "listRoomTypes",
    call: (c) => c.listRoomTypes(CREDENTIALS, "property-1"),
    rows: "roomTypes",
    id: "externalRoomTypeId",
  },
  {
    method: "listRatePlans",
    call: (c) => c.listRatePlans(CREDENTIALS, "room-type-1"),
    rows: "ratePlans",
    id: "externalRatePlanId",
  },
];

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
