import { renderTemplate, validateTemplate } from "../renderer/templateRenderer.js";
import { APPROVED_VARIABLES, SAFE_PREVIEW_VALUES } from "../util/constants.js";

const NEW_VARIABLES = ["checkInTime", "checkOutTime", "propertyAddress", "propertyCity", "numberOfGuests"];

describe("AutomatedMessaging approved variables", () => {
  test("are the four original ones plus the five new ones", () => {
    expect([...APPROVED_VARIABLES]).toEqual([
      "guestName",
      "propertyName",
      "checkInDate",
      "checkOutDate",
      ...NEW_VARIABLES,
    ]);
  });

  test.each(NEW_VARIABLES)("accepts {{%s}}, also with whitespace around it", (variable) => {
    expect(validateTemplate(`Hello {{${variable}}} and {{ ${variable} }}`).variables).toEqual([variable]);
  });

  test("has a preview value for every approved variable", () => {
    expect(Object.keys(SAFE_PREVIEW_VALUES).sort()).toEqual([...APPROVED_VARIABLES].sort());
    for (const variable of APPROVED_VARIABLES) {
      expect(String(SAFE_PREVIEW_VALUES[variable]).trim()).not.toBe("");
    }
  });

  test("renders a template that uses every approved variable", () => {
    const template = APPROVED_VARIABLES.map((variable) => `{{${variable}}}`).join("|");

    const { renderedContent, missingVariables } = renderTemplate(template, SAFE_PREVIEW_VALUES);

    expect(missingVariables).toEqual([]);
    expect(renderedContent).toBe(APPROVED_VARIABLES.map((variable) => SAFE_PREVIEW_VALUES[variable]).join("|"));
  });

  test("still rejects a variable that is not approved", () => {
    expect(() => validateTemplate("Hi {{checkInTime}} {{wifiPassword}}")).toThrow(
      expect.objectContaining({ details: expect.objectContaining({ unknownVariables: ["wifiPassword"] }) })
    );
  });
});

describe("AutomatedMessaging template renderer", () => {
  test("preview and delivery use the same renderer result", () => {
    const template = "Hi {{guestName}}, {{propertyName}} is booked from {{checkInDate}} to {{checkOutDate}}.";
    const values = {
      guestName: "Taylor",
      propertyName: "Canal Loft",
      checkInDate: "20 Jun 2026",
      checkOutDate: "23 Jun 2026",
    };

    const preview = renderTemplate(template, values, { missingPolicy: "marker" });
    const delivery = renderTemplate(template, values);
    expect(preview.renderedContent).toBe(delivery.renderedContent);
  });

  test("preview clearly marks an approved but missing value", () => {
    const result = renderTemplate("Hi {{guestName}} at {{propertyName}}", { guestName: "Taylor" }, {
      missingPolicy: "marker",
    });
    expect(result.missingVariables).toEqual(["propertyName"]);
    expect(result.renderedContent).toContain("[Missing: propertyName]");
  });

  test("supports approved variables surrounded by whitespace", () => {
    const result = renderTemplate("Hi {{ guestName }}", { guestName: "Taylor" });

    expect(result.renderedContent).toBe("Hi Taylor");
    expect(result.variables).toEqual(["guestName"]);
  });

  test("rejects unknown variables", () => {
    let thrown;
    try {
      validateTemplate("Hi {{paymentLink}}");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ statusCode: 400, details: { unknownVariables: ["paymentLink"] } });
  });

  test.each([
    "Hi {{guestName}",
    "Hi {{outer{{guestName}}}}",
    "Hi {{}}",
    "Hi guestName}}",
  ])("rejects malformed or nested braces in %s", (template) => {
    expect(() => validateTemplate(template)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  test("handles very long input in linear time", () => {
    const template = `${"x".repeat(250_000)}{{ guestName }}`;

    const result = renderTemplate(template, { guestName: "Taylor" });

    expect(result.renderedContent).toHaveLength(250_006);
    expect(result.renderedContent.endsWith("Taylor")).toBe(true);
  });
});
