import { WishlistController } from "./controller/wishlistController.js";

let controller = new WishlistController();

export const handler = async (event) => {
  if (!controller) {
    controller = new WishlistController();
  }

  try {
    return await (async () => {
      const { httpMethod, resource } = event;

      if (resource === "/wishlist") {
        switch (httpMethod) {
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
              statusCode: 404,
              body: "Method not found." 
            };
        }
      }

      return {
        statusCode: 404,
        body: "Path not found."
      };
    })();
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Something went wrong, please contact support."
    };
  }
};
