import { WishlistController } from "./controller/wishlistController.js";
import responseHeaders from "./util/constant/responseHeader.js";

const controller = new WishlistController();

export const handler = async (event) => {
  try {
    return await (async () => {
      const { httpMethod, resource } = event;

      if (resource === "/wishlist" || resource === "/Wishlist") {
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
              headers: responseHeaders,
              body: JSON.stringify({ message: "Method not found." }),
            };
        }
      }

      return {
        statusCode: 404,
        headers: responseHeaders,
        body: JSON.stringify({ message: "Path not found." }),
      };
    })();
  } catch (error) {
    console.error(`Unhandled error in Wishlist handler: ${error}`);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Something went wrong, please contact support." }),
    };
  }
};
