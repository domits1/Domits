import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";

const PROPERTIES = [
  { id: "listing-of-host", hostId: "host-1" },
  { id: "second-listing-of-host", hostId: "host-1" },
  { id: "listing-of-other-host", hostId: "host-2" },
];
const ACTIVE_MEMBERSHIPS = [{ member_user_id: "cohost-1", host_id: "host-1" }];
const USERS_BY_TOKEN = {
  "host-token": "host-1",
  "other-host-token": "host-2",
  "cohost-token": "cohost-1",
  "host-without-listings-token": "host-3",
};

const expiredLogin = () => Object.assign(new Error("Access Token has expired"), { name: "NotAuthorizedException" });

const findProperty = (id) => PROPERTIES.find((property) => property.id === id) ?? null;

const findPropertyIdsByHostId = (hostId) => {
  const ids = PROPERTIES.filter((property) => property.hostId === hostId).map((property) => property.id);
  if (ids.length < 1) {
    throw new NotFoundException("No property found.");
  }
  return ids;
};

const recordingRepository = (reads, implementations = {}) =>
  new Proxy(implementations, {
    get:
      (target, method) =>
      async (...args) => {
        reads.push([method, ...args]);
        return method in target ? target[method](...args) : [];
      },
  });

const buildController = () => {
  const listingReads = [];
  const controller = new PropertyController();
  const { authManager, propertyService } = controller;

  authManager.cognitoRepository = {
    getUserByAccessToken: jest.fn(async (token) => {
      const username = USERS_BY_TOKEN[token];
      if (!username) {
        throw expiredLogin();
      }
      return { Username: username, UserAttributes: [{ Name: "custom:group", Value: "Host" }] };
    }),
  };
  authManager.propertyRepository = { getPropertyById: jest.fn(async (id) => findProperty(id)) };
  authManager.teamMemberRepository = {
    findActiveMembershipByMemberAndHost: jest.fn(
      async (memberUserId, hostId) =>
        ACTIVE_MEMBERSHIPS.find(
          (membership) => membership.member_user_id === memberUserId && membership.host_id === hostId
        ) ?? null
    ),
  };

  for (const key of Object.keys(propertyService).filter((name) => name.endsWith("Repository"))) {
    propertyService[key] = recordingRepository(listingReads);
  }
  propertyService.propertyRepository = recordingRepository(listingReads, {
    getPropertyById: findProperty,
    getPropertiesByHostId: findPropertyIdsByHostId,
  });

  return { controller, listingReads };
};

const respond = async (response) => ({ statusCode: response.statusCode, body: JSON.parse(response.body) });

describe("GET /property/hostDashboard/single", () => {
  const singleEvent = (token, property) => ({
    httpMethod: "GET",
    headers: token ? { Authorization: token } : {},
    queryStringParameters: property === undefined ? null : { property },
  });

  let controller;
  let listingReads;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    ({ controller, listingReads } = buildController());
  });

  const readSingle = async (token, property) =>
    respond(await controller.getFullOwnedPropertyById(singleEvent(token, property)));

  it("returns the host's own listing", async () => {
    const { statusCode, body } = await readSingle("host-token", "listing-of-host");

    expect(statusCode).toBe(200);
    expect(body.property).toEqual({ id: "listing-of-host", hostId: "host-1" });
  });

  it("returns a listing to an active co-host of its host", async () => {
    const { statusCode, body } = await readSingle("cohost-token", "listing-of-host");

    expect(statusCode).toBe(200);
    expect(body.property).toEqual({ id: "listing-of-host", hostId: "host-1" });
  });

  it("answers 403 for a listing of another host without reading it", async () => {
    const { statusCode, body } = await readSingle("other-host-token", "listing-of-host");

    expect(statusCode).toBe(403);
    expect(body).toBe("You must be the owner or an active co-host of the property to access it.");
    expect(listingReads).toEqual([]);
  });

  it("answers 403 to a co-host for a listing of a host they do not work for", async () => {
    const { statusCode } = await readSingle("cohost-token", "listing-of-other-host");

    expect(statusCode).toBe(403);
    expect(listingReads).toEqual([]);
  });

  it("answers 401 without a login, before any read", async () => {
    const { statusCode } = await readSingle(undefined, "listing-of-host");

    expect(statusCode).toBe(401);
    expect(listingReads).toEqual([]);
  });

  it("answers 404 for a listing that does not exist", async () => {
    const { statusCode, body } = await readSingle("host-token", "missing-listing");

    expect(statusCode).toBe(404);
    expect(body).toBe("Property not found.");
    expect(listingReads).toEqual([]);
  });

  it.each([undefined, ""])("answers 400 when the listing id is missing (%p)", async (property) => {
    const { statusCode, body } = await readSingle("host-token", property);

    expect(statusCode).toBe(400);
    expect(body).toBe("property query parameter is required.");
    expect(controller.authManager.propertyRepository.getPropertyById).not.toHaveBeenCalled();
    expect(listingReads).toEqual([]);
  });
});
