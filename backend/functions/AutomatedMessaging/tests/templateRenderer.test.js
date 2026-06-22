import { renderTemplate, validateTemplate } from "../renderer/templateRenderer.js";

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
