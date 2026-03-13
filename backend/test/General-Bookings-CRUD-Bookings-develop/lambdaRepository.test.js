import { afterEach, describe, expect, it, jest } from "@jest/globals";
import LambdaRepository from "../../functions/General-Bookings-CRUD-Bookings-develop/data/lambdaRepository.js";
import NotFoundException from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/NotFoundException.js";

describe("LambdaRepository.getPropertiesFromHostId", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps property cards from an array response", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          property: { id: "property-1", title: "Test property" },
          propertyPricing: { roomRate: 250 },
          propertyLocation: { city: "Amsterdam", country: "Netherlands" },
        },
      ],
    });

    const repository = new LambdaRepository();

    await expect(repository.getPropertiesFromHostId("host-1")).resolves.toEqual([
      {
        id: "property-1",
        title: "Test property",
        rate: 250,
        city: "Amsterdam",
        country: "Netherlands",
      },
    ]);
  });

  it("accepts a wrapped properties payload", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        properties: [
          {
            property: { id: "property-2", title: "Wrapped property" },
            propertyPricing: { roomRate: 180 },
            propertyLocation: { city: "Rotterdam", country: "Netherlands" },
          },
        ],
      }),
    });

    const repository = new LambdaRepository();

    await expect(repository.getPropertiesFromHostId("host-2")).resolves.toEqual([
      {
        id: "property-2",
        title: "Wrapped property",
        rate: 180,
        city: "Rotterdam",
        country: "Netherlands",
      },
    ]);
  });

  it("throws NotFoundException when the endpoint responds with no properties", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => "No property found.",
    });

    const repository = new LambdaRepository();

    await expect(repository.getPropertiesFromHostId("host-3")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws NotFoundException on unexpected non-array payloads", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Internal server error" }),
    });

    const repository = new LambdaRepository();

    await expect(repository.getPropertiesFromHostId("host-4")).rejects.toBeInstanceOf(NotFoundException);
  });
});
