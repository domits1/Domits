import { WishlistController } from "./controller/wishlistController.js";

let controller = new WishlistController();

export const handler = async (event) => {
  if (!controller) {
    controller = new WishlistController();
  }

  try {
    switch (event.httpMethod) {
      case "POST":
        return await controller.create(event);
      case "GET":
        return await controller.read(event);
      case "DELETE":
        return await controller.remove(event);
      case "PUT":
        return await controller.addList(event);
      case "PATCH":
        return await controller.update(event);
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: "Unsupported method" })
        };
    }
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Something went wrong", error: error.message })
    };
  }
};
