import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { DestinationTreeService } from "../../functions/PropertyHandler/business/service/destinationTreeService.js";
import { readDestinationSettings } from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

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

const row = (path, type, parentId, name, activeListings = 0) => ({
  id: path,
  type,
  parentId,
  slug: path.split("/").pop(),
  path,
  name,
  countryCode: null,
  activeListings,
});

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
    expect(response.body).not.toContain("connection refused");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("builds the menu from the same eligible destinations as the pages, and lets a repository failure through", async () => {
    const repository = {
      listDestinationsWithActiveListings: jest.fn(async () => [
        row("/destinations/europe", "continent", null, "Europe"),
        row("/destinations/europe/spain", "country", "/destinations/europe", "Spain", 1),
        row("/destinations/asia", "continent", null, "Asia"),
      ]),
    };
    const service = new DestinationTreeService({
      destinationPageRepository: repository,
      settings: readDestinationSettings({}),
    });

    expect(await service.buildDestinationMenu()).toEqual(MENU);

    repository.listDestinationsWithActiveListings.mockRejectedValueOnce(new Error("timeout"));
    await expect(service.buildDestinationMenu()).rejects.toThrow("timeout");
  });
});
