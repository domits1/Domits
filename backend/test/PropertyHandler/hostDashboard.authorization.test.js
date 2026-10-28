import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const OWNER_ID = "owner-1";
const PROPERTY = { id: "property-1", hostId: OWNER_ID };

const buildController = ({ username = OWNER_ID, membership = null, baseProperty = PROPERTY, validToken = true } = {}) => {
  const authManager = new AuthManager();
  authManager.cognitoRepository = {
    getUserByAccessToken: jest.fn(async () => {
      if (!validToken) {
        throw new Error("invalid token");
      }
      return { Username: username };
    }),
  };
  authManager.teamMemberRepository = { findActiveMembershipByMemberAndHost: jest.fn(async () => membership) };
  const controller = new PropertyController();
  controller.authManager = authManager;
  controller.propertyService = {
    getBasePropertyInfo: jest.fn(async () => baseProperty),
    getFullPropertyByIdAsHost: jest.fn(async () => ({ property: PROPERTY })),
    getFullPropertiesByHostId: jest.fn(async () => [{ property: PROPERTY }]),
  };
  return controller;
};

const buildEvent = (queryStringParameters) => ({ headers: { Authorization: "token" }, queryStringParameters });

const ALLOWED_CALLERS = [
  ["the owner", { username: OWNER_ID }],
  ["an active team member", { username: "member-1", membership: { status: "active" } }],
];

describe("GET /property/hostDashboard/single authorization", () => {
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 for an invalid token without loading the property", async () => {
    const controller = buildController({ validToken: false });

    const response = await controller.getFullOwnedPropertyById(buildEvent({ property: "property-1" }));

    expect(response.statusCode).toBe(401);
    expect(controller.propertyService.getBasePropertyInfo).not.toHaveBeenCalled();
  });

  it("returns 404 when the property does not exist", async () => {
    const controller = buildController({ baseProperty: null });

    const response = await controller.getFullOwnedPropertyById(buildEvent({ property: "missing" }));

    expect(response.statusCode).toBe(404);
    expect(controller.propertyService.getFullPropertyByIdAsHost).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 403 and logs the caller for someone who is neither owner nor active member", async () => {
    const controller = buildController({ username: "intruder" });

    const response = await controller.getFullOwnedPropertyById(buildEvent({ property: "property-1" }));

    expect(response.statusCode).toBe(403);
    expect(controller.propertyService.getFullPropertyByIdAsHost).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('hostDashboard/single forbidden caller=intruder target="property-1"');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(ALLOWED_CALLERS)("returns 200 with the full property for %s", async (_label, options) => {
    const controller = buildController(options);

    const response = await controller.getFullOwnedPropertyById(buildEvent({ property: "property-1" }));

    expect(response.statusCode).toBe(200);
    expect(controller.propertyService.getFullPropertyByIdAsHost).toHaveBeenCalledWith("property-1");
    expect(controller.authManager.cognitoRepository.getUserByAccessToken).toHaveBeenCalledTimes(1);
  });
});

describe("GET /property/hostDashboard/byHostId authorization", () => {
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 for an invalid token", async () => {
    const controller = buildController({ validToken: false });

    const response = await controller.getFullOwnedPropertiesByHostId(buildEvent({ hostId: OWNER_ID }));

    expect(response.statusCode).toBe(401);
    expect(controller.propertyService.getFullPropertiesByHostId).not.toHaveBeenCalled();
  });

  it("returns 400 when hostId is missing", async () => {
    const controller = buildController();

    const response = await controller.getFullOwnedPropertiesByHostId(buildEvent({}));

    expect(response.statusCode).toBe(400);
    expect(controller.propertyService.getFullPropertiesByHostId).not.toHaveBeenCalled();
  });

  it("returns 403 and logs the caller when asking for another host's properties", async () => {
    const controller = buildController({ username: "intruder" });

    const response = await controller.getFullOwnedPropertiesByHostId(buildEvent({ hostId: OWNER_ID }));

    expect(response.statusCode).toBe(403);
    expect(controller.propertyService.getFullPropertiesByHostId).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('hostDashboard/byHostId forbidden caller=intruder target="owner-1"');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(ALLOWED_CALLERS)("returns 200 with the host's properties for %s", async (_label, options) => {
    const controller = buildController(options);

    const response = await controller.getFullOwnedPropertiesByHostId(buildEvent({ hostId: OWNER_ID }));

    expect(response.statusCode).toBe(200);
    expect(controller.propertyService.getFullPropertiesByHostId).toHaveBeenCalledWith(OWNER_ID);
    expect(controller.authManager.cognitoRepository.getUserByAccessToken).toHaveBeenCalledTimes(1);
  });
});
