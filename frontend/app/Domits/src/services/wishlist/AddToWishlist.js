import RetrieveAccessToken from "../../features/auth/RetrieveAccessToken";

const WISHLIST_API_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";
const DEFAULT_WISHLIST_NAME = "My next trip";

async function AddToWishlist(propertyId, wishlistName = DEFAULT_WISHLIST_NAME) {
  try {
    const response = await fetch(WISHLIST_API_URL, {
      method: "POST",
      headers: {
        Authorization: await RetrieveAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId, wishlistName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add property '${propertyId}' to wishlist '${wishlistName}'.`);
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default AddToWishlist;
