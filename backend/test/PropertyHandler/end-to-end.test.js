import { handler } from "../../functions/PropertyHandler/index.js";
import { describe, it, expect } from "@jest/globals";

describe("end-to-end tests", () => {

  it("should return 404, because no properties exist in test database.", async () => {
    const response = await handler({
      httpMethod: "GET",
      resource: "/property/bookingEngine/{subResource}",
      pathParameters: {
        subResource: "all",
      },
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toBe("No property found.");
  });

});