import { getAccessToken } from "../utils/authUtils";

const BASE_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";

// Fetch user's wishlists (GET)
export const fetchWishlists = async () => {
  const token = getAccessToken();
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wishlists");
  }

  return res.json();
};

// Move accommodation to a different wishlist (PATCH)
export const moveAccommodation = async (oldName, newName, propertyId) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
    body: JSON.stringify({ oldName, newName, propertyId }),
  });

  if (!res.ok) {
    throw new Error("Failed to move accommodation");
  }

  return res.json();
};

// Add or remove accommodation from a wishlist (POST / DELETE)
export const updateWishlistItem = async (propertyId, method, wishlistName = "My next trip") => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
    body: JSON.stringify({
      propertyId,
      wishlistName,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to ${method === "POST" ? "add to" : "remove from"} wishlist`);
  }

  return res.json();
};

// Check if a property is in any wishlist
export const isPropertyInAnyWishlist = async (propertyId) => {
  const data = await fetchWishlists();
  const allWishlists = data.wishlists || {};
  const likedIds = Object.values(allWishlists).flat();
  return likedIds.includes(propertyId);
};

// Fetch real item count for a specific wishlist (POST)
export const fetchWishlistItemCount = async (wishlistName) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "getWishlist",
      wishlistName,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get item count for wishlist '${wishlistName}'`);
  }

  return res.json();
};

// Create a new wishlist (PUT)
export const createWishlist = async (wishlistName) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw new Error("Failed to create wishlist");
  }

  return res.json();
};

// Rename a wishlist (PATCH)
export const renameWishlist = async (oldName, newName) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ oldName, newName }),
  });

  if (!res.ok) {
    throw new Error("Failed to rename wishlist");
  }

  return res.json();
};

// Delete a wishlist (DELETE)
export const deleteWishlist = async (wishlistName) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "DELETE",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw new Error("Failed to delete wishlist");
  }

  return res.json();
};
