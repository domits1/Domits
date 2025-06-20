import { handler } from "../../functions/Wishlist-Handler/index.js";
import { describe, it, expect, afterEach } from "@jest/globals";
import { WishlistController } from "../../functions/Wishlist-Handler/controller/wishlistController.js";

describe("Wishlist routing unit tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle a POST request to add to wishlist", async () => {
    jest.spyOn(WishlistController.prototype, "create").mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: "Accommodation added to wishlist" }),
    });

    const event = {
      httpMethod: "POST",
      resource: "/wishlist",
      headers: { Authorization: "dummy-token" },
      body: JSON.stringify({ propertyId: "123", wishlistName: "Favorites" }),
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it("should handle a GET request for all wishlists", async () => {
    jest.spyOn(WishlistController.prototype, "read").mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify([{ wishlistName: "My next trip" }]),
    });

    const event = {
      httpMethod: "GET",
      resource: "/wishlist",
      headers: { Authorization: "dummy-token" },
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it("should handle a DELETE request to remove an item", async () => {
    jest.spyOn(WishlistController.prototype, "remove").mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: "Item removed from wishlist" }),
    });

    const event = {
      httpMethod: "DELETE",
      resource: "/wishlist",
      headers: { Authorization: "dummy-token" },
      body: JSON.stringify({ propertyId: "123", wishlistName: "Favorites" }),
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it("should handle a PUT request to create a wishlist", async () => {
    jest.spyOn(WishlistController.prototype, "addList").mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: "Wishlist created." }),
    });

    const event = {
      httpMethod: "PUT",
      resource: "/wishlist",
      headers: { Authorization: "dummy-token" },
      body: JSON.stringify({ wishlistName: "Nieuw lijstje" }),
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it("should handle a PATCH request to rename a wishlist", async () => {
    jest.spyOn(WishlistController.prototype, "update").mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: "Wishlist renamed." }),
    });

    const event = {
      httpMethod: "PATCH",
      resource: "/wishlist",
      headers: { Authorization: "dummy-token" },
      body: JSON.stringify({ oldName: "Oud", newName: "Nieuw" }),
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it("should return 404 for an unknown HTTP method", async () => {
    const event = {
      httpMethod: "OPTIONS",
      resource: "/wishlist",
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Method not found.");
  });

  it("should return 404 for an unknown resource", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/wishlist/invalidpath",
      headers: { Authorization: "dummy-token" },
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Path not found.");
  });
});
