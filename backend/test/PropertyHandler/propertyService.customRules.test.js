import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const buildService = (customRuleRepository) => {
  const service = new PropertyService();
  service.propertyCustomRuleRepository = customRuleRepository;
  return service;
};

// The table exists in every schema, so a database error is a real failure and must reach the caller.
const missingTableError = Object.assign(new Error('relation "property_custom_rules" does not exist'), {
  code: "42P01",
});

describe("PropertyService custom rules", () => {
  it("getCustomRules returns what the repository returns", async () => {
    const rules = [{ id: "rule-1", category: "Safety", rule_text: "No shoes inside", enabled: true }];
    const service = buildService({ getCustomRulesByPropertyId: jest.fn(async () => rules) });

    await expect(service.getCustomRules("property-1")).resolves.toBe(rules);
    expect(service.propertyCustomRuleRepository.getCustomRulesByPropertyId).toHaveBeenCalledWith("property-1");
  });

  it("updateCustomRules passes the rules to the repository and returns the saved rules", async () => {
    const saved = [{ id: "rule-1", category: "Safety", rule_text: "No shoes inside", enabled: true }];
    const service = buildService({ replaceCustomRulesByPropertyId: jest.fn(async () => saved) });
    const customRules = [{ category: "Safety", rule_text: "No shoes inside", enabled: true }];

    await expect(service.updateCustomRules("property-1", customRules)).resolves.toBe(saved);
    expect(service.propertyCustomRuleRepository.replaceCustomRulesByPropertyId).toHaveBeenCalledWith(
      "property-1",
      customRules
    );
  });

  it("getCustomRules lets a database error through, including a missing table, instead of returning []", async () => {
    const service = buildService({ getCustomRulesByPropertyId: jest.fn(async () => Promise.reject(missingTableError)) });

    await expect(service.getCustomRules("property-1")).rejects.toBe(missingTableError);
  });

  it("updateCustomRules lets a database error through, including a missing table, instead of reporting success", async () => {
    const service = buildService({
      replaceCustomRulesByPropertyId: jest.fn(async () => Promise.reject(missingTableError)),
    });

    await expect(service.updateCustomRules("property-1", [])).rejects.toBe(missingTableError);
  });
});
