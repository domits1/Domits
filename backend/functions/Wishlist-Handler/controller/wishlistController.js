import { WishlistService } from "../business/service/wishlistService.js";
import AuthManager from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.js";
import { TypeException } from "../util/exception/TypeException.js";
import { Unauthorized } from "../util/exception/Unauthorized.js";

export class WishlistController {
  wishlistService;
  authManager;

  constructor() {
    this.wishlistService = new WishlistService();
    this.authManager = new AuthManager();
  }

  // POST /wishlist
  async create(event) {
    try {
      const guestId = await this.getGuestIdFromEvent(event);
      const body = this.parseBody(event);

      if (body.action === "getWishlist") {
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: body.wishlistName
            ? JSON.stringify({
                items: await this.wishlistService.getWishlist({
                  guestId,
                  wishlistName: body.wishlistName,
                }),
              })
            : JSON.stringify({
                wishlists: await this.wishlistService.getAllWishlists(guestId),
              }),
        };
      }

      const result = await this.wishlistService.addToWishlist({
        guestId,
        propertyId: body.propertyId,
        wishlistName: body.wishlistName,
      });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ item: result }),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // GET /wishlist
  async read(event) {
    try {
      const guestId = await this.getGuestIdFromEvent(event);
      const body = this.parseBody(event);
      const wishlistName = body.wishlistName ?? event?.queryStringParameters?.wishlistName;

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: wishlistName
          ? JSON.stringify({
              items: await this.wishlistService.getWishlist({ guestId, wishlistName }),
            })
          : JSON.stringify({
              wishlists: await this.wishlistService.getAllWishlists(guestId),
            }),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // DELETE /wishlist
  async remove(event) {
    try {
      const guestId = await this.getGuestIdFromEvent(event);
      const body = this.parseBody(event);
      if (!body.wishlistName) {
        throw new TypeException("wishlistName is required.");
      }

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
        body: JSON.stringify(
          body.propertyId && body.wishlistName ? { removed: true } : result
        ),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PUT /wishlist
  async addList(event) {
    try {
      const guestId = await this.getGuestIdFromEvent(event);
      const body = this.parseBody(event);

      const result = await this.wishlistService.createWishlist({
        guestId,
        wishlistName: body.wishlistName,
      });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ wishlistName: body.wishlistName, item: result }),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PATCH /wishlist
  async update(event) {
    try {
      const guestId = await this.getGuestIdFromEvent(event);
      const body = this.parseBody(event);

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

  parseBody(event) {
    if (!event?.body) return {};

    if (typeof event.body === "object") {
      return event.body;
    }

    try {
      return JSON.parse(event.body);
    } catch (error) {
      throw new TypeException("Request body must be valid JSON.", { cause: error });
    }
  }

  getAccessTokenFromEvent(event) {
    const authorization = event?.headers?.Authorization ?? event?.headers?.authorization;
    if (!authorization) {
      throw new Unauthorized("Missing Authorization header.");
    }

    return authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : authorization;
  }

  async getGuestIdFromEvent(event) {
    const accessToken = this.getAccessTokenFromEvent(event);
    const attributes = await this.authManager.authenticateUser(accessToken);

    if (!attributes?.sub) {
      throw new Unauthorized("User id could not be resolved from access token.");
    }

    return attributes.sub;
  }
}
