import { getAccessToken } from "../../../../services/getAccessToken";
import {
  OwnerApiError,
  archiveOwner,
  createOwner,
  getOwner,
  listOwners,
  setShares,
  updateOwner,
} from "./ownerService";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const BASE_URL = "https://owners.example.test/default/property-owners";
const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const TOKEN = "access-token";
const ORIGINAL_ENV = process.env;

const jsonResponse = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(async () => payload),
});

const unreadableResponse = (status) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(async () => {
    throw new SyntaxError("Unexpected end of JSON input");
  }),
});

const lastRequest = () => {
  const [url, options] = global.fetch.mock.calls[0];
  return { url, options };
};

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, REACT_APP_PROPERTY_OWNERS_API_URL: BASE_URL };
  getAccessToken.mockReturnValue(TOKEN);
  global.fetch = jest.fn(async () => jsonResponse(200, { ok: true }));
});

afterEach(() => {
  delete global.fetch;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("routes", () => {
  test("listOwners sends GET to the base URL with only the raw token", async () => {
    const owners = [{ id: OWNER_ID }];
    global.fetch.mockResolvedValueOnce(jsonResponse(200, owners));

    await expect(listOwners()).resolves.toEqual(owners);

    const { url, options } = lastRequest();
    expect(url).toBe(BASE_URL);
    expect(options).toEqual({ method: "GET", headers: { Authorization: TOKEN } });
  });

  test("getOwner sends GET with the id", async () => {
    await getOwner(OWNER_ID);

    const { url, options } = lastRequest();
    expect(url).toBe(`${BASE_URL}?id=${OWNER_ID}`);
    expect(options).toEqual({ method: "GET", headers: { Authorization: TOKEN } });
  });

  test("createOwner sends POST with the JSON body", async () => {
    const body = { first_name: "Anna", last_name: "de Vries", email: "anna@example.com", owner_type: "individual" };

    await createOwner(body);

    const { url, options } = lastRequest();
    expect(url).toBe(BASE_URL);
    expect(options).toEqual({
      method: "POST",
      headers: { Authorization: TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  test("updateOwner sends PATCH with the id and only the changes, keeping null values", async () => {
    await updateOwner(OWNER_ID, { phone: null, status: "inactive" });

    const { url, options } = lastRequest();
    expect(url).toBe(`${BASE_URL}?id=${OWNER_ID}`);
    expect(options).toEqual({
      method: "PATCH",
      headers: { Authorization: TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: null, status: "inactive" }),
    });
  });

  test("archiveOwner sends PATCH with action and id and no body", async () => {
    await archiveOwner(OWNER_ID);

    const { url, options } = lastRequest();
    expect(url).toBe(`${BASE_URL}?action=archive&id=${OWNER_ID}`);
    expect(options).toEqual({ method: "PATCH", headers: { Authorization: TOKEN } });
  });

  test("setShares sends PUT with action set-shares and exactly the three body fields", async () => {
    const shares = [{ owner_id: OWNER_ID, ownership_basis_points: 10000 }];

    await setShares({ property_id: "property-1", effective_from: 1793491200000, shares, host_id: "host-2" });

    const { url, options } = lastRequest();
    expect(url).toBe(`${BASE_URL}?action=set-shares`);
    expect(options.method).toBe("PUT");
    expect(options.headers).toEqual({ Authorization: TOKEN, "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toStrictEqual({
      property_id: "property-1",
      effective_from: 1793491200000,
      shares,
    });
  });

  test("returns the parsed response of a successful write", async () => {
    const saved = { id: OWNER_ID, status: "archived", properties: [] };
    global.fetch.mockResolvedValueOnce(jsonResponse(200, saved));

    await expect(archiveOwner(OWNER_ID)).resolves.toEqual(saved);
  });
});

describe("query values", () => {
  test("encodes the id and trims surrounding spaces", async () => {
    await getOwner(" a b&c=d/e ");

    expect(lastRequest().url).toBe(`${BASE_URL}?id=a%20b%26c%3Dd%2Fe`);
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
    ["blank", "   "],
    ["a number", 42],
  ])("rejects an id that is %s without calling fetch", async (_label, id) => {
    await expect(getOwner(id)).rejects.toThrow("An owner id is required.");
    await expect(updateOwner(id, { status: "active" })).rejects.toThrow("An owner id is required.");
    await expect(archiveOwner(id)).rejects.toThrow("An owner id is required.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("setShares without an argument returns a rejected promise instead of throwing synchronously", async () => {
    let result;
    expect(() => {
      result = setShares();
    }).not.toThrow();

    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toBeInstanceOf(TypeError);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("errors", () => {
  test("throws an OwnerApiError with the status and the server message", async () => {
    const message = "The ownership of this property already changed today. Choose tomorrow or later.";
    global.fetch.mockResolvedValueOnce(jsonResponse(409, { message }));

    const failure = setShares({ property_id: "property-1", effective_from: 1793491200000, shares: [] });

    await expect(failure).rejects.toBeInstanceOf(OwnerApiError);
    await expect(failure).rejects.toMatchObject({ status: 409, serverMessage: message, message });
  });

  test.each([
    ["no JSON body", unreadableResponse(502)],
    ["a body without a message", jsonResponse(500, { error: "boom" })],
    ["a message that is not a string", jsonResponse(400, { message: 42 })],
  ])("falls back to a status message when the error response has %s", async (_label, response) => {
    global.fetch.mockResolvedValueOnce(response);

    await expect(listOwners()).rejects.toMatchObject({
      status: response.status,
      serverMessage: null,
      message: `The property owners request failed with status ${response.status}.`,
    });
  });

  test("throws when a successful response cannot be read", async () => {
    global.fetch.mockResolvedValueOnce(unreadableResponse(200));

    await expect(listOwners()).rejects.toMatchObject({
      status: 200,
      message: "The property owners service returned an unreadable response.",
    });
  });

  test("passes a network failure on unchanged", async () => {
    const networkError = new TypeError("Failed to fetch");
    global.fetch.mockRejectedValueOnce(networkError);

    await expect(listOwners()).rejects.toBe(networkError);
  });

  test.each([null, undefined, ""])("refuses to call the API without an access token (%p)", async (token) => {
    getAccessToken.mockReturnValue(token);

    await expect(listOwners()).rejects.toThrow("We could not read your sign-in. Please sign in again.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects with the configuration error when the API URL is missing", async () => {
    delete process.env.REACT_APP_PROPERTY_OWNERS_API_URL;

    await expect(listOwners()).rejects.toThrow(/REACT_APP_PROPERTY_OWNERS_API_URL is not set/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
