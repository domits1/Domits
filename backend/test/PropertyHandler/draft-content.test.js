import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import fc from "fast-check";
import { handler } from "../../functions/PropertyHandler/index.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { PropertyDraftRepository } from "../../functions/PropertyHandler/data/repository/propertyDraftRepository.js";
import { ALLOWED_PROPERTY_TYPES } from "../../functions/PropertyHandler/util/constant/propertyTypes.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

// -------------------------
// Repository: PropertyDraftRepository.updateDraftContent
// -------------------------
describe("PropertyDraftRepository.updateDraftContent", () => {
  let query;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    Database.getInstance.mockResolvedValue({ query, options: { schema: "main" } });
  });

  it("only SETs columns present in the input", async () => {
    const repo = new PropertyDraftRepository({});
    await repo.updateDraftContent("prop-1", { name: "Lakeside Cabin", addressLine: "1 Lake Rd" });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("name = $2");
    expect(sql).toContain("address_line = $3");
    expect(sql).not.toContain("property_type");
    expect(sql).not.toContain("capacity");
    expect(params).toEqual(["prop-1", "Lakeside Cabin", "1 Lake Rd", expect.any(Number)]);
  });

  it("always bumps last_activity_at even for a single-field update", async () => {
    const repo = new PropertyDraftRepository({});
    const before = Date.now();
    await repo.updateDraftContent("prop-1", { propertyType: "Villa" });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("last_activity_at = $3");
    expect(params[0]).toBe("prop-1");
    expect(params[1]).toBe("Villa");
    expect(params[2]).toBeGreaterThanOrEqual(before);
  });

  it("includes every supplied field in a full update", async () => {
    const repo = new PropertyDraftRepository({});
    await repo.updateDraftContent("prop-1", {
      name: "Lakeside Cabin",
      addressLine: "1 Lake Rd",
      propertyType: "Cottage",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
    });

    const [sql, params] = query.mock.calls[0];
    ["name", "address_line", "property_type", "capacity", "bedrooms", "bathrooms", "last_activity_at"].forEach(
      (column) => expect(sql).toContain(column)
    );
    expect(params).toEqual([
      "prop-1",
      "Lakeside Cabin",
      "1 Lake Rd",
      "Cottage",
      4,
      2,
      1,
      expect.any(Number),
    ]);
  });
});

// -------------------------
// Service: PropertyService.validateDraftContent / getDraft / updateDraft
// -------------------------
describe("PropertyService draft content validation", () => {
  let service;

  beforeEach(() => {
    service = new PropertyService();
    service.propertyDraftRepository = {
      getDraftById: jest.fn(),
      updateDraftContent: jest.fn(),
    };
  });

  it("rejects a missing name", () => {
    expect(() => service.validateDraftContent({ addressLine: "1 Lake Rd" })).toThrow("Draft name is required.");
  });

  it("rejects a blank name", () => {
    expect(() => service.validateDraftContent({ name: "   ", addressLine: "1 Lake Rd" })).toThrow(
      "Draft name is required."
    );
  });

  it("rejects a missing addressLine", () => {
    expect(() => service.validateDraftContent({ name: "Lakeside Cabin" })).toThrow("Draft addressLine is required.");
  });

  it.each(["capacity", "bedrooms", "bathrooms"])("rejects %s <= 0 when present", (field) => {
    expect(() =>
      service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd", [field]: 0 })
    ).toThrow(`Draft ${field} must be a number greater than 0.`);
  });

  it.each(["capacity", "bedrooms", "bathrooms"])("rejects a non-numeric %s when present", (field) => {
    expect(() =>
      service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd", [field]: "many" })
    ).toThrow(`Draft ${field} must be a number greater than 0.`);
  });

  it("rejects a propertyType outside the allow-list", () => {
    expect(() =>
      service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd", propertyType: "Castle" })
    ).toThrow(/Draft propertyType must be one of:/);
  });

  it.each(ALLOWED_PROPERTY_TYPES)("accepts %s as a propertyType", (propertyType) => {
    const result = service.validateDraftContent({
      name: "Lakeside Cabin",
      addressLine: "1 Lake Rd",
      propertyType,
    });
    expect(result.propertyType).toBe(propertyType);
  });

  it("accepts a partial PATCH body with only the required fields", () => {
    const result = service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd" });
    expect(result).toEqual({ name: "Lakeside Cabin", addressLine: "1 Lake Rd" });
  });

  it("trims name and addressLine", () => {
    const result = service.validateDraftContent({
      name: "  Lakeside Cabin  ",
      addressLine: "  1 Lake Rd  ",
    });
    expect(result.name).toBe("Lakeside Cabin");
    expect(result.addressLine).toBe("1 Lake Rd");
  });

  it.each(["capacity", "bedrooms", "bathrooms"])(
    "rejects a non-integer %s outright instead of truncating it",
    (field) => {
      expect(() =>
        service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd", [field]: 4.9 })
      ).toThrow(`Draft ${field} must be a number greater than 0.`);
    }
  );

  it.each(["capacity", "bedrooms", "bathrooms"])(
    "rejects a fractional %s between 0 and 1 that truncates to 0",
    (field) => {
      expect(() =>
        service.validateDraftContent({ name: "Lakeside Cabin", addressLine: "1 Lake Rd", [field]: 0.5 })
      ).toThrow(`Draft ${field} must be a number greater than 0.`);
    }
  );

  it("getDraft throws NotFoundException when the draft does not exist", async () => {
    service.propertyDraftRepository.getDraftById.mockResolvedValue(null);
    await expect(service.getDraft("missing-id")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getDraft maps the repository row to a camelCase response", async () => {
    service.propertyDraftRepository.getDraftById.mockResolvedValue({
      property_id: "prop-1",
      host_id: "host-1",
      created_at: "100",
      last_activity_at: "200",
      name: "Lakeside Cabin",
      address_line: "1 Lake Rd",
      property_type: "Cottage",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      status: "DRAFT",
    });

    const draft = await service.getDraft("prop-1");
    expect(draft).toEqual({
      propertyId: "prop-1",
      hostId: "host-1",
      createdAt: 100,
      lastActivityAt: 200,
      name: "Lakeside Cabin",
      addressLine: "1 Lake Rd",
      propertyType: "Cottage",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      status: "DRAFT",
    });
  });

  it("updateDraft throws NotFoundException when the draft does not exist", async () => {
    service.propertyDraftRepository.getDraftById.mockResolvedValue(null);
    await expect(
      service.updateDraft("missing-id", { name: "Lakeside Cabin", addressLine: "1 Lake Rd" })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(service.propertyDraftRepository.updateDraftContent).not.toHaveBeenCalled();
  });

  it("updateDraft validates before writing to the repository", async () => {
    service.propertyDraftRepository.getDraftById.mockResolvedValue({ property_id: "prop-1", host_id: "host-1" });
    await expect(service.updateDraft("prop-1", { addressLine: "1 Lake Rd" })).rejects.toThrow(
      "Draft name is required."
    );
    expect(service.propertyDraftRepository.updateDraftContent).not.toHaveBeenCalled();
  });

  it("updateDraft writes the validated fields to the repository", async () => {
    service.propertyDraftRepository.getDraftById.mockResolvedValue({ property_id: "prop-1", host_id: "host-1" });
    await service.updateDraft("prop-1", { name: " Lakeside Cabin ", addressLine: " 1 Lake Rd " });
    expect(service.propertyDraftRepository.updateDraftContent).toHaveBeenCalledWith("prop-1", {
      name: "Lakeside Cabin",
      addressLine: "1 Lake Rd",
    });
  });
});

// -------------------------
// Property-based: numeric field validation
// -------------------------
describe("PropertyService draft numeric field validation (property-based)", () => {
  const service = new PropertyService();
  const baseFields = { name: "Lakeside Cabin", addressLine: "1 Lake Rd" };

  it.each(["capacity", "bedrooms", "bathrooms"])("accepts any integer %s > 0", (field) => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (value) => {
        const result = service.validateDraftContent({ ...baseFields, [field]: value });
        return result[field] === value;
      })
    );
  });

  it.each(["capacity", "bedrooms", "bathrooms"])("rejects any integer %s <= 0", (field) => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 0 }), (value) => {
        expect(() => service.validateDraftContent({ ...baseFields, [field]: value })).toThrow(
          `Draft ${field} must be a number greater than 0.`
        );
      })
    );
  });
});

// -------------------------
// Controller: getDraft / updateDraft
// -------------------------
describe("PropertyController draft content endpoints", () => {
  const buildController = ({
    authorizeError = null,
    draft = { propertyId: "prop-1", name: "Lakeside Cabin" },
    getDraftError = null,
    updateDraftError = null,
  } = {}) => {
    const controller = new PropertyController();
    controller.authManager = {
      authorizeDraftOwnerRequest: authorizeError
        ? jest.fn().mockRejectedValue(authorizeError)
        : jest.fn().mockResolvedValue("host-1"),
    };
    controller.propertyService = {
      getDraft: getDraftError ? jest.fn().mockRejectedValue(getDraftError) : jest.fn().mockResolvedValue(draft),
      updateDraft: updateDraftError ? jest.fn().mockRejectedValue(updateDraftError) : jest.fn().mockResolvedValue(),
    };
    return controller;
  };

  const forbidden = () => Object.assign(new Error("You must be the owner of the property draft to access it."), {
    statusCode: 403,
  });
  const notFound = () => Object.assign(new Error("Property draft not found."), { statusCode: 404 });

  it("getDraft returns 200 with the draft body", async () => {
    const controller = buildController();
    const response = await controller.getDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ propertyId: "prop-1", name: "Lakeside Cabin" });
  });

  it("getDraft returns 400 when propertyId is missing from the path", async () => {
    const controller = buildController();
    const response = await controller.getDraft({ headers: { Authorization: "token" }, pathParameters: {} });
    expect(response.statusCode).toBe(400);
  });

  it("getDraft returns 403 when the caller is not the draft owner", async () => {
    const controller = buildController({ authorizeError: forbidden() });
    const response = await controller.getDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("getDraft returns 404 when the draft does not exist", async () => {
    const controller = buildController({ getDraftError: notFound() });
    const response = await controller.getDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("updateDraft returns 204 with no body on success", async () => {
    const controller = buildController();
    const response = await controller.updateDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
      body: JSON.stringify({ name: "Lakeside Cabin", addressLine: "1 Lake Rd" }),
    });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();
    expect(controller.propertyService.updateDraft).toHaveBeenCalledWith("prop-1", {
      name: "Lakeside Cabin",
      addressLine: "1 Lake Rd",
    });
  });

  it("updateDraft returns 400 when propertyId is missing from the path", async () => {
    const controller = buildController();
    const response = await controller.updateDraft({
      headers: { Authorization: "token" },
      pathParameters: {},
      body: "{}",
    });
    expect(response.statusCode).toBe(400);
  });

  it("updateDraft returns 400 when the service rejects the payload", async () => {
    const controller = buildController({
      updateDraftError: new Error("Draft name is required."),
    });
    const response = await controller.updateDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
      body: JSON.stringify({ addressLine: "1 Lake Rd" }),
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: "Draft name is required." });
  });

  it("updateDraft returns 403 when the caller is not the draft owner", async () => {
    const controller = buildController({ authorizeError: forbidden() });
    const response = await controller.updateDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
      body: "{}",
    });
    expect(response.statusCode).toBe(403);
  });

  it("updateDraft returns 404 when the draft does not exist", async () => {
    const controller = buildController({ updateDraftError: notFound() });
    const response = await controller.updateDraft({
      headers: { Authorization: "token" },
      pathParameters: { id: "prop-1" },
      body: "{}",
    });
    expect(response.statusCode).toBe(404);
  });
});

// -------------------------
// Routing: GET / PATCH /property/draft/{id}
// -------------------------
describe("Routing for /property/draft/{id}", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("routes GET /property/draft/{id} to controller.getDraft", async () => {
    jest.spyOn(PropertyController.prototype, "getDraft").mockResolvedValue({ statusCode: 200, body: "{}" });
    const response = await handler({
      httpMethod: "GET",
      resource: "/property/draft/{id}",
      pathParameters: { id: "prop-1" },
    });
    expect(response.statusCode).toBe(200);
    expect(PropertyController.prototype.getDraft).toHaveBeenCalled();
  });

  it("routes PATCH /property/draft/{id} to controller.updateDraft", async () => {
    jest.spyOn(PropertyController.prototype, "updateDraft").mockResolvedValue({ statusCode: 204 });
    const response = await handler({
      httpMethod: "PATCH",
      resource: "/property/draft/{id}",
      pathParameters: { id: "prop-1" },
      body: "{}",
    });
    expect(response.statusCode).toBe(204);
    expect(PropertyController.prototype.updateDraft).toHaveBeenCalled();
  });
});
