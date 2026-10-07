import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";

const PROPERTY_ID = "property-1";
const UUID = "11111111-1111-4111-8111-111111111111";

// Keep these two tables identical to src/tests/settings/registrationNumberUtils.test.js in the web app.
const PLACEHOLDER_CASES = [
  `AUTO-${UUID}`,
  `auto-${UUID}`,
  `Auto-${UUID.toUpperCase()}`,
  `  AUTO-${UUID}  `,
];
const REAL_NUMBER_CASES = ["Auto-1234", "AUTO-123", "AUTO-", `AUTO-${UUID}-extra`, `NL-AUTO-${UUID}`, "NL-1234"];

describe("PropertyService.updateRegistrationNumber", () => {
  let service;
  let repository;

  beforeEach(() => {
    service = new PropertyService({}, {});
    repository = {
      getPropertyById: jest.fn().mockResolvedValue({ id: PROPERTY_ID }),
      isRegistrationNumberUsedByAnotherProperty: jest.fn().mockResolvedValue(false),
      updateRegistrationNumber: jest.fn(),
    };
    repository.updateRegistrationNumber.mockImplementation(async (_id, registrationNumber) => ({
      id: PROPERTY_ID,
      registrationNumber,
    }));
    service.propertyRepository = repository;
  });

  it("stores the trimmed value and returns it as the saved value", async () => {
    const result = await service.updateRegistrationNumber(PROPERTY_ID, "  NL-1234  ");

    expect(repository.updateRegistrationNumber).toHaveBeenCalledWith(PROPERTY_ID, "NL-1234");
    expect(result).toEqual({ propertyId: PROPERTY_ID, registrationNumber: "NL-1234" });
  });

  it.each([
    ["a non-string value", 1234],
    ["a missing value", undefined],
    ["an empty string", ""],
    ["whitespace only", "   "],
    ...PLACEHOLDER_CASES.map((value) => [`the generated placeholder "${value}"`, value]),
  ])("rejects %s with a 400 and never touches the database", async (_label, value) => {
    await expect(service.updateRegistrationNumber(PROPERTY_ID, value)).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.getPropertyById).not.toHaveBeenCalled();
    expect(repository.updateRegistrationNumber).not.toHaveBeenCalled();
  });

  it.each(REAL_NUMBER_CASES)("accepts and stores the real number %j", async (value) => {
    await expect(service.updateRegistrationNumber(PROPERTY_ID, value)).resolves.toEqual({
      propertyId: PROPERTY_ID,
      registrationNumber: value,
    });
  });

  it("rejects values longer than 255 characters but accepts exactly 255", async () => {
    await expect(service.updateRegistrationNumber(PROPERTY_ID, "a".repeat(256))).rejects.toBeInstanceOf(TypeException);
    await expect(service.updateRegistrationNumber(PROPERTY_ID, "a".repeat(255))).resolves.toEqual({
      propertyId: PROPERTY_ID,
      registrationNumber: "a".repeat(255),
    });
  });

  it("throws NotFoundException when the property does not exist", async () => {
    repository.getPropertyById.mockResolvedValue(null);

    await expect(service.updateRegistrationNumber(PROPERTY_ID, "NL-1234")).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateRegistrationNumber).not.toHaveBeenCalled();
  });

  it("pre-check: throws a 409 ConflictException without updating when another listing has the number", async () => {
    repository.isRegistrationNumberUsedByAnotherProperty.mockResolvedValue(true);

    await expect(service.updateRegistrationNumber(PROPERTY_ID, "NL-1234")).rejects.toMatchObject({
      statusCode: 409,
      message: "This registration number is already used by another listing.",
    });
    expect(repository.isRegistrationNumberUsedByAnotherProperty).toHaveBeenCalledWith("NL-1234", PROPERTY_ID);
    expect(repository.updateRegistrationNumber).not.toHaveBeenCalled();
  });

  it("lets a ConflictException from the repository backstop bubble up unchanged", async () => {
    const backstopError = new ConflictException("This registration number is already used by another listing.");
    repository.updateRegistrationNumber.mockRejectedValue(backstopError);

    await expect(service.updateRegistrationNumber(PROPERTY_ID, "NL-1234")).rejects.toBe(backstopError);
  });
});
