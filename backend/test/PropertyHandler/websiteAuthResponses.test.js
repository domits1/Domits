import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";

const PROPERTY_ID = "property-1";
const GENERIC_MESSAGE = "We could not complete this website request. Please try again.";

const withPropertyBody = (httpMethod, extra = {}) => ({
  httpMethod,
  headers: { Authorization: "token" },
  body: JSON.stringify({ propertyId: PROPERTY_ID, ...extra }),
});
const withPropertyQuery = () => ({
  httpMethod: "GET",
  headers: { Authorization: "token" },
  queryStringParameters: { property: PROPERTY_ID },
});
const withoutInput = () => ({ httpMethod: "GET", headers: { Authorization: "token" } });

const HANDLERS = {
  upsertWebsiteDraft: () => withPropertyBody("POST", { templateKey: "panorama" }),
  getWebsiteDrafts: withoutInput,
  getWebsiteDraftByPropertyId: withPropertyQuery,
  getWebsiteKpis: withoutInput,
  getWebsiteSiteByPropertyId: withPropertyQuery,
  publishWebsiteSite: () => withPropertyBody("POST"),
  unpublishWebsiteSite: () => withPropertyBody("POST"),
  deleteWebsiteDraft: () => withPropertyBody("DELETE"),
};
const OWNER_CHECKED = [
  "upsertWebsiteDraft",
  "getWebsiteDraftByPropertyId",
  "getWebsiteSiteByPropertyId",
  "publishWebsiteSite",
  "unpublishWebsiteSite",
  "deleteWebsiteDraft",
];

const buildController = ({ groupCheck, ownerCheck = () => Promise.resolve(undefined) }) => {
  const dataCalls = [];
  const recordingRepository = () =>
    new Proxy(
      {},
      {
        get:
          (_target, method) =>
          (...args) => {
            dataCalls.push(method);
            return Promise.resolve(null);
          },
      }
    );
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest: jest.fn(groupCheck),
    authorizeOwnerRequest: jest.fn(ownerCheck),
  };
  controller.directBookingWebsiteDraftRepository = recordingRepository();
  controller.directBookingWebsiteSiteRepository = recordingRepository();
  controller.directBookingWebsiteDomainRepository = recordingRepository();
  controller.directBookingWebsiteEventRepository = recordingRepository();
  return { controller, dataCalls };
};

const run = async (handler, setup) => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  const { controller, dataCalls } = buildController(setup);
  const response = await controller[handler](HANDLERS[handler]());
  return { response, body: JSON.parse(response.body), dataCalls, controller };
};

describe("authenticated website routes and failed authentication", () => {
  it.each(Object.keys(HANDLERS))("%s answers 401 for an expired login without touching data", async (handler) => {
    const { response, body, dataCalls } = await run(handler, {
      groupCheck: () => Promise.reject(new Unauthorized("You must be logged in.")),
    });

    expect(response.statusCode).toBe(401);
    expect(body).toEqual({ message: "You must be logged in." });
    expect(response.headers).toMatchObject({
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    expect(dataCalls).toEqual([]);
  });

  it.each(Object.keys(HANDLERS))("%s answers 403 when the user is not a host", async (handler) => {
    const { response, body, dataCalls } = await run(handler, {
      groupCheck: () => Promise.reject(new Forbidden("You must be a Host.")),
    });

    expect(response.statusCode).toBe(403);
    expect(body).toEqual({ message: "You must be a Host." });
    expect(dataCalls).toEqual([]);
  });

  it.each(OWNER_CHECKED)("%s answers 403 when the host does not own the listing", async (handler) => {
    const { response, body, dataCalls, controller } = await run(handler, {
      groupCheck: () => Promise.resolve("host-1"),
      ownerCheck: () => Promise.reject(new Forbidden("You must be the owner of the property to access it.")),
    });

    expect(controller.authManager.authorizeOwnerRequest).toHaveBeenCalledWith("token", PROPERTY_ID);
    expect(response.statusCode).toBe(403);
    expect(body).toEqual({ message: "You must be the owner of the property to access it." });
    expect(dataCalls).toEqual([]);
  });

  it.each(Object.keys(HANDLERS))("%s keeps the generic 500 for a server failure", async (handler) => {
    const { response, body } = await run(handler, {
      groupCheck: () => Promise.reject(new Error("connection reset")),
    });

    expect(response.statusCode).toBe(500);
    expect(body).toEqual({ message: GENERIC_MESSAGE });
  });

  it.each(Object.keys(HANDLERS))(
    "%s keeps the generic 500 for another error that only carries a 401 status",
    async (handler) => {
      const { response, body } = await run(handler, {
        groupCheck: () => Promise.reject(Object.assign(new Error("upstream rejected our call"), { statusCode: 401 })),
      });

      expect(response.statusCode).toBe(500);
      expect(body).toEqual({ message: GENERIC_MESSAGE });
    }
  );
});
