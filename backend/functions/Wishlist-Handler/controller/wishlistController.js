import { WishlistService } from "../business/service/wishlistService.js";
import responseHeaders from "../util/constant/responseHeader.json";

export class WishlistController {
  wishlistService;

  constructor() {
    this.wishlistService = new WishlistService();
  }

  // POST /wishlist
  async create(event) {
    try {
      const token = event.headers.Authorization;
      const guestId = await getUserIdFromAccessToken(token);
      const body = JSON.parse(event.body);

      if (body.action === "getWishlist") {
        return await this.read(event);
      }

      const result = await this.wishlistService.addToWishlist({
        guestId,
        propertyId: body.propertyId,
        wishlistName: body.wishlistName,
      });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ message: "Accommodation added to wishlist", result }),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // GET /wishlist
  async read(event) {
    try {
      const token = event.headers.Authorization;
      const guestId = await getUserIdFromAccessToken(token);
      const body = event.body ? JSON.parse(event.body) : {};

      const result = body.wishlistName
        ? await this.wishlistService.getWishlist({ guestId, wishlistName: body.wishlistName })
        : await this.wishlistService.getAllWishlists(guestId);

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // DELETE /wishlist
  async remove(event) {
    try {
      const token = event.headers.Authorization;
      const guestId = await getUserIdFromAccessToken(token);
      const body = JSON.parse(event.body);

      const result =
        body.propertyId && body.wishlistName
          ? await this.wishlistService.removeFromWishlist({
              guestId,
              propertyId: body.propertyId,
              wishlistName: body.wishlistName,
            })
          : await this.wishlistService.deleteEntireWishlist({
              guestId,
              wishlistName: body.wishlistName,
            });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PUT /wishlist
  async addList(event) {
    try {
      const token = event.headers.Authorization;
      const guestId = await getUserIdFromAccessToken(token);
      const body = JSON.parse(event.body);

      const result = await this.wishlistService.createWishlist({
        guestId,
        wishlistName: body.wishlistName,
      });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ message: `Wishlist '${body.wishlistName}' created.`, result }),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PATCH /wishlist
  async update(event) {
    try {
      const token = event.headers.Authorization;
      const guestId = await getUserIdFromAccessToken(token);
      const body = JSON.parse(event.body);

      const result =
        body.propertyId && body.oldName && body.newName
          ? await this.wishlistService.moveAccommodation({
              guestId,
              oldName: body.oldName,
              newName: body.newName,
              propertyId: body.propertyId,
            })
          : await this.wishlistService.renameWishlist({
              guestId,
              oldName: body.oldName,
              newName: body.newName,
            });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(result),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    console.error("Controller error:", error);
    return {
      statusCode: error.statusCode || 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: error.message || "Something went wrong" }),
    };
  }
}
