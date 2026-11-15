import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const CREATED_AT = 1700000000123;

const buildEvent = (queryStringParameters) => ({
  httpMethod: "GET",
  queryStringParameters: { country: "Netherlands", ...queryStringParameters },
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
