import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const MENU = {
  continents: [
    {
      name: "Europe",
      path: "/destinations/europe",
      activeListings: 1,
      countries: [{ name: "Spain", path: "/destinations/europe/spain", activeListings: 1, cities: [] }],
    },
  ],
};

const buildController = (buildDestinationMenu) => {
  const controller = new PropertyController();
  controller.destinationTreeService = { buildDestinationMenu };
  return controller;
};

describe("GET /property/destinations/menu", () => {
  it("answers the menu as cacheable JSON", async () => {
    const response = await buildController(jest.fn(async () => MENU)).getDestinationMenu({});

    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    });
    expect(JSON.parse(response.body)).toEqual(MENU);
  });

  it("answers 500 with a plain message when the menu cannot be built, and never a half menu", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const response = await buildController(
      jest.fn(async () => {
        throw new Error("connection refused");
      })
    ).getDestinationMenu({});

    expect(response.statusCode).toBe(500);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.parse(response.body)).toEqual({ message: "Destinations are not available right now." });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
