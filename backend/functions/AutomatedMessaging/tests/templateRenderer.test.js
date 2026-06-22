import { renderTemplate } from "../renderer/templateRenderer.js";

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
});
