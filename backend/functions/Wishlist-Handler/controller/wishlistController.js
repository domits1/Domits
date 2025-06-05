// wishlistController.js
import { WishlistService } from "../business/wishlistService.js";
import { getUserIdFromAccessToken } from "../util/wishlistUtil.js";
import responseHeaders from "../util/responseHeaders.json" assert { type: "json" };

export class WishlistController {
    wishlistService;

    constructor() {
        this.wishlistService = new WishlistService();
    }

    // POST /wishlist
    async create(event) {
        try {
            const token = event.headers.Authorization;
            const userId = await getUserIdFromAccessToken(token);
            const body = JSON.parse(event.body);

            if (body.action === "getWishlist") {
                return await this.read(event);
            }

            const result = await this.wishlistService.addToWishlist(userId, body);
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(result)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /wishlist
    async read(event) {
        try {
            const token = event.headers.Authorization;
            const userId = await getUserIdFromAccessToken(token);
            const body = event.body ? JSON.parse(event.body) : {};

            const result = body.wishlistName
                ? await this.wishlistService.getWishlist(userId, body.wishlistName)
                : await this.wishlistService.getAllWishlists(userId);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(result)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // DELETE /wishlist
    async remove(event) {
        try {
            const token = event.headers.Authorization;
            const userId = await getUserIdFromAccessToken(token);
            const body = JSON.parse(event.body);

            const result = (body.propertyId && body.wishlistName)
                ? await this.wishlistService.removeFromWishlist(userId, body)
                : await this.wishlistService.deleteEntireWishlist(userId, body.wishlistName);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(result)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PUT /wishlist
    async addList(event) {
        try {
            const token = event.headers.Authorization;
            const userId = await getUserIdFromAccessToken(token);
            const body = JSON.parse(event.body);

            const result = await this.wishlistService.createWishlist(userId, body.wishlistName);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(result)
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PATCH /wishlist
    async update(event) {
        try {
            const token = event.headers.Authorization;
            const userId = await getUserIdFromAccessToken(token);
            const body = JSON.parse(event.body);

            const result = (body.propertyId && body.oldName && body.newName)
                ? await this.wishlistService.moveAccommodationToAnotherList(userId, body)
                : await this.wishlistService.renameWishlist(userId, body);

            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify(result)
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
            body: JSON.stringify(error.message || "Something went wrong")
        };
    }
}
