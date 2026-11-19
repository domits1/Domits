import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import responseHeaders from "../../functions/PropertyHandler/util/constant/responseHeader.json" with { type: "json" };
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";

const CREATED_AT = 1700000000123;

const buildEvent = (queryStringParameters) => ({
  httpMethod: "GET",
  queryStringParameters: { country: "Netherlands", ...queryStringParameters },
});

// The documented contract: a 400 on a request that carries a cursor means the cursor row is gone, and the client
// restarts from page 1. The body stays the bare message string, with no error code, header or object.
describe.each([
  ["getActivePropertiesCard", "getActivePropertyCards"],
  ["getActivePropertiesCardByCountry", "getActivePropertyCardsByCountry"],
])("PropertyController %s with a cursor whose row is gone", (controllerMethod, serviceMethod) => {
  it("answers 400 with the bare message string", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const controller = new PropertyController();
    controller.propertyService = {
      [serviceMethod]: jest.fn().mockRejectedValue(new TypeException("Unknown pagination cursor.")),
    };

    const response = await controller[controllerMethod](
      buildEvent({ lastEvaluatedKeyCreatedAt: String(CREATED_AT), lastEvaluatedKeyId: "deleted-property" })
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toBe("Unknown pagination cursor.");
    expect(response.headers).toEqual(responseHeaders);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});

describe("PropertyController getActivePropertiesCardByCountry cursor", () => {
  let controller;
  let getActivePropertyCardsByCountry;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getActivePropertyCardsByCountry = jest.fn().mockResolvedValue({ properties: [], lastEvaluatedKey: null });
    controller = new PropertyController();
    controller.propertyService = { getActivePropertyCardsByCountry };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes the numeric createdAt and the id to the service", async () => {
    await controller.getActivePropertiesCardByCountry(
      buildEvent({ lastEvaluatedKeyCreatedAt: String(CREATED_AT), lastEvaluatedKeyId: "property-12" })
    );

    expect(getActivePropertyCardsByCountry).toHaveBeenCalledWith("Netherlands", {
      createdAt: CREATED_AT,
      id: "property-12",
    });
  });

  it("leaves createdAt falsy when the first page sends no cursor", async () => {
    await controller.getActivePropertiesCardByCountry(buildEvent({}));

    const cursor = getActivePropertyCardsByCountry.mock.calls[0][1];
    expect(cursor.createdAt).toBeFalsy();
  });

  it("leaves createdAt falsy when the client sends the string null", async () => {
    await controller.getActivePropertiesCardByCountry(
      buildEvent({ lastEvaluatedKeyCreatedAt: "null", lastEvaluatedKeyId: "null" })
    );

    const cursor = getActivePropertyCardsByCountry.mock.calls[0][1];
    expect(cursor.createdAt).toBeFalsy();
  });
});
