import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";

const buildEvent = (body, headers = { Authorization: "access-token" }) => ({
  httpMethod: "PATCH",
  path: "/property/registration",
  headers,
  body: JSON.stringify(body),
});

describe("PropertyController.updateRegistrationNumber", () => {
  let controller;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    controller = new PropertyController();
    controller.authManager = { authorizeOwnerRequest: jest.fn().mockResolvedValue("host-1") };
    controller.propertyService = { updateRegistrationNumber: jest.fn() };
  });

  it("returns 200 with the stored propertyId and registrationNumber", async () => {
    controller.propertyService.updateRegistrationNumber.mockResolvedValue({
      propertyId: "property-1",
      registrationNumber: "NL-1234",
    });

    const response = await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "property-1", registrationNumber: " NL-1234 " })
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ propertyId: "property-1", registrationNumber: "NL-1234" });
    expect(controller.authManager.authorizeOwnerRequest).toHaveBeenCalledWith("access-token", "property-1");
    expect(controller.propertyService.updateRegistrationNumber).toHaveBeenCalledWith("property-1", " NL-1234 ");
  });

  it("accepts the lowercase authorization header", async () => {
    controller.propertyService.updateRegistrationNumber.mockResolvedValue({ propertyId: "p", registrationNumber: "x" });

    await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "p", registrationNumber: "x" }, { authorization: "lower-token" })
    );

    expect(controller.authManager.authorizeOwnerRequest).toHaveBeenCalledWith("lower-token", "p");
  });

  it("returns 400 without authorizing when propertyId is missing", async () => {
    const response = await controller.updateRegistrationNumber(buildEvent({ registrationNumber: "NL-1234" }));

    expect(response.statusCode).toBe(400);
    expect(controller.authManager.authorizeOwnerRequest).not.toHaveBeenCalled();
    expect(controller.propertyService.updateRegistrationNumber).not.toHaveBeenCalled();
  });

  it("returns 403 and never updates when the caller does not own the property", async () => {
    controller.authManager.authorizeOwnerRequest.mockRejectedValue(
      new Forbidden("You must be the owner of the property to access it.")
    );

    const response = await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "property-1", registrationNumber: "NL-1234" })
    );

    expect(response.statusCode).toBe(403);
    expect(controller.propertyService.updateRegistrationNumber).not.toHaveBeenCalled();
  });

  it("returns 409 when the service reports a duplicate registration number", async () => {
    controller.propertyService.updateRegistrationNumber.mockRejectedValue(
      new ConflictException("This registration number is already used by another listing.")
    );

    const response = await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "property-1", registrationNumber: "NL-1234" })
    );

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).message).toBe("This registration number is already used by another listing.");
  });

  it("returns 400 when the service rejects the registration number", async () => {
    controller.propertyService.updateRegistrationNumber.mockRejectedValue(
      new TypeException("Registration number is required.")
    );

    const response = await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "property-1", registrationNumber: "" })
    );

    expect(response.statusCode).toBe(400);
  });

  it("returns 500 for unexpected errors", async () => {
    controller.propertyService.updateRegistrationNumber.mockRejectedValue(new Error("boom"));

    const response = await controller.updateRegistrationNumber(
      buildEvent({ propertyId: "property-1", registrationNumber: "NL-1234" })
    );

    expect(response.statusCode).toBe(500);
  });
});
