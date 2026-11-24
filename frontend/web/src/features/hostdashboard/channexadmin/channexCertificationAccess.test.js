import { Auth } from "aws-amplify";
import { getChannexAdminAccess } from "../hostintegrations/channexApi";
import { CHANNEX_ACCESS_STATE, loadChannexAccessState } from "./channexCertificationAccess";

jest.mock("aws-amplify", () => ({ Auth: { currentAuthenticatedUser: jest.fn() } }));
jest.mock("../hostintegrations/channexApi", () => ({ getChannexAdminAccess: jest.fn() }));

const { ALLOWED, DENIED, ERROR } = CHANNEX_ACCESS_STATE;
const httpError = (status) => Object.assign(new Error(`failed with status ${status}`), { status });

describe("loadChannexAccessState", () => {
  let consoleError;

  beforeEach(() => {
    jest.resetAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "user-1" } });
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  test("is allowed for allowed: true and asks for the signed-in user's sub", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    expect(await loadChannexAccessState()).toBe(ALLOWED);
    expect(getChannexAdminAccess).toHaveBeenCalledWith({ userId: "user-1" });
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    ["allowed: false", () => getChannexAdminAccess.mockResolvedValue({ allowed: false })],
    ["a 401 answer", () => getChannexAdminAccess.mockRejectedValue(httpError(401))],
    ["a 403 answer", () => getChannexAdminAccess.mockRejectedValue(httpError(403))],
    ["a signed-out user", () => Auth.currentAuthenticatedUser.mockRejectedValue("The user is not authenticated")],
    ["a user without a sub", () => Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: {} })],
  ])("is denied for %s, without logging", async (_name, arrange) => {
    arrange();

    expect(await loadChannexAccessState()).toBe(DENIED);
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    ["a network failure", () => getChannexAdminAccess.mockRejectedValue(new Error("Network request failed"))],
    ["a 500 answer", () => getChannexAdminAccess.mockRejectedValue(httpError(500))],
    ["a 404 answer", () => getChannexAdminAccess.mockRejectedValue(httpError(404))],
    ["an empty answer", () => getChannexAdminAccess.mockResolvedValue(null)],
    ["a text answer", () => getChannexAdminAccess.mockResolvedValue("ok")],
    ["a non-boolean allowed", () => getChannexAdminAccess.mockResolvedValue({ allowed: "true" })],
  ])("is an error for %s, and logs the detail", async (_name, arrange) => {
    arrange();

    expect(await loadChannexAccessState()).toBe(ERROR);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
