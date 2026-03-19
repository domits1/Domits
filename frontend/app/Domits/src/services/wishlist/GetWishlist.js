import RetrieveAccessToken from "../../features/auth/RetrieveAccessToken";

const WISHLIST_API_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";
const DEFAULT_WISHLIST_NAME = "My next trip";

async function GetWishlist(wishlistName = DEFAULT_WISHLIST_NAME) {
    try {
        const response = await fetch(WISHLIST_API_URL, {
            method: "POST",
            headers: {
                Authorization: await RetrieveAccessToken(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "getWishlist",
                wishlistName,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch wishlist '${wishlistName}'.`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            return data;
        }

        return Array.isArray(data?.items) ? data.items : [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export default GetWishlist;
